import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useProgress } from './useProgress'

describe('useProgress', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with zero streak, level 1 and an empty song list', () => {
    const { result } = renderHook(() => useProgress('p1'))
    expect(result.current.stats.streakDays).toBe(0)
    expect(result.current.stats.songsCompleted).toBe(0)
    expect(result.current.stats.level).toBe(1)
    expect(result.current.stats.totalXp).toBe(0)
  })

  it('gives a child profile a lower default daily goal than an adult profile', () => {
    const child = renderHook(() => useProgress('kid', 'child'))
    const adult = renderHook(() => useProgress('grownup', 'adult'))
    expect(child.result.current.stats.dailyGoalXp).toBeLessThan(adult.result.current.stats.dailyGoalXp)
  })

  it('awards XP for practice time', () => {
    const { result } = renderHook(() => useProgress('p1'))
    act(() => {
      result.current.recordPractice(300)
    })
    expect(result.current.stats.totalXp).toBe(30)
    expect(result.current.stats.todayXp).toBe(30)
  })

  it('increments the streak only once the daily goal is met', () => {
    const { result } = renderHook(() => useProgress('p1', 'adult'))
    // Adult default daily goal is 20 XP; 5 minutes of practice = 30 XP, so it clears in one go.
    act(() => {
      result.current.recordPractice(50) // 5 XP, below goal
    })
    expect(result.current.stats.streakDays).toBe(0)

    act(() => {
      result.current.recordPractice(300) // +30 XP, now well past the goal
    })
    expect(result.current.stats.dailyGoalMet).toBe(true)
    expect(result.current.stats.streakDays).toBe(1)

    // A second practice the same day should not double-count the streak.
    act(() => {
      result.current.recordPractice(300)
    })
    expect(result.current.stats.streakDays).toBe(1)
  })

  it('extends the streak on the next consecutive day the goal is met, and resets on a gap', () => {
    const { result } = renderHook(() => useProgress('p1', 'adult'))
    act(() => {
      result.current.recordPractice(300)
    })
    expect(result.current.stats.streakDays).toBe(1)

    vi.setSystemTime(new Date(Date.now() + 24 * 60 * 60 * 1000))
    act(() => {
      result.current.recordPractice(300)
    })
    expect(result.current.stats.streakDays).toBe(2)

    vi.setSystemTime(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000))
    act(() => {
      result.current.recordPractice(300)
    })
    expect(result.current.stats.streakDays).toBe(1)
  })

  it('records song results with star ratings and awards completion XP', () => {
    const { result } = renderHook(() => useProgress('p1'))

    act(() => {
      result.current.recordSongResult('song-1', 0, true)
    })
    expect(result.current.getSongProgress('song-1')?.bestStars).toBe(3)
    expect(result.current.stats.totalXp).toBe(40) // 3-star completion bonus

    act(() => {
      result.current.recordSongResult('song-1', 2, true)
    })
    // Best stars should stay at 3
    expect(result.current.getSongProgress('song-1')?.bestStars).toBe(3)
    expect(result.current.getSongProgress('song-1')?.bestErrors).toBe(0)
    expect(result.current.getSongProgress('song-1')?.timesCompleted).toBe(2)
  })

  it('calculates total stars across songs', () => {
    const { result } = renderHook(() => useProgress('p1'))

    act(() => {
      result.current.recordSongResult('song-1', 0, true)
      result.current.recordSongResult('song-2', 2, true)
    })
    expect(result.current.stats.totalStars).toBe(5)
  })

  it('flags a mastered song as due for review only after it goes stale', () => {
    const { result } = renderHook(() => useProgress('p1'))
    act(() => {
      result.current.recordSongResult('song-1', 0, true)
    })
    expect(result.current.isDueForReview('song-1')).toBe(false)

    vi.setSystemTime(new Date(Date.now() + 4 * 24 * 60 * 60 * 1000))
    expect(result.current.isDueForReview('song-1')).toBe(true)
  })

  it('never flags a song that was never completed', () => {
    const { result } = renderHook(() => useProgress('p1'))
    expect(result.current.isDueForReview('never-played')).toBe(false)
  })

  it('keeps separate progress per profile id', () => {
    const a = renderHook(() => useProgress('profile-a'))
    const b = renderHook(() => useProgress('profile-b'))

    act(() => {
      a.result.current.recordPractice(300)
    })
    expect(a.result.current.stats.totalXp).toBe(30)
    expect(b.result.current.stats.totalXp).toBe(0)
  })

  it('allows changing the daily goal', () => {
    const { result } = renderHook(() => useProgress('p1', 'child'))
    act(() => {
      result.current.setDailyGoalXp(50)
    })
    expect(result.current.stats.dailyGoalXp).toBe(50)
  })
})
