import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { buildProgressMarkdown } from './progressExport'
import type { Profile, Song } from '../types'
import type { UserProgress } from '../hooks/useProgress'

const profile: Profile = { id: 'p1', name: 'Ada', type: 'adult', avatar: '🎹', createdAt: 0 }
const song: Song = { id: 'song-1', title: 'Für Elise', notes: [], duration: 60, bpm: 120 }
const generatedAt = new Date('2026-08-17T00:00:00Z')

function writeProgress(profileId: string, progress: UserProgress) {
  window.localStorage.setItem(`ks-piano-progress-${profileId}`, JSON.stringify(progress))
}

describe('buildProgressMarkdown', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(generatedAt)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('notes when there are no profiles at all', () => {
    const md = buildProgressMarkdown([], [], generatedAt)
    expect(md).toContain('No profiles have been created yet.')
  })

  it('notes when a profile has no recorded practice', () => {
    const md = buildProgressMarkdown([profile], [song], generatedAt)
    expect(md).toContain('🎹 Ada (adult)')
    expect(md).toContain('No practice recorded yet.')
  })

  it('renders level, streak, daily goal and per-song stars for a profile', () => {
    writeProgress('p1', {
      streakDays: 4,
      lastWorkoutCompletedDate: '2026-08-17',
      workoutsByDate: { '2026-08-17': 1 },
      totalPracticeSeconds: 600,
      totalXp: 150,
      songs: {
        'song-1': { songId: 'song-1', bestStars: 3, bestErrors: 0, timesCompleted: 2, lastPlayedAt: Date.parse('2026-08-16') },
      },
    })

    const md = buildProgressMarkdown([profile], [song], generatedAt)
    expect(md).toContain('**Level:** 2 (150 XP)')
    expect(md).toContain('**Streak:** 4 days')
    expect(md).toContain('Met ✅')
    expect(md).toContain('Für Elise')
    expect(md).toContain('★★★')
  })

  it('shows the daily goal as not met when no workout was completed today', () => {
    writeProgress('p1', {
      streakDays: 0,
      lastWorkoutCompletedDate: null,
      workoutsByDate: {},
      totalPracticeSeconds: 0,
      totalXp: 0,
      songs: {},
    })

    const md = buildProgressMarkdown([profile], [song], generatedAt)
    expect(md).toContain('Not met yet')
  })
})
