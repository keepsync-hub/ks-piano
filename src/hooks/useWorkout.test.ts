import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWorkout } from './useWorkout'
import type { Song } from '../types'

const mockSong: Song = {
  id: 'test-song',
  title: 'Test Song',
  notes: [],
  duration: 60,
  bpm: 120,
}

const mockSongs: Song[] = [
  mockSong,
  { ...mockSong, id: 'song-2', title: 'Song 2' },
  { ...mockSong, id: 'song-3', title: 'Song 3' },
]

describe('useWorkout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts in idle phase', () => {
    const onLoadSong = vi.fn()
    const onSetMode = vi.fn()
    const { result } = renderHook(() => useWorkout(mockSongs, onLoadSong, onSetMode))
    expect(result.current.phase).toBe('idle')
    expect(result.current.timeLeft).toBe(300)
  })

  it('starts workout and picks a random song', () => {
    const onLoadSong = vi.fn()
    const onSetMode = vi.fn()
    const { result } = renderHook(() => useWorkout(mockSongs, onLoadSong, onSetMode))

    act(() => {
      result.current.startWorkout()
    })

    expect(result.current.phase).toBe('active')
    expect(onLoadSong).toHaveBeenCalled()
    expect(onSetMode).toHaveBeenCalledWith('practice')
  })

  it('counts down time', () => {
    const onLoadSong = vi.fn()
    const onSetMode = vi.fn()
    const { result } = renderHook(() => useWorkout(mockSongs, onLoadSong, onSetMode))

    act(() => {
      result.current.startWorkout()
    })

    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(result.current.timeLeft).toBe(290)
  })

  it('finishes when time runs out', () => {
    const onLoadSong = vi.fn()
    const onSetMode = vi.fn()
    const { result } = renderHook(() => useWorkout(mockSongs, onLoadSong, onSetMode))

    act(() => {
      result.current.startWorkout()
    })

    act(() => {
      vi.advanceTimersByTime(300000)
    })

    expect(result.current.phase).toBe('finished')
    expect(result.current.timeLeft).toBe(0)
  })

  it('tracks notes and errors', () => {
    const onLoadSong = vi.fn()
    const onSetMode = vi.fn()
    const { result } = renderHook(() => useWorkout(mockSongs, onLoadSong, onSetMode))

    act(() => {
      result.current.startWorkout()
    })

    act(() => {
      result.current.recordNote(true)
      result.current.recordNote(true)
      result.current.recordNote(false)
    })

    expect(result.current.stats.notesPlayed).toBe(3)
    expect(result.current.stats.errors).toBe(1)
    expect(result.current.stats.accuracy).toBe(67)
  })

  it('stops workout manually', () => {
    const onLoadSong = vi.fn()
    const onSetMode = vi.fn()
    const { result } = renderHook(() => useWorkout(mockSongs, onLoadSong, onSetMode))

    act(() => {
      result.current.startWorkout()
    })

    act(() => {
      result.current.stopWorkout()
    })

    expect(result.current.phase).toBe('idle')
    expect(result.current.timeLeft).toBe(300)
  })

  it('loads next song', () => {
    const onLoadSong = vi.fn()
    const onSetMode = vi.fn()
    const { result } = renderHook(() => useWorkout(mockSongs, onLoadSong, onSetMode))

    act(() => {
      result.current.startWorkout()
    })

    onLoadSong.mockClear()
    act(() => {
      result.current.nextSong()
    })

    expect(onLoadSong).toHaveBeenCalled()
  })
})
