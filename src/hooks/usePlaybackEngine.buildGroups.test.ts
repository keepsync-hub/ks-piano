import { describe, expect, it } from 'vitest'
import type { NoteEvent } from '../types'
import { buildGroups } from './usePlaybackEngine'

function note(midi: number, time: number): NoteEvent {
  return { midi, time, duration: 0.5, velocity: 0.8, hand: 'right' }
}

describe('buildGroups', () => {
  it('groups simultaneous notes together', () => {
    const notes = [note(60, 0), note(64, 0), note(67, 0), note(62, 1)]
    const groups = buildGroups(notes)
    expect(groups.length).toBe(2)
    expect(groups[0].notes.map((n) => n.midi)).toEqual([60, 64, 67])
    expect(groups[1].notes.map((n) => n.midi)).toEqual([62])
  })

  it('respects the grouping epsilon', () => {
    const notes = [note(60, 0), note(62, 0.04), note(64, 0.2)]
    const groups = buildGroups(notes)
    expect(groups.length).toBe(2)
    expect(groups[0].notes.length).toBe(2)
    expect(groups[1].notes.length).toBe(1)
  })

  it('sorts notes by time before grouping', () => {
    const notes = [note(62, 1), note(60, 0)]
    const groups = buildGroups(notes)
    expect(groups[0].time).toBe(0)
    expect(groups[1].time).toBe(1)
  })

  it('returns empty array for no notes', () => {
    expect(buildGroups([])).toEqual([])
  })
})
