import { useCallback, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { levelForXp, xpForPracticeSeconds, xpForSongResult } from '../piano/xp'

export interface SongProgress {
  songId: string
  bestStars: number
  bestErrors: number
  timesCompleted: number
  lastPlayedAt: number
}

export interface UserProgress {
  streakDays: number
  /** Date a workout session was last completed; drives the streak. */
  lastWorkoutCompletedDate: string | null
  /** Number of workout sessions completed per day, keyed by "YYYY-MM-DD". */
  workoutsByDate: Record<string, number>
  totalPracticeSeconds: number
  totalXp: number
  songs: Record<string, SongProgress>
}

/** A mastered song that hasn't been played in this long is flagged for review. */
const REVIEW_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000

function defaultProgress(): UserProgress {
  return {
    streakDays: 0,
    lastWorkoutCompletedDate: null,
    workoutsByDate: {},
    totalPracticeSeconds: 0,
    totalXp: 0,
    songs: {},
  }
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayKey(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function applyXp(prev: UserProgress, amount: number): UserProgress {
  if (amount <= 0) return prev
  return { ...prev, totalXp: prev.totalXp + amount }
}

/** 0% errors -> 3 stars, up to 20% errors -> 2 stars, more than 20% errors -> 1 star (only completed runs earn stars at all). */
function starsForErrorRate(errorRate: number): number {
  if (errorRate <= 0) return 3
  if (errorRate <= 0.2) return 2
  return 1
}

/**
 * Tracks practice streaks, XP, per-song star ratings and daily-goal
 * completion for one profile. Persists to localStorage under a key
 * namespaced by profileId, so each profile on the same device keeps
 * independent progress.
 */
export function useProgress(profileId: string) {
  const [progress, setProgress] = useLocalStorage<UserProgress>(
    `ks-piano-progress-${profileId}`,
    defaultProgress(),
  )

  const recordPractice = useCallback(
    (seconds: number) => {
      setProgress((prev) =>
        applyXp({ ...prev, totalPracticeSeconds: prev.totalPracticeSeconds + seconds }, xpForPracticeSeconds(seconds)),
      )
    },
    [setProgress],
  )

  const recordSongResult = useCallback(
    (songId: string, errors: number, completed: boolean, totalNotes: number) => {
      setProgress((prev) => {
        const existing = prev.songs[songId]
        const errorRate = totalNotes > 0 ? errors / totalNotes : errors > 0 ? 1 : 0
        const stars = completed ? starsForErrorRate(errorRate) : 0
        const bestStars = Math.max(existing?.bestStars ?? 0, stars)
        const bestErrors = Math.min(existing?.bestErrors ?? Infinity, errors)

        const withSong: UserProgress = {
          ...prev,
          songs: {
            ...prev.songs,
            [songId]: {
              songId,
              bestStars,
              bestErrors,
              timesCompleted: (existing?.timesCompleted ?? 0) + (completed ? 1 : 0),
              lastPlayedAt: Date.now(),
            },
          },
        }

        return applyXp(withSong, xpForSongResult(stars, completed))
      })
    },
    [setProgress],
  )

  /** Call when a workout session (the "Start 5-Min Workout" flow) finishes, to credit the daily goal and streak. */
  const recordWorkoutCompleted = useCallback(() => {
    setProgress((prev) => {
      const today = todayKey()
      const workoutsByDate = { ...prev.workoutsByDate, [today]: (prev.workoutsByDate[today] ?? 0) + 1 }

      let streakDays = prev.streakDays
      let lastWorkoutCompletedDate = prev.lastWorkoutCompletedDate
      if (lastWorkoutCompletedDate !== today) {
        streakDays = lastWorkoutCompletedDate === yesterdayKey() ? streakDays + 1 : 1
        lastWorkoutCompletedDate = today
      }

      return { ...prev, workoutsByDate, streakDays, lastWorkoutCompletedDate }
    })
  }, [setProgress])

  const getSongProgress = useCallback(
    (songId: string): SongProgress | undefined => progress.songs[songId],
    [progress.songs],
  )

  const isDueForReview = useCallback(
    (songId: string): boolean => {
      const entry = progress.songs[songId]
      if (!entry || entry.bestStars === 0) return false
      return Date.now() - entry.lastPlayedAt > REVIEW_INTERVAL_MS
    },
    [progress.songs],
  )

  const stats = useMemo(() => {
    const level = levelForXp(progress.totalXp)
    const todayWorkouts = progress.workoutsByDate[todayKey()] ?? 0
    return {
      streakDays: progress.streakDays,
      totalPracticeMinutes: Math.round(progress.totalPracticeSeconds / 60),
      songsCompleted: Object.values(progress.songs).filter((s) => s.timesCompleted > 0).length,
      totalStars: Object.values(progress.songs).reduce((sum, s) => sum + s.bestStars, 0),
      totalXp: progress.totalXp,
      level: level.level,
      xpIntoLevel: level.xpIntoLevel,
      xpForNextLevel: level.xpForNextLevel,
      todayWorkouts,
      dailyGoalMet: todayWorkouts >= 1,
    }
  }, [progress])

  return {
    progress,
    recordPractice,
    recordSongResult,
    recordWorkoutCompleted,
    getSongProgress,
    isDueForReview,
    stats,
  }
}
