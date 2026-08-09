import type { NoteEvent, Song, TempoEvent } from '../types'

export const UNITS_PER_BEAT = 4 // 1 unit = a sixteenth note
export const BEATS_PER_MEASURE = 4
export const UNITS_PER_MEASURE = UNITS_PER_BEAT * BEATS_PER_MEASURE

/**
 * Performed notes are released slightly early (and MIDI recordings even more
 * so), which would otherwise leave a sliver of rest after almost every note.
 * A gap this small is treated as articulation, not as a written rest.
 */
const MAX_FILLED_GAP_UNITS = 1

export interface ScoreNoteElement {
  kind: 'note'
  vfDuration: string
  dots: number
  keys: string[]
  refs: NoteEvent[]
  /** True when this element continues a note split across a barline. */
  tiedFromPrevious: boolean
}

export interface ScoreRestElement {
  kind: 'rest'
  vfDuration: string
  dots: number
}

export type ScoreElement = ScoreNoteElement | ScoreRestElement

export interface ScoreMeasure {
  treble: ScoreElement[]
  bass: ScoreElement[]
}

export interface ScoreLayout {
  measures: ScoreMeasure[]
  /** Wall-clock start of each measure, plus the end of the last one. */
  measureStartSeconds: number[]
  unitsPerMeasure: number
  timeSignature: [number, number]
  /** A VexFlow key-signature spec, e.g. "C", "F#", "Bb" — see keySignatureToVexSpec. */
  keySpec: string
}

/**
 * The 15 key names VexFlow's key-signature table understands, always in
 * their major spelling — a minor key shares its relative major's sharps and
 * flats, so the major spelling draws the correct signature either way (and
 * this sidesteps needing to also carry the mode through).
 */
const VALID_KEY_LETTERS = new Set(['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'])

/** Turns a display string like "B Major" or "F# Minor" into a VexFlow key spec, e.g. "B", "F#". */
export function keySignatureToVexSpec(keySignature: string | undefined): string {
  const letter = keySignature?.split(' ')[0]
  return letter && VALID_KEY_LETTERS.has(letter) ? letter : 'C'
}

/**
 * Converts musical position to wall-clock seconds through the file's tempo map,
 * so a piece that speeds up or slows down still gets correctly placed barlines.
 */
function makeTicksToSeconds(ppq: number, tempos: TempoEvent[]) {
  const sorted = [...tempos].sort((a, b) => a.ticks - b.ticks)
  return (ticks: number): number => {
    let seconds = 0
    let lastTicks = 0
    let bpm = sorted[0]?.bpm ?? 120
    for (const tempo of sorted) {
      if (tempo.ticks >= ticks) break
      seconds += ((tempo.ticks - lastTicks) / ppq) * (60 / bpm)
      lastTicks = tempo.ticks
      bpm = tempo.bpm
    }
    return seconds + ((ticks - lastTicks) / ppq) * (60 / bpm)
  }
}

const NOTE_NAMES = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b']

function midiToVexKey(midi: number): string {
  const pitchClass = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1
  return `${NOTE_NAMES[pitchClass]}/${octave}`
}

interface DurationValue {
  units: number
  duration: string
  dots: number
}

/**
 * Largest-first note values including dotted ones, so a 3-beat note engraves as
 * a single dotted half rather than a half plus a quarter.
 */
const DURATION_VALUES: DurationValue[] = [
  { units: 16, duration: 'w', dots: 0 },
  { units: 12, duration: 'h', dots: 1 },
  { units: 8, duration: 'h', dots: 0 },
  { units: 6, duration: 'q', dots: 1 },
  { units: 4, duration: 'q', dots: 0 },
  { units: 3, duration: '8', dots: 1 },
  { units: 2, duration: '8', dots: 0 },
  { units: 1, duration: '16', dots: 0 },
]

function decompose(units: number): DurationValue[] {
  const parts: DurationValue[] = []
  let remaining = units
  for (const value of DURATION_VALUES) {
    while (remaining >= value.units) {
      parts.push(value)
      remaining -= value.units
    }
  }
  return parts
}

interface HandEvent {
  startUnit: number
  durUnits: number
  refs: NoteEvent[]
}

function quantizeHandEvents(
  notes: NoteEvent[],
  toUnits: (note: NoteEvent) => { startUnit: number; durUnits: number },
  unitsPerMeasure: number,
): HandEvent[] {
  const quantized = notes
    .map((n) => {
      const { startUnit, durUnits } = toUnits(n)
      return { startUnit: Math.max(0, startUnit), durUnits: Math.max(1, durUnits), ref: n }
    })
    .sort((a, b) => a.startUnit - b.startUnit || a.ref.midi - b.ref.midi)

  const grouped: HandEvent[] = []
  for (const q of quantized) {
    const last = grouped[grouped.length - 1]
    if (last && last.startUnit === q.startUnit) {
      last.refs.push(q.ref)
      last.durUnits = Math.max(last.durUnits, q.durUnits)
    } else {
      grouped.push({ startUnit: q.startUnit, durUnits: q.durUnits, refs: [q.ref] })
    }
  }

  for (let i = 0; i < grouped.length - 1; i++) {
    const cur = grouped[i]
    const next = grouped[i + 1]
    const end = cur.startUnit + cur.durUnits
    if (end > next.startUnit) {
      cur.durUnits = Math.max(1, next.startUnit - cur.startUnit)
    } else if (next.startUnit - end <= MAX_FILLED_GAP_UNITS) {
      // Absorb the release gap so it doesn't become a stray sixteenth rest.
      cur.durUnits = next.startUnit - cur.startUnit
    }
  }

  // The final note has no successor to close against, so square it up with the
  // end of its measure instead — otherwise every piece ends on a stray rest.
  const last = grouped[grouped.length - 1]
  if (last) {
    const end = last.startUnit + last.durUnits
    const measureEnd = Math.ceil(end / unitsPerMeasure) * unitsPerMeasure
    if (measureEnd - end <= MAX_FILLED_GAP_UNITS) last.durUnits = measureEnd - last.startUnit
  }

  return grouped
}

