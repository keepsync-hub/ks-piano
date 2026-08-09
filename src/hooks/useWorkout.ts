import { useCallback, useEffect, useRef, useState } from 'react'
import type { Song } from '../types'

export interface WorkoutStats {
  notesPlayed: number
  errors: number
  accuracy: number
  songsCompleted: number
}

export type WorkoutPhase = 'idle' | 'active' | 'finished'

const WORKOUT_DURATION_SECONDS = 5 * 60 // 5 minutes

/**
 * Manages a 5-minute workout session: picks random songs, tracks time and stats.
 */
export function useWorkout(songs: Song[], onLoadSong: (song: Song) => void, onSetMode: (mode: 'practice') => void) {
  const [phase, setPhase] = useState<WorkoutPhase>('idle')
  const [timeLeft, setTimeLeft] = useState(WORKOUT_DURATION_SECONDS)
  const [stats, setStats] = useState<WorkoutStats>({ notesPlayed: 0, errors: 0, accuracy: 100, songsCompleted: 0 })
  const [currentSongId, setCurrentSongId] = useState<string | null>(null)

  const timerRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const statsRef = useRef<WorkoutStats>({ notesPlayed: 0, errors: 0, accuracy: 100, songsCompleted: 0 })

  const pickRandomSong = useCallback((): Song | null => {
    if (songs.length === 0) return null
    const available = songs.filter((s) => s.id !== currentSongId)
    const pool = available.length > 0 ? available : songs
    return pool[Math.floor(Math.random() * pool.length)]
  }, [songs, currentSongId])

  const startWorkout = useCallback(() => {
    const song = pickRandomSong()
    if (!song) return

    setPhase('active')
    setTimeLeft(WORKOUT_DURATION_SECONDS)
    statsRef.current = { notesPlayed: 0, errors: 0, accuracy: 100, songsCompleted: 0 }
    setStats(statsRef.current)
    setCurrentSongId(song.id)
    startTimeRef.current = Date.now()

    onLoadSong(song)
    onSetMode('practice')

    timerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
      const remaining = Math.max(0, WORKOUT_DURATION_SECONDS - elapsed)
      setTimeLeft(remaining)

      if (remaining <= 0) {
        if (timerRef.current) window.clearInterval(timerRef.current)
        setPhase('finished')
      }
    }, 1000)
  }, [pickRandomSong, onLoadSong, onSetMode])

  const stopWorkout = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    setPhase('idle')
    setTimeLeft(WORKOUT_DURATION_SECONDS)
  }, [])

  const nextSong = useCallback(() => {
    const song = pickRandomSong()
    if (!song) return
    setCurrentSongId(song.id)
    onLoadSong(song)
    onSetMode('practice')
  }, [pickRandomSong, onLoadSong, onSetMode])

  const recordNote = useCallback((correct: boolean) => {
    statsRef.current.notesPlayed += 1
    if (!correct) statsRef.current.errors += 1
    statsRef.current.accuracy =
      statsRef.current.notesPlayed > 0
        ? Math.round(((statsRef.current.notesPlayed - statsRef.current.errors) / statsRef.current.notesPlayed) * 100)
        : 100
    setStats({ ...statsRef.current })
  }, [])

  const recordSongComplete = useCallback(() => {
    statsRef.current.songsCompleted += 1
    setStats({ ...statsRef.current })
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [])

  const formatTime = useCallback((seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }, [])

  return {
    phase,
    timeLeft,
    formattedTimeLeft: formatTime(timeLeft),
    stats,
    startWorkout,
    stopWorkout,
    nextSong,
    recordNote,
    recordSongComplete,
  }
}
