import { describe, expect, it } from 'vitest'
import type { NoteEvent, Song } from '../types'
import { withSuggestedFingering } from './fingering'

function makeSong(notes: NoteEvent[]): Song {
  return {
    id: 'test',
    title: 'Test',
    notes,
    duration: notes.length ? Math.max(...notes.map((n) => n.time + n.duration)) : 0,
    bpm: 120,
  }
}

describe('withSuggestedFingering', () => {
  it('assigns fingers to single melodic right-hand notes', () => {
    const song = makeSong([
      { midi: 60, time: 0, duration: 0.5, velocity: 0.8, hand: 'right' },
      { midi: 62, time: 0.5, duration: 0.5, velocity: 0.8, hand: 'right' },
      { midi: 64, time: 1, duration: 0.5, velocity: 0.8, hand: 'right' },
    ])
    const result = withSuggestedFingering(song)
    expect(result.notes.every((n) => n.finger !== undefined)).toBe(true)
  })

  it('assigns fingers to chords', () => {
    const song = makeSong([
      { midi: 60, time: 0, duration: 1, velocity: 0.8, hand: 'right' },
      { midi: 64, time: 0, duration: 1, velocity: 0.8, hand: 'right' },
      { midi: 67, time: 0, duration: 1, velocity: 0.8, hand: 'right' },
    ])
    const result = withSuggestedFingering(song)
    const fingers = result.notes.map((n) => n.finger).sort((a, b) => (a ?? 0) - (b ?? 0))
    expect(fingers).toEqual([1, 3, 5])
  })

  it('resets after a long rest', () => {
    const song = makeSong([
      { midi: 60, time: 0, duration: 0.5, velocity: 0.8, hand: 'right' },
      { midi: 72, time: 2, duration: 0.5, velocity: 0.8, hand: 'right' },
    ])
    const result = withSuggestedFingering(song)
    // After a long rest, the hand resets to thumb on the first note.
    expect(result.notes[0].finger).toBe(1)
    expect(result.notes[1].finger).toBe(1)
  })

  it('preserves left/right separation', () => {
    const song = makeSong([
      { midi: 48, time: 0, duration: 1, velocity: 0.8, hand: 'left' },
      { midi: 60, time: 0, duration: 1, velocity: 0.8, hand: 'right' },
    ])
    const result = withSuggestedFingering(song)
    const left = result.notes.find((n) => n.hand === 'left')
    const right = result.notes.find((n) => n.hand === 'right')
    expect(left?.finger).toBe(5)
    expect(right?.finger).toBe(1)
  })
})
