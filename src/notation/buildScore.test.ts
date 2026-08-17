import { describe, expect, it } from 'vitest'
import { Accidental, StaveNote, Voice } from 'vexflow'
import { buildScore, keySignatureToVexSpec } from './buildScore'
import type { NoteEvent, Song } from '../types'

describe('keySignatureToVexSpec', () => {
  it('extracts the letter+accidental from a major key label', () => {
    expect(keySignatureToVexSpec('B Major')).toBe('B')
    expect(keySignatureToVexSpec('F# Major')).toBe('F#')
    expect(keySignatureToVexSpec('Bb Major')).toBe('Bb')
  })

  it('uses the same major-style spelling for a minor key label', () => {
    // Real key signatures are shared between a major key and its relative
    // minor, and the parser already reports the relative-major letter for
    // minor pieces — so no mode suffix is needed for the VexFlow glyph.
    expect(keySignatureToVexSpec('D Minor')).toBe('D')
  })

  it('falls back to C (no sharps or flats) for unknown or missing keys', () => {
    expect(keySignatureToVexSpec(undefined)).toBe('C')
    expect(keySignatureToVexSpec('Not A Key')).toBe('C')
  })
})

function note(midi: number, time: number, hand: NoteEvent['hand'] = 'right', voice?: 0 | 1): NoteEvent {
  return { midi, time, duration: 0.4, velocity: 0.8, hand, voice }
}

describe('buildScore SATB voices', () => {
  it('keeps a single-voice stave when no note declares voice 1, unchanged from before', () => {
    const song: Song = {
      id: 's',
      title: 't',
      bpm: 120,
      duration: 2,
      notes: [note(60, 0, 'right'), note(48, 0, 'left')],
    }
    const score = buildScore(song)
    expect(score.measures[0].trebleVoice2).toBeUndefined()
    expect(score.measures[0].bassVoice2).toBeUndefined()
  })

  it('splits a stave with voice-1 notes (e.g. SATB alto/bass) into a second voice', () => {
    const song: Song = {
      id: 's',
      title: 't',
      bpm: 120,
      duration: 2,
      notes: [
        note(76, 0, 'right', 0), // soprano
        note(69, 0, 'right', 1), // alto
        note(64, 0, 'left', 0), // tenor
        note(43, 0, 'left', 1), // bass
      ],
    }
    const score = buildScore(song)
    const measure = score.measures[0]

    const sopranoNote = measure.treble.find((el) => el.kind === 'note')
    const altoNote = measure.trebleVoice2?.find((el) => el.kind === 'note')
    const tenorNote = measure.bass.find((el) => el.kind === 'note')
    const bassNote = measure.bassVoice2?.find((el) => el.kind === 'note')

    expect(sopranoNote?.kind === 'note' && sopranoNote.keys).toEqual(['e/5'])
    expect(altoNote?.kind === 'note' && altoNote.keys).toEqual(['a/4'])
    expect(tenorNote?.kind === 'note' && tenorNote.keys).toEqual(['e/4'])
    expect(bassNote?.kind === 'note' && bassNote.keys).toEqual(['g/2'])
  })
})

describe('buildScore key signature', () => {
  it('carries the song key signature through as a VexFlow spec', () => {
    const song: Song = {
      id: 's',
      title: 't',
      bpm: 100,
      duration: 4,
      keySignature: 'B Major',
      notes: [note(60, 0)],
    }
    expect(buildScore(song).keySpec).toBe('B')
  })

  it('defaults to C when the song has no key signature', () => {
    const song: Song = { id: 's', title: 't', bpm: 100, duration: 4, notes: [note(60, 0)] }
    expect(buildScore(song).keySpec).toBe('C')
  })
})

/**
 * Exercises the exact pipeline SheetMusic.tsx uses (buildScore's keys →
 * StaveNote → Accidental.applyAccidentals) with real VexFlow objects, to
 * pin down the actual bug this was written to fix: every F# in a B-major
 * piece used to get its own "#" mark, and F-natural notes — genuinely
 * outside the key — got no mark at all, so a reader had no way to tell
 * them apart from the surrounding F#s.
 */
describe('accidentals in context (SheetMusic.tsx pipeline)', () => {
  function accidentalTypes(n: StaveNote): string[] {
    return n.getModifiers().filter((m): m is Accidental => m instanceof Accidental).map((m) => m.type)
  }

  it('marks only notes that deviate from the key signature, and re-marks after a cancellation', () => {
    const song: Song = {
      id: 's',
      title: 't',
      bpm: 120,
      duration: 4,
      keySignature: 'B Major', // 5 sharps: F# C# G# D# A#
      notes: [
        note(66, 0), // F#4 — implied by the key signature
        note(65, 0.5), // F natural — a genuine exception, needs a natural sign
        note(66, 1), // F#4 again — the natural cancelled the key sig for the rest of the measure
      ],
    }
    const score = buildScore(song)
    const elements = score.measures[0].treble.filter((el) => el.kind === 'note')
    expect(elements).toHaveLength(3)

    const vexNotes = elements.map((el) => new StaveNote({ keys: el.keys, duration: el.vfDuration, clef: 'treble' }))
    const voice = new Voice({ numBeats: 4, beatValue: 4 }).setStrict(false)
    voice.addTickables(vexNotes)
    Accidental.applyAccidentals([voice], score.keySpec)

    expect(accidentalTypes(vexNotes[0])).toEqual([]) // key signature already implies F#
    expect(accidentalTypes(vexNotes[1])).toEqual(['n'])
    expect(accidentalTypes(vexNotes[2])).toEqual(['#'])
  })

  it('marks nothing in a plain C-major passage', () => {
    const song: Song = {
      id: 's',
      title: 't',
      bpm: 120,
      duration: 2,
      notes: [note(60, 0), note(62, 1)], // C4, D4 — no accidentals needed anywhere
    }
    const score = buildScore(song)
    const elements = score.measures[0].treble.filter((el) => el.kind === 'note')
    const vexNotes = elements.map((el) => new StaveNote({ keys: el.keys, duration: el.vfDuration, clef: 'treble' }))
    const voice = new Voice({ numBeats: 4, beatValue: 4 }).setStrict(false)
    voice.addTickables(vexNotes)
    Accidental.applyAccidentals([voice], score.keySpec)

    for (const n of vexNotes) expect(accidentalTypes(n)).toEqual([])
  })
})
