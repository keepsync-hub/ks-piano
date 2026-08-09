import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  Accidental,
  Beam,
  Dot,
  Formatter,
  Fraction,
  FretHandFinger,
  Modifier,
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
  StaveTie,
  Voice,
} from 'vexflow'
import type { ScoreElement, ScoreLayout } from '../notation/buildScore'
import { buildScore } from '../notation/buildScore'
import type { NoteEvent, Song } from '../types'
import './SheetMusic.css'

interface SheetMusicProps {
  song: Song | null
  time: number
  heldNotes: Set<number>
  requiredNotes: Set<number>
  /** Score time of the required group, so only that occurrence is highlighted. */
  requiredTime?: number | null
  showFingering?: boolean
}

/** How far from the playhead a note still counts as "the one being played now". */
const NEAR_PLAYHEAD_SECONDS = 0.4

const MEASURE_MIN_WIDTH = 120
/** Breathing room after the last glyph of a measure. */
const MEASURE_PADDING = 24
/** Extra room in measure 1 for the clef and time signature. */
const FIRST_MEASURE_LEAD_IN = 56
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

function buildVexNote(el: ScoreElement, clef: 'treble' | 'bass', showFingering: boolean): StaveNote {
  if (el.kind === 'rest') {
    const rest = new StaveNote({
      keys: [clef === 'treble' ? 'b/4' : 'd/3'],
      duration: `${el.vfDuration}r`,
      clef,
    })
    if (el.dots) Dot.buildAndAttach([rest], { all: true })
    return rest
  }
  const note = new StaveNote({ keys: el.keys, duration: el.vfDuration, clef })
  if (el.dots) Dot.buildAndAttach([note], { all: true })
  el.accidentals.forEach((acc, i) => {
    if (acc) note.addModifier(new Accidental(acc), i)
  })
  if (showFingering) {
    // Convention: right-hand fingering above the treble staff, left-hand below the bass.
    const position = clef === 'treble' ? Modifier.Position.ABOVE : Modifier.Position.BELOW
    el.refs.forEach((ref, i) => {
      if (!ref.finger) return
      note.addModifier(new FretHandFinger(String(ref.finger)).setPosition(position), i)
    })
  }
  return note
}

export function SheetMusic({
  song,
  time,
  heldNotes,
  requiredNotes,
  requiredTime,
  showFingering = false,
}: SheetMusicProps) {
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

      // Pass 1 — build both hands' voices per measure and ask VexFlow how much
      // room they actually need. Sizing from a glyph count instead would let
      // dense measures (or fingering marks) overflow their barlines.
      const built = score.measures.map((measure) => {
        const trebleNotes = measure.treble.map((el) => buildVexNote(el, 'treble', showFingering))
        const bassNotes = measure.bass.map((el) => buildVexNote(el, 'bass', showFingering))
        const voices: Voice[] = []
        const makeVoice = (notes: StaveNote[]) => {
          const voice = new Voice({
            numBeats: score.timeSignature[0],
            beatValue: score.timeSignature[1],
          }).setStrict(false)
          voice.addTickables(notes)
          return voice
        }
        const trebleVoice = trebleNotes.length ? makeVoice(trebleNotes) : null
        const bassVoice = bassNotes.length ? makeVoice(bassNotes) : null
        if (trebleVoice) voices.push(trebleVoice)
        if (bassVoice) voices.push(bassVoice)

        // One formatter across both staves keeps the hands vertically aligned.
        const formatter = new Formatter()
        for (const voice of voices) formatter.joinVoices([voice])
        const minWidth = voices.length ? formatter.preCalculateMinTotalWidth(voices) : MEASURE_MIN_WIDTH
        return { trebleNotes, bassNotes, trebleVoice, bassVoice, voices, formatter, minWidth }
      })

      const widths = built.map((b, i) => {
        const leadIn = i === 0 ? FIRST_MEASURE_LEAD_IN : 0
        return Math.max(MEASURE_MIN_WIDTH, Math.ceil(b.minWidth) + MEASURE_PADDING + leadIn)
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

      // Pass 2 — place the staves at their computed widths and engrave.
      score.measures.forEach((measure, i) => {
        const x = xs[i]
        const width = widths[i]
        const isFirst = i === 0
        const b = built[i]

        const treble = new Stave(x, trebleY, width)
        const bass = new Stave(x, bassY, width)
        if (isFirst) {
          const timeSpec = `${score.timeSignature[0]}/${score.timeSignature[1]}`
          treble.addClef('treble')
          treble.addTimeSignature(timeSpec)
          bass.addClef('bass')
          bass.addTimeSignature(timeSpec)
        }
        treble.setContext(context).draw()
        bass.setContext(context).draw()

        if (isFirst) {
          new StaveConnector(treble, bass).setType('brace').setContext(context).draw()
          new StaveConnector(treble, bass).setType('singleLeft').setContext(context).draw()
        }

        b.trebleVoice?.setStave(treble)
        b.bassVoice?.setStave(bass)
        if (b.voices.length) {
          const noteAreaStart = isFirst ? treble.getNoteStartX() - x : 0
          b.formatter.format(b.voices, Math.max(20, width - MEASURE_PADDING - noteAreaStart))
        }

        for (const [staveEls, stave, vexNotes, voice] of [
          [measure.treble, treble, b.trebleNotes, b.trebleVoice],
          [measure.bass, bass, b.bassNotes, b.bassVoice],
        ] as const) {
          if (!voice || staveEls.length === 0) continue

          // Beam eighths and shorter within each beat instead of drawing loose flags.
          const beams = Beam.generateBeams(vexNotes, {
            // Compound meters (6/8, 12/8) group in dotted-quarter beats.
            groups: [score.timeSignature[1] === 8 ? new Fraction(3, 8) : new Fraction(1, 4)],
            maintainStemDirections: true,
          })
          voice.draw(context, stave)
          for (const beam of beams) beam.setContext(context).draw()

          // Tie note heads that were split across a barline or a beat boundary.
          staveEls.forEach((el, idx) => {
            if (el.kind !== 'note' || !el.tiedFromPrevious || idx === 0) return
            const prev = vexNotes[idx - 1]
            if (!prev) return
            new StaveTie({ firstNote: prev, lastNote: vexNotes[idx] }).setContext(context).draw()
          })

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

    // Only the height feeds the layout. Watching width too would re-render on
    // the horizontal scrollbar that our own output creates — doubling the work
    // on every load for no visual change.
    let lastHeight = scrollEl.clientHeight
    const ro = new ResizeObserver(() => {
      const height = scrollEl.clientHeight
      if (height === lastHeight) return
      lastHeight = height
      render()
    })
    ro.observe(scrollEl)
    return () => ro.disconnect()
  }, [score, showFingering])

  useLayoutEffect(() => {
    const layout = scoreRef.current
    const xs = measureXRef.current
    const playhead = playheadRef.current
    const scrollEl = scrollRef.current
    if (!layout || !playhead || xs.length < 2) return

    // Locate the playhead through the measure time table, which already went
    // through the tempo map, instead of assuming one constant tempo.
    const starts = layout.measureStartSeconds
    let measureIdx = 0
    while (measureIdx < starts.length - 2 && starts[measureIdx + 1] <= time) measureIdx++
    measureIdx = Math.min(measureIdx, xs.length - 2)
    const measureSeconds = starts[measureIdx + 1] - starts[measureIdx]
    const withinMeasure = measureSeconds > 0 ? (time - starts[measureIdx]) / measureSeconds : 0
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
