import { useCallback, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { defaultDailyGoalXp, levelForXp, xpForPracticeSeconds, xpForSongResult } from '../piano/xp'
import type { ProfileType } from '../types'

export interface SongProgress {
  songId: string
  bestStars: number
  bestErrors: number
  timesCompleted: number
  lastPlayedAt: number
}

export interface UserProgress {
  streakDays: number
  /** Date the daily XP goal was last met; drives the streak, à la Duolingo. */
  lastGoalMetDate: string | null
  totalPracticeSeconds: number
  totalXp: number
  dailyGoalXp: number
  /** XP earned per day, keyed by "YYYY-MM-DD". Only recent days matter in practice. */
  xpByDate: Record<string, number>
  songs: Record<string, SongProgress>
}

/** A mastered song that hasn't been played in this long is flagged for review. */
const REVIEW_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000

function defaultProgress(profileType: ProfileType): UserProgress {
  return {
    streakDays: 0,
    lastGoalMetDate: null,
    totalPracticeSeconds: 0,
    totalXp: 0,
    dailyGoalXp: defaultDailyGoalXp(profileType),
    xpByDate: {},
    songs: {},
  }
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayKey(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

/** Adds XP, updates today's tally, and bumps the streak if that clears the daily goal. */
function applyXp(prev: UserProgress, amount: number): UserProgress {
  if (amount <= 0) return prev

  const today = todayKey()
  const todayXp = (prev.xpByDate[today] ?? 0) + amount
  const xpByDate = { ...prev.xpByDate, [today]: todayXp }

  let streakDays = prev.streakDays
  let lastGoalMetDate = prev.lastGoalMetDate
  if (todayXp >= prev.dailyGoalXp && lastGoalMetDate !== today) {
    streakDays = lastGoalMetDate === yesterdayKey() ? streakDays + 1 : 1
    lastGoalMetDate = today
  }

  return { ...prev, totalXp: prev.totalXp + amount, xpByDate, streakDays, lastGoalMetDate }
}

/**
 * Tracks practice streaks, XP, per-song stats and daily goals for one
 * profile. Persists to localStorage under a key namespaced by profileId, so
 * each profile on the same device keeps independent progress.
 */
export function useProgress(profileId: string, profileType: ProfileType = 'adult') {
  const [progress, setProgress] = useLocalStorage<UserProgress>(
    `ks-piano-progress-${profileId}`,
    defaultProgress(profileType),
  )

  const recordPractice = useCallback(
    (seconds: number) => {
      setProgress((prev) => applyXp({ ...prev, totalPracticeSeconds: prev.totalPracticeSeconds + seconds }, xpForPracticeSeconds(seconds)))
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

  const setDailyGoalXp = useCallback(
    (xp: number) => {
      setProgress((prev) => ({ ...prev, dailyGoalXp: xp }))
    },
    [setProgress],
  )

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
    const todayXp = progress.xpByDate[todayKey()] ?? 0
    return {
      streakDays: progress.streakDays,
      totalPracticeMinutes: Math.round(progress.totalPracticeSeconds / 60),
      songsCompleted: Object.values(progress.songs).filter((s) => s.timesCompleted > 0).length,
      totalStars: Object.values(progress.songs).reduce((sum, s) => sum + s.bestStars, 0),
      totalXp: progress.totalXp,
      level: level.level,
      xpIntoLevel: level.xpIntoLevel,
      xpForNextLevel: level.xpForNextLevel,
      todayXp,
      dailyGoalXp: progress.dailyGoalXp,
      dailyGoalMet: todayXp >= progress.dailyGoalXp,
    }
  }, [progress])

  return { progress, recordPractice, recordSongResult, getSongProgress, isDueForReview, setDailyGoalXp, stats }
}
