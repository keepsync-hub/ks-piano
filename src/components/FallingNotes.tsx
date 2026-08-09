import { useEffect, useLayoutEffect, useRef } from 'react'
import type { Song } from '../types'
import { buildKeyboardLayout } from '../piano/layout'
import './FallingNotes.css'

interface FallingNotesProps {
  song: Song | null
  time: number
  isWaitingForInput: boolean
}

const LOOKAHEAD_SECONDS = 3.5
const HAND_COLOR = {
  right: { fill: '#3fb6ff', edge: '#a6e2ff' },
  left: { fill: '#ff5fa8', edge: '#ffc0dd' },
}

export function FallingNotes({ song, time, isWaitingForInput }: FallingNotesProps) {
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
    ctx.clearRect(0, 0, w, h)

    // subtle background lane grid
    ctx.fillStyle = '#12141a'
    ctx.fillRect(0, 0, w, h)

    const whiteCount = layout.whiteKeyCount
    for (const key of layout.keys) {
      if (key.black) continue
      const x = (key.x / whiteCount) * w
      const width = (key.width / whiteCount) * w
      ctx.fillStyle = key.midi % 12 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.012)'
      ctx.fillRect(x, 0, width, h)
    }

    if (song) {
      for (const note of song.notes) {
        const noteEnd = note.time + note.duration
        if (noteEnd < time - 0.1 || note.time > time + LOOKAHEAD_SECONDS) continue

        const key = keyByMidi.get(note.midi)
        if (!key) continue

        const x = (key.x / whiteCount) * w + w * 0.001
        const width = (key.width / whiteCount) * w - w * 0.002

        const yBottom = h * (1 - (note.time - time) / LOOKAHEAD_SECONDS)
        const yTop = h * (1 - (noteEnd - time) / LOOKAHEAD_SECONDS)
        const barTop = Math.max(0, Math.min(yTop, yBottom))
        const barHeight = Math.max(4, Math.abs(yBottom - yTop))

        const colors = HAND_COLOR[note.hand]
        const isPast = note.time < time
        ctx.globalAlpha = isPast ? 0.35 : 1
        const grad = ctx.createLinearGradient(0, barTop, 0, barTop + barHeight)
        grad.addColorStop(0, colors.edge)
        grad.addColorStop(1, colors.fill)
        ctx.fillStyle = grad
        const r = Math.min(6 * dprRef.current, width / 2, barHeight / 2)
        roundRect(ctx, x, barTop, width, barHeight, r)
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }

    // hit line
    const hitY = h - 2
    ctx.strokeStyle = isWaitingForInput ? '#ffb84d' : 'rgba(255,255,255,0.25)'
    ctx.lineWidth = isWaitingForInput ? 3 * dprRef.current : 1.5 * dprRef.current
    ctx.beginPath()
    ctx.moveTo(0, hitY)
    ctx.lineTo(w, hitY)
    ctx.stroke()
  }, [song, time, isWaitingForInput, layout, keyByMidi])

  return (
    <div className="falling-notes-wrap">
      <canvas ref={canvasRef} className="falling-notes-canvas" />
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
