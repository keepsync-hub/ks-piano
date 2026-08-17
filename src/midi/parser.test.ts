import { afterEach, describe, expect, it, vi } from 'vitest'

// Shape of a raw @tonejs/midi track/note — deliberately not our NoteEvent
// type, since the real library never produces a `hand` or `voice` field;
// parseMidiFile derives those itself from track position/name.
interface MockNote {
  midi: number
  time: number
  duration: number
  velocity: number
  ticks: number
  durationTicks: number
}
interface MockTrack {
  name: string
  notes: MockNote[]
}

const defaultTracks: MockTrack[] = [
  {
    name: '',
    notes: [
      { midi: 60, time: 0, duration: 1, velocity: 0.8, ticks: 0, durationTicks: 480 },
      { midi: 64, time: 1, duration: 1, velocity: 0.8, ticks: 480, durationTicks: 480 },
    ],
  },
  {
    name: '',
    notes: [{ midi: 48, time: 0, duration: 2, velocity: 0.8, ticks: 0, durationTicks: 960 }],
  },
]

// Mutable so individual tests can swap in a different track layout (e.g. SATB
// part names) without redefining the whole @tonejs/midi mock.
const { mockState } = vi.hoisted(() => ({ mockState: { tracks: null as unknown } }))

// Mock @tonejs/midi so tests don't need real MIDI binaries.
vi.mock('@tonejs/midi', () => {
  class MockMidi {
    header = {
      tempos: [{ bpm: 120, ticks: 0 }],
      keySignatures: [{ key: 'C', scale: 'major' }],
      timeSignatures: [{ timeSignature: [4, 4] }],
      ppq: 480,
    }
    duration = 10
    tracks: MockTrack[] = []
    buffer: ArrayBuffer
    constructor(buffer: ArrayBuffer) {
      this.buffer = buffer
      this.tracks = (mockState.tracks as MockTrack[] | null) ?? defaultTracks
    }
  }
  return { Midi: MockMidi }
})

import { parseMidiFile } from './parser'

function setTracks(tracks: MockTrack[] | null) {
  mockState.tracks = tracks
}

function makeMidiFile(name: string, shouldFail = false): File {
  return {
    name,
    arrayBuffer: async () => {
      if (shouldFail) throw new Error('bad midi')
      return new Uint8Array(10).buffer
    },
  } as unknown as File
}

describe('parseMidiFile', () => {
  it('rejects non-MIDI files', async () => {
    const file = makeMidiFile('song.txt')
    await expect(parseMidiFile(file)).rejects.toThrow('Only .mid and .midi files are supported')
  })

  it('rejects corrupted MIDI files', async () => {
    const file = makeMidiFile('bad.mid', true)
    await expect(parseMidiFile(file)).rejects.toThrow('Could not parse MIDI file')
  })

  it('parses a two-track file into right and left hands', async () => {
    const file = makeMidiFile('test.mid')
    const song = await parseMidiFile(file)
    expect(song.title).toBe('test')
    expect(song.notes.length).toBe(3)
    expect(song.notes.filter((n) => n.hand === 'right').length).toBe(2)
    expect(song.notes.filter((n) => n.hand === 'left').length).toBe(1)
  })

  it('clips note durations to a minimum', async () => {
    const file = makeMidiFile('test.mid')
    const song = await parseMidiFile(file)
    expect(song.notes.every((n) => n.duration >= 0.05)).toBe(true)
  })

  it('extracts tempo, key and time signature', async () => {
    const file = makeMidiFile('test.mid')
    const song = await parseMidiFile(file)
    expect(song.bpm).toBe(120)
    expect(song.keySignature).toBe('C Major')
    expect(song.timeSignature).toEqual([4, 4])
    expect(song.ppq).toBe(480)
  })
})

describe('parseMidiFile SATB layout', () => {
  afterEach(() => setTracks(null))

  it('puts Soprano+Alto on the treble clef and Tenor+Bass on the bass clef, with stem voices', async () => {
    setTracks([
      { name: 'Soprano', notes: [{ midi: 76, time: 0, duration: 1, velocity: 0.8, ticks: 0, durationTicks: 480 }] },
      { name: 'Alto', notes: [{ midi: 69, time: 0, duration: 1, velocity: 0.8, ticks: 0, durationTicks: 480 }] },
      { name: 'Tenor', notes: [{ midi: 64, time: 0, duration: 1, velocity: 0.8, ticks: 0, durationTicks: 480 }] },
      { name: 'Basse', notes: [{ midi: 43, time: 0, duration: 1, velocity: 0.8, ticks: 0, durationTicks: 480 }] },
    ])
    const song = await parseMidiFile(makeMidiFile('HyC011_monopiano.mid'))

    const byPitch = (midi: number) => song.notes.find((n) => n.midi === midi)!
    expect(byPitch(76)).toMatchObject({ hand: 'right', voice: 0 }) // Soprano
    expect(byPitch(69)).toMatchObject({ hand: 'right', voice: 1 }) // Alto
    expect(byPitch(64)).toMatchObject({ hand: 'left', voice: 0 }) // Tenor
    expect(byPitch(43)).toMatchObject({ hand: 'left', voice: 1 }) // Bass
  })

  it('falls back to the two-track heuristic when track names are not SATB parts', async () => {
    setTracks([
      { name: 'Piano right hand', notes: [{ midi: 60, time: 0, duration: 1, velocity: 0.8, ticks: 0, durationTicks: 480 }] },
      { name: 'Piano left hand', notes: [{ midi: 48, time: 0, duration: 1, velocity: 0.8, ticks: 0, durationTicks: 480 }] },
    ])
    const song = await parseMidiFile(makeMidiFile('test.mid'))
    expect(song.notes.every((n) => n.voice === undefined)).toBe(true)
    expect(song.notes.find((n) => n.midi === 60)?.hand).toBe('right')
    expect(song.notes.find((n) => n.midi === 48)?.hand).toBe('left')
  })
})
