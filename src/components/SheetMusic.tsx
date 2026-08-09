import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  Accidental,
  Barline,
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
  type StemmableNote,
} from 'vexflow'
import type { ScoreElement, ScoreLayout } from '../notation/buildScore'
import { buildScore } from '../notation/buildScore'
import type { NoteEvent, Song } from '../types'
import './SheetMusic.css'

interface SheetMusicProps {
  song: Song | null
  time: number
  showFingering?: boolean
}

/**
 * Where the playhead sits, as a fraction of the viewport width — fixed in
 * place by CSS (`.sheet-music-playhead`'s `left`). The score itself slides
 * underneath it via a transform, notes moving right-to-left through it,
 * rather than the line moving across a static score.
 */
const PLAYHEAD_FRACTION = 0.3

const MEASURE_MIN_WIDTH = 120
/** Breathing room after the last glyph of a measure. */
const MEASURE_PADDING = 24
const LEFT_MARGIN = 24
const RIGHT_PADDING = 30
const MIN_STAVE_HEIGHT = 150
const MAX_STAVE_HEIGHT = 320
/** Generous canvas for the fixed clef panel; it's cropped to its measured width, see below. */
const CLEF_PANEL_RENDER_WIDTH = 160

/** A note fades to this opacity once the playhead has passed it. */
const PLAYED_OPACITY = '0.32'
const UPCOMING_OPACITY = '1'

