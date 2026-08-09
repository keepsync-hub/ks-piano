import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Accidental, Formatter, Renderer, Stave, StaveConnector, StaveNote, Voice } from 'vexflow'
import type { ScoreElement, ScoreLayout } from '../notation/buildScore'
import { buildScore, UNITS_PER_MEASURE } from '../notation/buildScore'
import type { NoteEvent, Song } from '../types'
import './SheetMusic.css'

interface SheetMusicProps {
  song: Song | null
  time: number
  heldNotes: Set<number>
  requiredNotes: Set<number>
  /** Score time of the required group, so only that occurrence is highlighted. */
  requiredTime?: number | null
}

/** How far from the playhead a note still counts as "the one being played now". */
const NEAR_PLAYHEAD_SECONDS = 0.4

const MEASURE_MIN_WIDTH = 140
const WIDTH_PER_ELEMENT = 32
const LEFT_MARGIN = 24
const RIGHT_PADDING = 30
const MIN_STAVE_HEIGHT = 150
const MAX_STAVE_HEIGHT = 320
// Tuned for the light "paper" background: saturated enough to read over black engraving.
const MEASURE_TINT = 'rgba(74, 144, 217, 0.16)'
const NOW_PLAYING_TINT = 'rgba(74, 144, 217, 0.45)'
const NOTE_TINTS = {
  input: 'rgba(255, 95, 168, 0.45)',
  required: 'rgba(255, 152, 0, 0.5)',
  left: 'rgba(74, 144, 217, 0.45)',
  right: 'rgba(139, 195, 74, 0.5)',
}

interface HighlightEntry {
  rect: SVGRectElement
  refs: NoteEvent[]
}

function buildVexNote(el: ScoreElement, clef: 'treble' | 'bass'): StaveNote {
  if (el.kind === 'rest') {
    return new StaveNote({ keys: [clef === 'treble' ? 'b/4' : 'd/3'], duration: `${el.vfDuration}r`, clef })
  }
  const note = new StaveNote({ keys: el.keys, duration: el.vfDuration, clef })
  el.accidentals.forEach((acc, i) => {
    if (acc) note.addModifier(new Accidental(acc), i)
  })
  return note
}

