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
}

const MEASURE_MIN_WIDTH = 140
const WIDTH_PER_ELEMENT = 32
const LEFT_MARGIN = 24
const RIGHT_PADDING = 30
const TREBLE_Y = 30
const BASS_Y = 150
const STAVE_HEIGHT = 260
const HAND_FILL = { right: '#3fb6ff', left: '#ff5fa8' }

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

export function SheetMusic({ song, time, heldNotes, requiredNotes }: SheetMusicProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)
  const highlightsRef = useRef<HighlightEntry[]>([])
  const measureXRef = useRef<number[]>([])
  const scoreRef = useRef<ScoreLayout | null>(null)

  const score = useMemo(() => (song ? buildScore(song) : null), [song])
  scoreRef.current = score

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    host.innerHTML = ''
    highlightsRef.current = []
    measureXRef.current = []
    if (!score || score.measures.length === 0) return

    const widths = score.measures.map((m) => {
      const count = Math.max(m.treble.length, m.bass.length, 1)
      return Math.max(MEASURE_MIN_WIDTH, 40 + count * WIDTH_PER_ELEMENT)
    })
    const xs: number[] = [LEFT_MARGIN]
    for (const w of widths) xs.push(xs[xs.length - 1] + w)
    measureXRef.current = xs
    const totalWidth = xs[xs.length - 1] + RIGHT_PADDING

    const renderer = new Renderer(host, Renderer.Backends.SVG)
    renderer.resize(totalWidth, STAVE_HEIGHT)
    const context = renderer.getContext()

    const svg = host.querySelector('svg')
    const highlightLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    highlightLayer.setAttribute('class', 'sheet-highlights')
    svg?.insertBefore(highlightLayer, svg.firstChild)

    const entries: HighlightEntry[] = []

    score.measures.forEach((measure, i) => {
      const x = xs[i]
      const width = widths[i]
      const isFirst = i === 0

      const treble = new Stave(x, TREBLE_Y, width)
      const bass = new Stave(x, BASS_Y, width)
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

    for (const { rect, refs } of highlightsRef.current) {
      let fill = 'transparent'
      const anyRequired = refs.some((r) => requiredNotes.has(r.midi))
      const anyHeld = refs.some((r) => heldNotes.has(r.midi))
      const anySounding = refs.some((r) => time >= r.time && time < r.time + r.duration)
      if (anyHeld) fill = 'rgba(79, 194, 127, 0.5)'
      else if (anyRequired) fill = 'rgba(255, 184, 77, 0.55)'
      else if (anySounding) fill = `${HAND_FILL[refs[0].hand]}55`
      rect.style.fill = fill
    }
  }, [time, heldNotes, requiredNotes])

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