interface HighlightEntry {
  el: SVGElement | undefined
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
  // Accidentals aren't attached here — Accidental.applyAccidentals() decides
  // per-note, per-measure, against the key signature (see the build effect).
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

export function SheetMusic({ song, time, showFingering = false }: SheetMusicProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const clefPanelRef = useRef<HTMLDivElement>(null)
  const clefHostRef = useRef<HTMLDivElement>(null)
  const highlightsRef = useRef<HighlightEntry[]>([])
  const measureXRef = useRef<number[]>([])
  const scoreRef = useRef<ScoreLayout | null>(null)
  const staveHeightRef = useRef(0)

  const score = useMemo(() => (song ? buildScore(song) : null), [song])
  scoreRef.current = score

  // Read via a ref inside positionScore() so it stays correct even when
  // called from the build effect below, whose closure only refreshes when
  // `score`/`showFingering` change — not on every playback tick.
  const latestRef = useRef({ time })
  latestRef.current = { time }

  /**
   * Slides the score under the fixed playhead line so the note due "now"
   * lines up with it, and fades notes that have already passed it. Safe to
   * call from anywhere — it reads everything through refs rather than
   * closured props.
   */
  function positionScore() {
    const layout = scoreRef.current
    const xs = measureXRef.current
    const inner = innerRef.current
    const scrollEl = scrollRef.current
    if (!layout || !inner || !scrollEl || xs.length < 2) return

    const { time } = latestRef.current

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

    // The playhead itself never moves (fixed by CSS `left`); the score slides
    // underneath it instead, so notes travel right-to-left through the line.
    const playheadX = scrollEl.clientWidth * PLAYHEAD_FRACTION
    inner.style.transform = `translateX(${playheadX - x}px)`

    for (const { el, refs } of highlightsRef.current) {
      if (!el) continue
      const passed = refs.every((r) => time >= r.time)
      el.style.opacity = passed ? PLAYED_OPACITY : UPCOMING_OPACITY
    }
  }

  useEffect(() => {
    const host = hostRef.current
    const scrollEl = scrollRef.current
    if (!host || !scrollEl) return

    function render() {
      if (!host) return
      host.innerHTML = ''
      highlightsRef.current = []
      measureXRef.current = []
      const clefHost = clefHostRef.current
      if (clefHost) clefHost.innerHTML = ''

      if (!score || score.measures.length === 0) {
        if (clefPanelRef.current) clefPanelRef.current.style.width = '0px'
        return
      }

      const containerHeight = scrollEl?.clientHeight || MIN_STAVE_HEIGHT
      const staveHeight = Math.max(MIN_STAVE_HEIGHT, Math.min(MAX_STAVE_HEIGHT, containerHeight))
      staveHeightRef.current = staveHeight
      const trebleY = staveHeight * 0.09
      const bassY = staveHeight * 0.52
      const timeSpec = `${score.timeSignature[0]}/${score.timeSignature[1]}`

      // Fixed panel: just the clef, time signature and brace, pinned to the
      // left edge and never touched by the transform below. It's cropped to
      // its measured width, so the moving score isn't reserving space for it.
      if (clefHost && clefPanelRef.current) {
        const clefRenderer = new Renderer(clefHost, Renderer.Backends.SVG)
        clefRenderer.resize(CLEF_PANEL_RENDER_WIDTH, staveHeight)
        const clefContext = clefRenderer.getContext()
        const clefTreble = new Stave(0, trebleY, CLEF_PANEL_RENDER_WIDTH)
        const clefBass = new Stave(0, bassY, CLEF_PANEL_RENDER_WIDTH)
        clefTreble
          .addClef('treble')
          .addKeySignature(score.keySpec)
          .addTimeSignature(timeSpec)
          .setEndBarType(Barline.type.NONE)
        clefBass.addClef('bass').addKeySignature(score.keySpec).addTimeSignature(timeSpec).setEndBarType(Barline.type.NONE)
        clefTreble.setContext(clefContext).draw()
        clefBass.setContext(clefContext).draw()
        new StaveConnector(clefTreble, clefBass).setType('brace').setContext(clefContext).draw()
        new StaveConnector(clefTreble, clefBass).setType('singleLeft').setContext(clefContext).draw()
        clefPanelRef.current.style.width = `${clefTreble.getNoteStartX() + 8}px`
      }

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
        // Resolves accidentals against the key signature — before any width
        // measurement, since a sharp/flat/natural changes how much room a
        // note needs. Applied per hand so treble and bass never share
        // carry-over, and per measure (fresh voices each time) so it resets
        // at the barline like real notation.
        if (trebleVoice) Accidental.applyAccidentals([trebleVoice], score.keySpec)
        if (bassVoice) Accidental.applyAccidentals([bassVoice], score.keySpec)
        if (trebleVoice) voices.push(trebleVoice)
        if (bassVoice) voices.push(bassVoice)

        // One formatter across both staves keeps the hands vertically aligned.
        const formatter = new Formatter()
        for (const voice of voices) formatter.joinVoices([voice])
        const minWidth = voices.length ? formatter.preCalculateMinTotalWidth(voices) : MEASURE_MIN_WIDTH
        return { trebleNotes, bassNotes, trebleVoice, bassVoice, voices, formatter, minWidth }
      })

      const widths = built.map((b) => Math.max(MEASURE_MIN_WIDTH, Math.ceil(b.minWidth) + MEASURE_PADDING))
      const xs: number[] = [LEFT_MARGIN]
      for (const w of widths) xs.push(xs[xs.length - 1] + w)
      measureXRef.current = xs
      const totalWidth = xs[xs.length - 1] + RIGHT_PADDING

      const renderer = new Renderer(host, Renderer.Backends.SVG)
      renderer.resize(totalWidth, staveHeight)
      const context = renderer.getContext()

      const entries: HighlightEntry[] = []

      // Pass 2 — place the staves at their computed widths and engrave. No
      // clef/time-signature here — that's the fixed panel's job now, so
      // every measure (including the first) is laid out identically.
      score.measures.forEach((measure, i) => {
        const x = xs[i]
        const width = widths[i]
        const b = built[i]

        const treble = new Stave(x, trebleY, width)
        const bass = new Stave(x, bassY, width)
        treble.setContext(context).draw()
        bass.setContext(context).draw()

        b.trebleVoice?.setStave(treble)
        b.bassVoice?.setStave(bass)
        if (b.voices.length) {
          b.formatter.format(b.voices, Math.max(20, width - MEASURE_PADDING))
        }

        for (const [staveEls, stave, vexNotes, voice] of [
          [measure.treble, treble, b.trebleNotes, b.trebleVoice],
          [measure.bass, bass, b.bassNotes, b.bassVoice],
        ] as const) {
          if (!voice || staveEls.length === 0) continue

          const refsByVexNote = new Map<StemmableNote, NoteEvent[]>()
          staveEls.forEach((el, idx) => {
            if (el.kind === 'note') refsByVexNote.set(vexNotes[idx], el.refs)
          })

          // Beam eighths and shorter within each beat instead of drawing loose flags.
          const beams = Beam.generateBeams(vexNotes, {
            // Compound meters (6/8, 12/8) group in dotted-quarter beats.
            groups: [score.timeSignature[1] === 8 ? new Fraction(3, 8) : new Fraction(1, 4)],
            maintainStemDirections: true,
          })
          voice.draw(context, stave)
          for (const beam of beams) {
            beam.setContext(context).draw()
            // A beam fades once every note it connects has passed the line —
            // fading it as soon as the first one does would grey out notes
            // still ahead of the playhead.
            const beamRefs = beam.notes.flatMap((n) => refsByVexNote.get(n) ?? [])
            if (beamRefs.length) entries.push({ el: beam.getSVGElement(), refs: beamRefs })
          }

          // Tie note heads that were split across a barline or a beat boundary.
          staveEls.forEach((el, idx) => {
            if (el.kind !== 'note' || !el.tiedFromPrevious || idx === 0) return
            const prev = vexNotes[idx - 1]
            if (!prev) return
            new StaveTie({ firstNote: prev, lastNote: vexNotes[idx] }).setContext(context).draw()
          })

          staveEls.forEach((el, idx) => {
            if (el.kind !== 'note') return
            entries.push({ el: vexNotes[idx].getSVGElement(), refs: el.refs })
          })
        }
      })

      highlightsRef.current = entries

      // Re-align immediately after a rebuild (song change, fingering toggle,
      // or a height-driven relayout) instead of waiting for the next tick.
      positionScore()
    }

    render()

    // Only the height feeds the layout. Watching width too would re-render on
    // the horizontal scrollbar that our old auto-scroll approach created —
    // doubling the work on every load for no visual change. We still call
    // positionScore() on any size change so the transform-based offset stays
    // aligned with the current viewport width.
    let lastHeight = scrollEl.clientHeight
    const ro = new ResizeObserver(() => {
      const height = scrollEl.clientHeight
      if (height !== lastHeight) {
        lastHeight = height
        render()
      } else {
        positionScore()
      }
    })
    ro.observe(scrollEl)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, showFingering])

  useLayoutEffect(() => {
    positionScore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time])

  return (
    <div className="sheet-music-wrap">
      <div className="sheet-music-scroll" ref={scrollRef}>
        <div ref={innerRef} className="sheet-music-inner">
          <div ref={hostRef} className="sheet-music-host" />
        </div>
        <div ref={clefPanelRef} className="sheet-music-clef-panel">
          <div ref={clefHostRef} className="sheet-music-clef-host" />
        </div>
        <div className="sheet-music-playhead" />
      </div>
      {!song && <p className="sheet-music-empty">Load a song to see its sheet music.</p>}
    </div>
  )
}
