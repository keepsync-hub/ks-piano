import { describe, expect, it } from 'vitest'
import { HIMNARIO_GRANDE_SONGS } from './himnarioGrande'
import { difficultyTier } from '../piano/difficulty'

describe('HIMNARIO_GRANDE_SONGS', () => {
  it('is non-empty and every song has playable, well-formed data', () => {
    expect(HIMNARIO_GRANDE_SONGS.length).toBeGreaterThan(0)
    for (const song of HIMNARIO_GRANDE_SONGS) {
      expect(song.notes.length).toBeGreaterThan(0)
      expect(song.bpm).toBeGreaterThan(0)
      expect(song.duration).toBeGreaterThan(0)
      expect(song.ppq).toBeGreaterThan(0)
      expect(song.timeSignature).toBeDefined()
    }
  })

  it('has unique ids', () => {
    const ids = HIMNARIO_GRANDE_SONGS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('assigns Soprano+Alto to the treble clef (voice 0/1) and Tenor+Bass to the bass clef', () => {
    for (const song of HIMNARIO_GRANDE_SONGS) {
      expect(song.notes.every((n) => n.voice === 0 || n.voice === 1)).toBe(true)
      expect(song.notes.some((n) => n.hand === 'right')).toBe(true)
      expect(song.notes.some((n) => n.hand === 'left')).toBe(true)
    }
  })

  it('lands the HyC-011 reference hymn in Tier 1, as specified when the hymnal was added', () => {
    const hyc011 = HIMNARIO_GRANDE_SONGS.find((s) => s.id === 'hyc-011')
    expect(hyc011).toBeDefined()
    expect(difficultyTier(hyc011!)).toBe(1)
  })
})
