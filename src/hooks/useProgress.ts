import { useCallback, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'

export interface SongProgress {
  songId: string
  bestStars: number
  bestErrors: number
  timesCompleted: number
  lastPlayedAt: number
}

export interface UserProgress {
  streakDays: number
  lastPracticeDate: string | null
  totalPracticeSeconds: number
  songs: Record<string, SongProgress>
}

const DEFAULT_PROGRESS: UserProgress = {
  streakDays: 0,
  lastPracticeDate: null,
  totalPracticeSeconds: 0,
  songs: {},
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayKey(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

/**
 * Tracks practice streaks, per-song stats and total practice time.
 * Persists to localStorage under the key "ks-piano-progress".
 */
export function useProgress() {
  const [progress, setProgress] = useLocalStorage<UserProgress>('ks-piano-progress', DEFAULT_PROGRESS)

  const recordPractice = useCallback(
    (seconds: number) => {
      setProgress((prev) => {
        const today = todayKey()
        const yesterday = yesterdayKey()
        let streak = prev.streakDays

        if (prev.lastPracticeDate === today) {
          // Already practised today; keep streak as-is.
        } else if (prev.lastPracticeDate === yesterday) {
          streak += 1
        } else if (prev.lastPracticeDate !== today) {
          streak = 1
        }

        return {
          ...prev,
          streakDays: streak,
          lastPracticeDate: today,
          totalPracticeSeconds: prev.totalPracticeSeconds + seconds,
        }
      })
    },
    [setProgress],
  )

  const recordSongResult = useCallback(
    (songId: string, errors: number, completed: boolean) => {
      setProgress((prev) => {
        const existing = prev.songs[songId]
        const stars = completed ? (errors === 0 ? 3 : errors <= 3 ? 2 : errors <= 6 ? 1 : 0) : 0
        const bestStars = Math.max(existing?.bestStars ?? 0, stars)
        const bestErrors = Math.min(existing?.bestErrors ?? Infinity, errors)

        return {
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
      })
    },
    [setProgress],
  )

  const getSongProgress = useCallback(
    (songId: string): SongProgress | undefined => progress.songs[songId],
    [progress.songs],
  )

  const stats = useMemo(
    () => ({
      streakDays: progress.streakDays,
      totalPracticeMinutes: Math.round(progress.totalPracticeSeconds / 60),
      songsCompleted: Object.values(progress.songs).filter((s) => s.timesCompleted > 0).length,
      totalStars: Object.values(progress.songs).reduce((sum, s) => sum + s.bestStars, 0),
    }),
    [progress],
  )

  return { progress, recordPractice, recordSongResult, getSongProgress, stats }
}
