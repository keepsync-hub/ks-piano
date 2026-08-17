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
    expect(result.current.stats.dailyGoalMet).toBe(false)
  })

  it('awards XP for practice time', () => {
    const { result } = renderHook(() => useProgress('p1'))
    act(() => {
      result.current.recordPractice(300)
    })
    expect(result.current.stats.totalXp).toBe(30)
  })

  it('meets the daily goal and starts a streak once a workout session is completed', () => {
    const { result } = renderHook(() => useProgress('p1'))
    expect(result.current.stats.dailyGoalMet).toBe(false)

    act(() => {
      result.current.recordWorkoutCompleted()
    })
    expect(result.current.stats.dailyGoalMet).toBe(true)
    expect(result.current.stats.streakDays).toBe(1)

    // A second workout the same day should not double-count the streak.
    act(() => {
      result.current.recordWorkoutCompleted()
    })
    expect(result.current.stats.streakDays).toBe(1)
    expect(result.current.stats.todayWorkouts).toBe(2)
  })

  it('extends the streak on the next consecutive day a workout is completed, and resets on a gap', () => {
    const { result } = renderHook(() => useProgress('p1'))
    act(() => {
      result.current.recordWorkoutCompleted()
    })
    expect(result.current.stats.streakDays).toBe(1)

    vi.setSystemTime(new Date(Date.now() + 24 * 60 * 60 * 1000))
    act(() => {
      result.current.recordWorkoutCompleted()
    })
    expect(result.current.stats.streakDays).toBe(2)
    expect(result.current.stats.dailyGoalMet).toBe(true)

    vi.setSystemTime(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000))
    act(() => {
      result.current.recordWorkoutCompleted()
    })
    expect(result.current.stats.streakDays).toBe(1)
  })

  it('does not meet the daily goal from practice or song results alone, only a completed workout', () => {
    const { result } = renderHook(() => useProgress('p1'))
    act(() => {
      result.current.recordPractice(300)
      result.current.recordSongResult('song-1', 0, true, 10)
    })
    expect(result.current.stats.dailyGoalMet).toBe(false)
    expect(result.current.stats.streakDays).toBe(0)
  })

  it('awards 3 stars for a perfect run', () => {
    const { result } = renderHook(() => useProgress('p1'))
    act(() => {
      result.current.recordSongResult('song-1', 0, true, 20)
    })
    expect(result.current.getSongProgress('song-1')?.bestStars).toBe(3)
    expect(result.current.stats.totalXp).toBe(40) // 3-star completion bonus
  })

  it('awards 2 stars for an error rate at or under 20%', () => {
    const { result } = renderHook(() => useProgress('p1'))
    act(() => {
      result.current.recordSongResult('song-1', 4, true, 20) // exactly 20% errors
    })
    expect(result.current.getSongProgress('song-1')?.bestStars).toBe(2)
  })

  it('awards only 1 star for an error rate over 20%', () => {
    const { result } = renderHook(() => useProgress('p1'))
    act(() => {
      result.current.recordSongResult('song-1', 5, true, 20) // 25% errors
    })
    expect(result.current.getSongProgress('song-1')?.bestStars).toBe(1)
  })

  it('awards no stars for an incomplete attempt', () => {
    const { result } = renderHook(() => useProgress('p1'))
    act(() => {
      result.current.recordSongResult('song-1', 10, false, 20)
    })
    expect(result.current.getSongProgress('song-1')?.bestStars).toBe(0)
  })

  it('tracks best stars and best errors across attempts', () => {
    const { result } = renderHook(() => useProgress('p1'))

    act(() => {
      result.current.recordSongResult('song-1', 0, true, 20)
    })
    expect(result.current.getSongProgress('song-1')?.bestStars).toBe(3)

    act(() => {
      result.current.recordSongResult('song-1', 6, true, 20)
    })
    // Best stars should stay at 3, but times completed still increments.
    expect(result.current.getSongProgress('song-1')?.bestStars).toBe(3)
    expect(result.current.getSongProgress('song-1')?.bestErrors).toBe(0)
    expect(result.current.getSongProgress('song-1')?.timesCompleted).toBe(2)
  })

  it('calculates total stars across songs', () => {
    const { result } = renderHook(() => useProgress('p1'))

    act(() => {
      result.current.recordSongResult('song-1', 0, true, 20)
      result.current.recordSongResult('song-2', 4, true, 20)
    })
    expect(result.current.stats.totalStars).toBe(5)
  })

  it('flags a mastered song as due for review only after it goes stale', () => {
    const { result } = renderHook(() => useProgress('p1'))
    act(() => {
      result.current.recordSongResult('song-1', 0, true, 20)
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
})
