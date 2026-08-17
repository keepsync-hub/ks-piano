import { describe, expect, it } from 'vitest'
import { levelForXp, xpForPracticeSeconds, xpForSongResult } from './xp'

describe('xpForPracticeSeconds', () => {
  it('awards one XP per ten seconds', () => {
    expect(xpForPracticeSeconds(300)).toBe(30)
    expect(xpForPracticeSeconds(0)).toBe(0)
  })

  it('never goes negative', () => {
    expect(xpForPracticeSeconds(-50)).toBe(0)
  })
})

describe('xpForSongResult', () => {
  it('scales with star rating when completed', () => {
    expect(xpForSongResult(0, true)).toBe(10)
    expect(xpForSongResult(1, true)).toBe(20)
    expect(xpForSongResult(2, true)).toBe(30)
    expect(xpForSongResult(3, true)).toBe(40)
  })

  it('gives no bonus for an incomplete attempt', () => {
    expect(xpForSongResult(3, false)).toBe(0)
  })

  it('clamps out-of-range star values', () => {
    expect(xpForSongResult(9, true)).toBe(40)
    expect(xpForSongResult(-1, true)).toBe(10)
  })
})

describe('levelForXp', () => {
  it('starts at level 1 with zero XP', () => {
    expect(levelForXp(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForNextLevel: 100 })
  })

  it('advances a level every 100 XP', () => {
    expect(levelForXp(99)).toEqual({ level: 1, xpIntoLevel: 99, xpForNextLevel: 100 })
    expect(levelForXp(100)).toEqual({ level: 2, xpIntoLevel: 0, xpForNextLevel: 100 })
    expect(levelForXp(250)).toEqual({ level: 3, xpIntoLevel: 50, xpForNextLevel: 100 })
  })
})
