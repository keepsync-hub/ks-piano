import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { Song } from '../types'
import { buildKeyboardLayout } from '../piano/layout'
import { midiToLabel } from '../piano/noteNames'
import { HAND_COLORS, HIT_LINE, INPUT_COLOR, OCTAVE_LINE, REQUIRED_COLOR, STAGE_BG } from '../piano/theme'
import './FallingNotes.css'

interface FallingNotesProps {
  song: Song | null
  time: number
  isWaitingForInput: boolean
  heldNotes: Set<number>
  requiredNotes: Set<number>
  /** Score time of the required group, so only that occurrence is highlighted. */
  requiredTime?: number | null
  stats?: { notesPlayed: number; totalNotes: number; errors: number }
  /** How many seconds of upcoming music fill the stage; lower zooms in. */
  lookaheadSeconds?: number
  showMeasureLines?: boolean
}

const DEFAULT_LOOKAHEAD = 3.5
const LABEL_MIN_HEIGHT = 26
const LABEL_MIN_WIDTH = 15
const BEATS_PER_MEASURE = 4

export function FallingNotes({
  song,
  time,
  isWaitingForInput,
  heldNotes,
  requiredNotes,
  requiredTime,
  stats,
  lookaheadSeconds = DEFAULT_LOOKAHEAD,
  showMeasureLines = true,
}: FallingNotesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const layout = useRef(buildKeyboardLayout()).current
  const keyByMidi = useRef(new Map(layout.keys.map((k) => [k.midi, k]))).current
  const dprRef = useRef(1)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    function resize() {
      if (!canvas || !parent) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      dprRef.current = dpr
      canvas.width = parent.clientWidth * dpr
      canvas.height = parent.clientHeight * dpr
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(parent)
    return () => ro.disconnect()
  }, [])

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    const dpr = dprRef.current
    const whiteCount = layout.whiteKeyCount

    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = STAGE_BG
    ctx.fillRect(0, 0, w, h)

    // Octave separators, drawn at every C so the register is readable at a glance.
    ctx.strokeStyle = OCTAVE_LINE
    ctx.lineWidth = Math.max(1, dpr)
    for (const key of layout.keys) {
      if (key.black || key.midi % 12 !== 0) continue
      const x = Math.round((key.x / whiteCount) * w) + 0.5
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }

    // Horizontal beat/measure grid, so rhythm is readable against the falling notes.
    if (song && showMeasureLines) {
      const secondsPerBeat = 60 / song.bpm
      const firstBeat = Math.floor(time / secondsPerBeat)
      const lastBeat = Math.ceil((time + lookaheadSeconds) / secondsPerBeat)
      for (let beat = firstBeat; beat <= lastBeat; beat++) {
        if (beat < 0) continue
        const beatTime = beat * secondsPerBeat
        const y = h * (1 - (beatTime - time) / lookaheadSeconds)
        if (y < 0 || y > h) continue
        const isDownbeat = beat % BEATS_PER_MEASURE === 0
        ctx.strokeStyle = isDownbeat ? 'rgba(255, 255, 255, 0.26)' : 'rgba(255, 255, 255, 0.09)'
        ctx.lineWidth = (isDownbeat ? 1.6 : 1) * dpr
        ctx.beginPath()
        ctx.moveTo(0, Math.round(y) + 0.5)
        ctx.lineTo(w, Math.round(y) + 0.5)
        ctx.stroke()
      }
    }

    if (song) {
      const labelFont = `600 ${Math.round(12 * dpr)}px -apple-system, "Segoe UI", Roboto, sans-serif`
      for (const note of song.notes) {
        const noteEnd = note.time + note.duration
        if (noteEnd < time - 0.1 || note.time > time + lookaheadSeconds) continue

        const key = keyByMidi.get(note.midi)
        if (!key) continue

        const gap = Math.max(1.5 * dpr, w * 0.0012)
        const x = (key.x / whiteCount) * w + gap
        const width = (key.width / whiteCount) * w - gap * 2

        const yBottom = h * (1 - (note.time - time) / lookaheadSeconds)
        const yTop = h * (1 - (noteEnd - time) / lookaheadSeconds)
        const barTop = Math.max(0, Math.min(yTop, yBottom))
        const barHeight = Math.max(5 * dpr, Math.abs(yBottom - yTop))

        let palette = HAND_COLORS[note.hand]
        if (heldNotes.has(note.midi) && time >= note.time - 0.15 && time < noteEnd) palette = INPUT_COLOR
        else if (
          requiredTime != null &&
          requiredNotes.has(note.midi) &&
          Math.abs(note.time - requiredTime) < 0.05
        ) {
          palette = REQUIRED_COLOR
        }

        const isPast = noteEnd < time
        ctx.globalAlpha = isPast ? 0.3 : 1

        const radius = Math.min(5 * dpr, width / 2, barHeight / 2)
        const grad = ctx.createLinearGradient(x, 0, x + width, 0)
        grad.addColorStop(0, palette.light)
        grad.addColorStop(0.45, palette.base)
        grad.addColorStop(1, palette.dark)
        ctx.fillStyle = grad
        roundRect(ctx, x, barTop, width, barHeight, radius)
        ctx.fill()

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
        ctx.lineWidth = Math.max(1, dpr * 0.8)
        roundRect(ctx, x, barTop, width, barHeight, radius)
        ctx.stroke()

        // Label sits inside the on-screen part of the block, so notes that have
        // already scrolled past the hit line don't leave a floating label behind.
        const visibleTop = Math.max(0, barTop)
        const visibleBottom = Math.min(h, barTop + barHeight)
        const visibleHeight = visibleBottom - visibleTop
        if (visibleHeight > LABEL_MIN_HEIGHT * dpr && width > LABEL_MIN_WIDTH * dpr) {
          ctx.font = labelFont
          ctx.textAlign = 'center'
          ctx.textBaseline = 'alphabetic'
          ctx.fillStyle = '#ffffff'
          ctx.shadowColor = 'rgba(0, 0, 0, 0.55)'
          ctx.shadowBlur = 2 * dpr
          ctx.fillText(midiToLabel(note.midi), x + width / 2, visibleBottom - 7 * dpr)
          ctx.shadowBlur = 0
        }

        ctx.globalAlpha = 1
      }
    }

    // Hit line the notes land on.
    const hitY = h - Math.max(1, dpr * 1.5)
    ctx.strokeStyle = isWaitingForInput ? REQUIRED_COLOR.base : HIT_LINE
    ctx.lineWidth = (isWaitingForInput ? 3 : 2) * dpr
    ctx.beginPath()
    ctx.moveTo(0, hitY)
    ctx.lineTo(w, hitY)
    ctx.stroke()
  }, [
    song,
    time,
    isWaitingForInput,
    heldNotes,
    requiredNotes,
    requiredTime,
    lookaheadSeconds,
    showMeasureLines,
    layout,
    keyByMidi,
  ])

  const measureNumber = useMemo(() => {
    if (!song) return null
    const secondsPerMeasure = (60 / song.bpm) * BEATS_PER_MEASURE
    return Math.floor(time / secondsPerMeasure) + 1
  }, [song, time])

  return (
    <div className="falling-notes-wrap">
      <canvas ref={canvasRef} className="falling-notes-canvas" />
      {measureNumber !== null && <span className="stage-measure">{measureNumber}</span>}
      {song?.keySignature && <span className="stage-key">{song.keySignature}</span>}
      {stats && (
        <div className="stage-stats">
          <span>
            Notes: <b>{stats.notesPlayed} / {stats.totalNotes}</b>
          </span>
          <span>
            Errors: <b>{stats.errors}</b>
          </span>
        </div>
      )}
    </div>
  )
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}
