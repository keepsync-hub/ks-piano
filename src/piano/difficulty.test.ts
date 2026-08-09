import { describe, expect, it } from 'vitest'
import { difficultyTier, scoreDifficulty } from './difficulty'
import type { NoteEvent, Song } from '../types'

function note(midi: number, time: number, hand: NoteEvent['hand'] = 'right'): NoteEvent {
  return { midi, time, duration: 0.4, velocity: 0.8, hand }
}

function song(overrides: Partial<Song> & Pick<Song, 'notes' | 'duration'>): Song {
  return { id: 's', title: 't', bpm: 90, ...overrides }
}

describe('scoreDifficulty', () => {
  it('is zero for a song with no notes', () => {
    expect(scoreDifficulty(song({ notes: [], duration: 1 }))).toBe(0)
  })

  it('scores a slow single-hand single-note-at-a-time song very low', () => {
    const s = song({
      notes: [note(60, 0), note(62, 1), note(64, 2), note(65, 3)],
      duration: 4,
      bpm: 70,
    })
    expect(scoreDifficulty(s)).toBeLessThan(20)
  })

  it('scores higher for a fast, wide-range, two-hand chordal song', () => {
    const notes: NoteEvent[] = []
    for (let beat = 0; beat < 16; beat++) {
      notes.push(note(60 + (beat % 24), beat * 0.25, 'right'))
      notes.push(note(40 + (beat % 12), beat * 0.25, 'left'))
      notes.push(note(43 + (beat % 12), beat * 0.25, 'left')) // simultaneous left-hand chord
    }
    const s = song({ notes, duration: 4, bpm: 160 })
    expect(scoreDifficulty(s)).toBeGreaterThan(60)
  })

  it('increases with note density, all else equal', () => {
    const sparse = song({ notes: [note(60, 0), note(62, 2)], duration: 4 })
    const dense = song({
      notes: Array.from({ length: 20 }, (_, i) => note(60, i * 0.2)),
      duration: 4,
    })
    expect(scoreDifficulty(dense)).toBeGreaterThan(scoreDifficulty(sparse))
  })
})

describe('difficultyTier', () => {
  it('maps a trivial song to tier 1', () => {
    const s = song({ notes: [note(60, 0), note(62, 1)], duration: 2, bpm: 60 })
    expect(difficultyTier(s)).toBe(1)
  })

  it('maps a demanding song to tier 5', () => {
    const notes: NoteEvent[] = []
    for (let beat = 0; beat < 32; beat++) {
      notes.push(note(48 + (beat % 36), beat * 0.15, 'right'))
      notes.push(note(36 + (beat % 12), beat * 0.15, 'left'))
      notes.push(note(39 + (beat % 12), beat * 0.15, 'left'))
      notes.push(note(43 + (beat % 12), beat * 0.15, 'left'))
    }
    const s = song({ notes, duration: 5, bpm: 180 })
    expect(difficultyTier(s)).toBe(5)
  })

  it('never returns a tier outside 1-5', () => {
    const s = song({ notes: [note(60, 0)], duration: 1 })
    const tier = difficultyTier(s)
    expect(tier).toBeGreaterThanOrEqual(1)
    expect(tier).toBeLessThanOrEqual(5)
  })
})
