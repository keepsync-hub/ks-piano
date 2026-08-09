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

  it('starts with zero streak and empty songs', () => {
    const { result } = renderHook(() => useProgress())
    expect(result.current.stats.streakDays).toBe(0)
    expect(result.current.stats.songsCompleted).toBe(0)
  })

  it('records practice and increments streak on consecutive days', () => {
    const { result } = renderHook(() => useProgress())

    act(() => {
      result.current.recordPractice(300)
    })
    expect(result.current.stats.streakDays).toBe(1)

    // Move to next day
    vi.setSystemTime(new Date(Date.now() + 24 * 60 * 60 * 1000))
    act(() => {
      result.current.recordPractice(300)
    })
    expect(result.current.stats.streakDays).toBe(2)
  })

  it('resets streak when a day is skipped', () => {
    const { result } = renderHook(() => useProgress())

    act(() => {
      result.current.recordPractice(300)
    })
    expect(result.current.stats.streakDays).toBe(1)

    // Skip two days
    vi.setSystemTime(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000))
    act(() => {
      result.current.recordPractice(300)
    })
    expect(result.current.stats.streakDays).toBe(1)
  })

  it('records song results with star ratings', () => {
    const { result } = renderHook(() => useProgress())

    act(() => {
      result.current.recordSongResult('song-1', 0, true)
    })
    expect(result.current.getSongProgress('song-1')?.bestStars).toBe(3)

    act(() => {
      result.current.recordSongResult('song-1', 2, true)
    })
    // Best stars should stay at 3
    expect(result.current.getSongProgress('song-1')?.bestStars).toBe(3)
    expect(result.current.getSongProgress('song-1')?.bestErrors).toBe(0)
    expect(result.current.getSongProgress('song-1')?.timesCompleted).toBe(2)
  })

  it('calculates total stars across songs', () => {
    const { result } = renderHook(() => useProgress())

    act(() => {
      result.current.recordSongResult('song-1', 0, true)
      result.current.recordSongResult('song-2', 2, true)
    })
    expect(result.current.stats.totalStars).toBe(5)
  })
})
