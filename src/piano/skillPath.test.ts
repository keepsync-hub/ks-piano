import { describe, expect, it } from 'vitest'
import { buildSkillPath, maxAvailableTier } from './skillPath'
import type { NoteEvent, Song } from '../types'

function note(midi: number, time: number, hand: NoteEvent['hand'] = 'right'): NoteEvent {
  return { midi, time, duration: 0.4, velocity: 0.8, hand }
}

/** A trivial single-hand song, always tier 1. */
function easySong(id: string): Song {
  return { id, title: id, bpm: 70, duration: 4, notes: [note(60, 0), note(62, 1), note(64, 2)] }
}

/** A dense, wide-range, two-hand chordal song, always tier 5. */
function hardSong(id: string): Song {
  const notes: NoteEvent[] = []
  for (let beat = 0; beat < 32; beat++) {
    notes.push(note(48 + (beat % 36), beat * 0.15, 'right'))
    notes.push(note(36 + (beat % 12), beat * 0.15, 'left'))
    notes.push(note(39 + (beat % 12), beat * 0.15, 'left'))
    notes.push(note(43 + (beat % 12), beat * 0.15, 'left'))
  }
  return { id, title: id, bpm: 180, duration: 5, notes }
}

describe('maxAvailableTier', () => {
  it('caps child profiles below adult profiles', () => {
    expect(maxAvailableTier('child')).toBeLessThan(maxAvailableTier('adult'))
  })
})

describe('buildSkillPath', () => {
  it('always unlocks tier 1', () => {
    const tiers = buildSkillPath([easySong('a')], () => 0, 'adult')
    expect(tiers[0].unlocked).toBe(true)
  })

  it('locks a later tier until the previous one is mastered', () => {
    const songs = [easySong('a'), hardSong('b')]
    const tiers = buildSkillPath(songs, () => 0, 'adult')
    const tier5 = tiers.find((t) => t.tier === 5)
    expect(tier5?.unlocked).toBe(false)
  })

  it('unlocks the next tier once the average stars clear the threshold', () => {
    const songs = [easySong('a'), hardSong('b')]
    const stars: Record<string, number> = { a: 3, b: 0 }
    const tiers = buildSkillPath(songs, (id) => stars[id] ?? 0, 'adult')
    const tier5 = tiers.find((t) => t.tier === 5)
    expect(tier5?.unlocked).toBe(true)
  })

  it('excludes tiers above what the profile type allows', () => {
    const songs = [easySong('a'), hardSong('b')]
    const tiers = buildSkillPath(songs, () => 3, 'child')
    expect(tiers.every((t) => t.tier <= maxAvailableTier('child'))).toBe(true)
    expect(tiers.some((t) => t.songs.some((s) => s.id === 'b'))).toBe(false)
  })

  it('does not let an empty intermediate tier block progression', () => {
    // Only tier-1 and tier-5 songs exist; tiers 2-4 are empty and should not
    // permanently lock tier 5 out just because they have nothing to master.
    const songs = [easySong('a'), hardSong('b')]
    const tiers = buildSkillPath(songs, () => 3, 'adult')
    const tier5 = tiers.find((t) => t.tier === 5)
    expect(tier5?.unlocked).toBe(true)
  })
})
