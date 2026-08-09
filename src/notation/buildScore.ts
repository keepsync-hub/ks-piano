import type { NoteEvent, Song } from '../types'

export const UNITS_PER_BEAT = 4 // 1 unit = a sixteenth note
export const BEATS_PER_MEASURE = 4
export const UNITS_PER_MEASURE = UNITS_PER_BEAT * BEATS_PER_MEASURE

export interface ScoreNoteElement {
  kind: 'note'
  vfDuration: string
  keys: string[]
  accidentals: (string | null)[]
  refs: NoteEvent[]
}

export interface ScoreRestElement {
  kind: 'rest'
  vfDuration: string
}

export type ScoreElement = ScoreNoteElement | ScoreRestElement

export interface ScoreMeasure {
  treble: ScoreElement[]
  bass: ScoreElement[]
}

export interface ScoreLayout {
  measures: ScoreMeasure[]
  secondsPerUnit: number
}

const NOTE_NAMES = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b']

function midiToVexKey(midi: number): { key: string; accidental: string | null } {
  const pitchClass = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1
  const name = NOTE_NAMES[pitchClass]
  return { key: `${name}/${octave}`, accidental: name.includes('#') ? '#' : null }
}

// Greedy decomposition into whole/half/quarter/eighth/sixteenth notes.
// Works because {16, 8, 4, 2, 1} is a canonical (power-of-two) denomination set.
const UNIT_DURATIONS: Array<[number, string]> = [
  [16, 'w'],
  [8, 'h'],
  [4, 'q'],
  [2, '8'],
  [1, '16'],
]

function decompose(units: number): string[] {
  const durations: string[] = []
  let remaining = units
  for (const [size, vf] of UNIT_DURATIONS) {
    while (remaining >= size) {
      durations.push(vf)
      remaining -= size
    }
  }
  return durations
}

interface HandEvent {
  startUnit: number
  durUnits: number
  refs: NoteEvent[]
}

function quantizeHandEvents(notes: NoteEvent[], secondsPerUnit: number): HandEvent[] {
  const quantized = notes
    .map((n) => ({
      startUnit: Math.max(0, Math.round(n.time / secondsPerUnit)),
      durUnits: Math.max(1, Math.round(n.duration / secondsPerUnit)),
      ref: n,
    }))
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
    if (cur.startUnit + cur.durUnits > next.startUnit) {
      cur.durUnits = Math.max(1, next.startUnit - cur.startUnit)
    }
  }

  return grouped
}

function layoutHandMeasures(events: HandEvent[], measureCount: number): ScoreElement[][] {
  const measures: ScoreElement[][] = []
  let eventIdx = 0

  for (let m = 0; m < measureCount; m++) {
    const measureStart = m * UNITS_PER_MEASURE
    const measureEnd = measureStart + UNITS_PER_MEASURE
    let cursor = measureStart
    const elements: ScoreElement[] = []

    while (cursor < measureEnd) {
      const event = events[eventIdx]

      if (!event || event.startUnit >= measureEnd) {
        for (const vf of decompose(measureEnd - cursor)) elements.push({ kind: 'rest', vfDuration: vf })
        cursor = measureEnd
        break
      }

      if (event.startUnit > cursor) {
        for (const vf of decompose(event.startUnit - cursor)) elements.push({ kind: 'rest', vfDuration: vf })
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

      const keys = event.refs.map((r) => midiToVexKey(r.midi).key)
      const accidentals = event.refs.map((r) => midiToVexKey(r.midi).accidental)
      for (const vf of decompose(len)) {
        elements.push({ kind: 'note', vfDuration: vf, keys, accidentals, refs: event.refs })
      }
      cursor = effectiveEnd
      if (eventEnd <= measureEnd) eventIdx++
    }

    measures.push(elements)
  }

  return measures
}

export function buildScore(song: Song): ScoreLayout {
  const secondsPerBeat = 60 / song.bpm
  const secondsPerUnit = secondsPerBeat / UNITS_PER_BEAT

  const trebleNotes = song.notes.filter((n) => n.hand === 'right')
  const bassNotes = song.notes.filter((n) => n.hand === 'left')

  const trebleEvents = quantizeHandEvents(trebleNotes, secondsPerUnit)
  const bassEvents = quantizeHandEvents(bassNotes, secondsPerUnit)

  const maxEndUnit = Math.max(
    0,
    ...trebleEvents.map((e) => e.startUnit + e.durUnits),
    ...bassEvents.map((e) => e.startUnit + e.durUnits),
  )
  const measureCount = Math.max(1, Math.ceil(maxEndUnit / UNITS_PER_MEASURE))

  const trebleMeasures = layoutHandMeasures(trebleEvents, measureCount)
  const bassMeasures = layoutHandMeasures(bassEvents, measureCount)

  const measures: ScoreMeasure[] = trebleMeasures.map((treble, i) => ({ treble, bass: bassMeasures[i] }))

  return { measures, secondsPerUnit }
}