function layoutHandMeasures(
  events: HandEvent[],
  measureCount: number,
  unitsPerMeasure: number,
): ScoreElement[][] {
  const measures: ScoreElement[][] = []
  let eventIdx = 0

  for (let m = 0; m < measureCount; m++) {
    const measureStart = m * unitsPerMeasure
    const measureEnd = measureStart + unitsPerMeasure
    let cursor = measureStart
    const elements: ScoreElement[] = []

    while (cursor < measureEnd) {
      const event = events[eventIdx]

      if (!event || event.startUnit >= measureEnd) {
        for (const v of decompose(measureEnd - cursor)) {
          elements.push({ kind: 'rest', vfDuration: v.duration, dots: v.dots })
        }
        cursor = measureEnd
        break
      }

      if (event.startUnit > cursor) {
        for (const v of decompose(event.startUnit - cursor)) {
          elements.push({ kind: 'rest', vfDuration: v.duration, dots: v.dots })
        }
        cursor = event.startUnit
        continue
      }

      const eventEnd = event.startUnit + event.durUnits
      const effectiveEnd = Math.min(eventEnd, measureEnd)
      const len = effectiveEnd - cursor

      if (len <= 0) {
        eventIdx++
        continue
      }

      const keys = event.refs.map((r) => midiToVexKey(r.midi))
      // A note carried in from the previous measure is tied, not restruck.
      let tiedFromPrevious = cursor > event.startUnit
      for (const v of decompose(len)) {
        elements.push({
          kind: 'note',
          vfDuration: v.duration,
          dots: v.dots,
          keys,
          refs: event.refs,
          tiedFromPrevious,
        })
        tiedFromPrevious = true
      }
      cursor = effectiveEnd
      if (eventEnd <= measureEnd) eventIdx++
    }

    measures.push(elements)
  }

  return measures
}

export function buildScore(song: Song): ScoreLayout {
  const [beatsPerBar, beatUnit] = song.timeSignature ?? [4, 4]
  // One unit is a sixteenth, so a 12/8 bar is 12 eighths = 24 units.
  const unitsPerMeasure = Math.max(1, Math.round((beatsPerBar * UNITS_PER_BEAT * 4) / beatUnit))

  // MIDI files carry tempo-independent musical time; hand-authored demo songs
  // only have seconds, in which case their single tempo is exact anyway.
  const ppq = song.ppq
  const unitsPerTick = ppq ? UNITS_PER_BEAT / ppq : 0
  const secondsPerUnit = 60 / song.bpm / UNITS_PER_BEAT
  const toUnits = (n: NoteEvent) =>
    ppq && n.ticks !== undefined
      ? {
          startUnit: Math.round(n.ticks * unitsPerTick),
          durUnits: Math.round((n.durationTicks ?? 0) * unitsPerTick),
        }
      : {
          startUnit: Math.round(n.time / secondsPerUnit),
          durUnits: Math.round(n.duration / secondsPerUnit),
        }

  const trebleEvents = quantizeHandEvents(
    song.notes.filter((n) => n.hand === 'right'),
    toUnits,
    unitsPerMeasure,
  )
  const bassEvents = quantizeHandEvents(
    song.notes.filter((n) => n.hand === 'left'),
    toUnits,
    unitsPerMeasure,
  )

  const maxEndUnit = Math.max(
    0,
    ...trebleEvents.map((e) => e.startUnit + e.durUnits),
    ...bassEvents.map((e) => e.startUnit + e.durUnits),
  )
  const measureCount = Math.max(1, Math.ceil(maxEndUnit / unitsPerMeasure))

  const trebleMeasures = layoutHandMeasures(trebleEvents, measureCount, unitsPerMeasure)
  const bassMeasures = layoutHandMeasures(bassEvents, measureCount, unitsPerMeasure)
  const measures: ScoreMeasure[] = trebleMeasures.map((treble, i) => ({ treble, bass: bassMeasures[i] }))

  const ticksToSeconds = ppq ? makeTicksToSeconds(ppq, song.tempoEvents ?? []) : null
  const measureStartSeconds: number[] = []
  for (let m = 0; m <= measureCount; m++) {
    const unit = m * unitsPerMeasure
    measureStartSeconds.push(
      ticksToSeconds && ppq ? ticksToSeconds(unit / unitsPerTick) : unit * secondsPerUnit,
    )
  }

  return {
    measures,
    measureStartSeconds,
    unitsPerMeasure,
    timeSignature: [beatsPerBar, beatUnit],
    keySpec: keySignatureToVexSpec(song.keySignature),
  }
}
