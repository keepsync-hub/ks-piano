import { describe, expect, it, vi } from 'vitest'
import type { NoteEvent } from '../types'

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
    tracks: { notes: NoteEvent[] }[] = []
    constructor(public buffer: ArrayBuffer) {
      this.tracks = [
        {
          notes: [
            { midi: 60, time: 0, duration: 1, velocity: 0.8, ticks: 0, durationTicks: 480, hand: 'right' },
            { midi: 64, time: 1, duration: 1, velocity: 0.8, ticks: 480, durationTicks: 480, hand: 'right' },
          ],
        },
        {
          notes: [
            { midi: 48, time: 0, duration: 2, velocity: 0.8, ticks: 0, durationTicks: 960, hand: 'left' },
          ],
        },
      ]
    }
  }
  return { Midi: MockMidi }
})

import { parseMidiFile } from './parser'

describe('parseMidiFile', () => {
  it('rejects non-MIDI files', async () => {
    const file = new File(['x'], 'song.txt', { type: 'text/plain' })
    await expect(parseMidiFile(file)).rejects.toThrow('Only .mid and .midi files are supported')
  })

  it('rejects corrupted MIDI files', async () => {
    vi.doMock('@tonejs/midi', () => ({
      Midi: class {
        constructor() {
          throw new Error('bad midi')
        }
      },
    }))
    const file = new File([new Uint8Array(10)], 'bad.mid', { type: 'audio/midi' })
    await expect(parseMidiFile(file)).rejects.toThrow('Could not parse MIDI file')
    vi.unmock('@tonejs/midi')
  })


  it('parses a two-track file into right and left hands', async () => {
    const file = new File([new Uint8Array(10)], 'test.mid', { type: 'audio/midi' })
    const song = await parseMidiFile(file)
    expect(song.title).toBe('test')
    expect(song.notes.length).toBe(3)
    expect(song.notes.filter((n) => n.hand === 'right').length).toBe(2)
    expect(song.notes.filter((n) => n.hand === 'left').length).toBe(1)
  })

  it('clips note durations to a minimum', async () => {
    const file = new File([new Uint8Array(10)], 'test.mid', { type: 'audio/midi' })
    const song = await parseMidiFile(file)
    expect(song.notes.every((n) => n.duration >= 0.05)).toBe(true)
  })

  it('extracts tempo, key and time signature', async () => {
    const file = new File([new Uint8Array(10)], 'test.mid', { type: 'audio/midi' })
    const song = await parseMidiFile(file)
    expect(song.bpm).toBe(120)
    expect(song.keySignature).toBe('C Major')
    expect(song.timeSignature).toEqual([4, 4])
    expect(song.ppq).toBe(480)
  })
})