export function SheetMusic({ song, time, heldNotes, requiredNotes, requiredTime }: SheetMusicProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)
  const highlightsRef = useRef<HighlightEntry[]>([])
  const measureXRef = useRef<number[]>([])
  const scoreRef = useRef<ScoreLayout | null>(null)
  const measureRectRef = useRef<SVGRectElement | null>(null)
  const nowPlayingRectRef = useRef<SVGRectElement | null>(null)
  const staveHeightRef = useRef(0)

  const score = useMemo(() => (song ? buildScore(song) : null), [song])
  scoreRef.current = score

  useEffect(() => {
    const host = hostRef.current
    const scrollEl = scrollRef.current
    if (!host || !scrollEl) return

    function render() {
      if (!host) return
      host.innerHTML = ''
      highlightsRef.current = []
      measureXRef.current = []
      measureRectRef.current = null
      nowPlayingRectRef.current = null
      if (!score || score.measures.length === 0) return

      const containerHeight = scrollEl?.clientHeight || MIN_STAVE_HEIGHT
      const staveHeight = Math.max(MIN_STAVE_HEIGHT, Math.min(MAX_STAVE_HEIGHT, containerHeight))
      staveHeightRef.current = staveHeight
      const trebleY = staveHeight * 0.09
      const bassY = staveHeight * 0.52

      const widths = score.measures.map((m) => {
        const count = Math.max(m.treble.length, m.bass.length, 1)
        return Math.max(MEASURE_MIN_WIDTH, 40 + count * WIDTH_PER_ELEMENT)
      })
      const xs: number[] = [LEFT_MARGIN]
      for (const w of widths) xs.push(xs[xs.length - 1] + w)
      measureXRef.current = xs
      const totalWidth = xs[xs.length - 1] + RIGHT_PADDING

      const renderer = new Renderer(host, Renderer.Backends.SVG)
      renderer.resize(totalWidth, staveHeight)
      const context = renderer.getContext()

      const svg = host.querySelector('svg')
      const highlightLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      highlightLayer.setAttribute('class', 'sheet-highlights')
      svg?.insertBefore(highlightLayer, svg.firstChild)

      // Current-measure tint and now-playing bar sit behind the individual note highlights.
      const measureRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      measureRect.setAttribute('y', String(-6))
      measureRect.setAttribute('height', String(staveHeight + 12))
      measureRect.style.fill = 'transparent'
      highlightLayer.appendChild(measureRect)
      measureRectRef.current = measureRect

      const nowPlayingRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      nowPlayingRect.setAttribute('y', String(-6))
      nowPlayingRect.setAttribute('height', String(staveHeight + 12))
      nowPlayingRect.setAttribute('rx', '5')
      nowPlayingRect.style.fill = 'transparent'
      highlightLayer.appendChild(nowPlayingRect)
      nowPlayingRectRef.current = nowPlayingRect

      const entries: HighlightEntry[] = []

      score.measures.forEach((measure, i) => {
        const x = xs[i]
        const width = widths[i]
        const isFirst = i === 0

        const treble = new Stave(x, trebleY, width)
        const bass = new Stave(x, bassY, width)
        if (isFirst) {
          treble.addClef('treble')
          treble.addTimeSignature('4/4')
          bass.addClef('bass')
          bass.addTimeSignature('4/4')
        }
        treble.setContext(context).draw()
        bass.setContext(context).draw()

        if (isFirst) {
          new StaveConnector(treble, bass).setType('brace').setContext(context).draw()
          new StaveConnector(treble, bass).setType('singleLeft').setContext(context).draw()
        }

        for (const [clef, staveEls, stave] of [
          ['treble', measure.treble, treble],
          ['bass', measure.bass, bass],
        ] as const) {
          if (staveEls.length === 0) continue
          const vexNotes = staveEls.map((el) => buildVexNote(el, clef))
          const voice = new Voice({ numBeats: UNITS_PER_MEASURE / 4, beatValue: 4 }).setStrict(false)
          voice.addTickables(vexNotes)
          new Formatter().joinVoices([voice]).format([voice], width - 20)
          voice.draw(context, stave)

          staveEls.forEach((el, idx) => {
            if (el.kind !== 'note') return
            const bbox = vexNotes[idx].getBoundingBox()
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
            rect.setAttribute('x', String(bbox.getX() - 4))
            rect.setAttribute('y', String(bbox.getY() - 4))
            rect.setAttribute('width', String(bbox.getW() + 8))
            rect.setAttribute('height', String(bbox.getH() + 8))
            rect.setAttribute('rx', '4')
            rect.style.fill = 'transparent'
            rect.style.stroke = 'none'
            highlightLayer.appendChild(rect)
            entries.push({ rect, refs: el.refs })
          })
        }
      })

      highlightsRef.current = entries
    }

    render()
    const ro = new ResizeObserver(() => render())
    ro.observe(scrollEl)
    return () => ro.disconnect()
  }, [score])

  useLayoutEffect(() => {
    const layout = scoreRef.current
    const xs = measureXRef.current
    const playhead = playheadRef.current
    const scrollEl = scrollRef.current
    if (!layout || !playhead || xs.length < 2) return

    const unit = time / layout.secondsPerUnit
    const measureIdx = Math.min(xs.length - 2, Math.floor(unit / UNITS_PER_MEASURE))
    const withinMeasure = (unit - measureIdx * UNITS_PER_MEASURE) / UNITS_PER_MEASURE
    const measureWidth = xs[measureIdx + 1] - xs[measureIdx]
    const x = xs[measureIdx] + Math.max(0, Math.min(1, withinMeasure)) * measureWidth

    playhead.style.transform = `translateX(${x}px)`

    if (scrollEl) {
      const targetScroll = x - scrollEl.clientWidth * 0.3
      if (Math.abs(scrollEl.scrollLeft - targetScroll) > 2) {
        scrollEl.scrollLeft = Math.max(0, targetScroll)
      }
    }

    const measureRect = measureRectRef.current
    if (measureRect) {
      measureRect.setAttribute('x', String(xs[measureIdx]))
      measureRect.setAttribute('width', String(measureWidth))
      measureRect.style.fill = MEASURE_TINT
    }

    let playingMinX = Infinity
    let playingMaxX = -Infinity

    for (const { rect, refs } of highlightsRef.current) {
      let fill = 'transparent'
      // Scoped by score time, otherwise every other occurrence of the same
      // pitch elsewhere in the piece would light up too.
      const anySounding = refs.some((r) => time >= r.time && time < r.time + r.duration)
      const anyRequired =
        requiredTime != null && refs.some((r) => requiredNotes.has(r.midi) && Math.abs(r.time - requiredTime) < 0.05)
      const anyHeld = refs.some(
        (r) =>
          heldNotes.has(r.midi) &&
          (Math.abs(r.time - time) < NEAR_PLAYHEAD_SECONDS || (time >= r.time && time < r.time + r.duration)),
      )
      if (anyHeld) fill = NOTE_TINTS.input
      else if (anyRequired) fill = NOTE_TINTS.required
      else if (anySounding) fill = NOTE_TINTS[refs[0].hand]
      rect.style.fill = fill

      if (anyHeld || anySounding) {
        const rx = parseFloat(rect.getAttribute('x') ?? '0')
        const rw = parseFloat(rect.getAttribute('width') ?? '0')
        playingMinX = Math.min(playingMinX, rx)
        playingMaxX = Math.max(playingMaxX, rx + rw)
      }
    }

    const nowPlayingRect = nowPlayingRectRef.current
    if (nowPlayingRect) {
      if (playingMaxX > playingMinX) {
        nowPlayingRect.setAttribute('x', String(playingMinX - 3))
        nowPlayingRect.setAttribute('width', String(playingMaxX - playingMinX + 6))
        nowPlayingRect.style.fill = NOW_PLAYING_TINT
      } else {
        nowPlayingRect.style.fill = 'transparent'
      }
    }
  }, [time, heldNotes, requiredNotes, requiredTime])

  return (
    <div className="sheet-music-wrap">
      <div className="sheet-music-scroll" ref={scrollRef}>
        <div className="sheet-music-inner">
          <div ref={hostRef} className="sheet-music-host" />
          <div ref={playheadRef} className="sheet-music-playhead" />
        </div>
      </div>
      {!song && <p className="sheet-music-empty">Load a song to see its sheet music.</p>}
    </div>
  )
}
