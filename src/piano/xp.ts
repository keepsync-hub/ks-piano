/**
 * XP and levelling, in the spirit of Duolingo's per-lesson XP and crown levels
 * but adapted to piano practice: time-on-task earns a steady trickle of XP,
 * and finishing a song earns a bonus scaled by how clean the run was.
 */

/** XP per second of practice, i.e. one XP every 10 seconds played. */
const XP_PER_PRACTICE_SECOND = 1 / 10

/** Bonus XP for completing a song, indexed by star rating (0-3). */
const SONG_COMPLETION_XP = [10, 20, 30, 40]

/** Flat XP for starting the practice loop, even before finishing a song. */
export const XP_PER_LEVEL = 100

export interface DailyGoalPreset {
  id: 'casual' | 'regular' | 'serious' | 'intense'
  label: string
  xp: number
}

/** Mirrors Duolingo's four daily-goal tiers, renamed for a practice context. */
export const DAILY_GOAL_PRESETS: DailyGoalPreset[] = [
  { id: 'casual', label: 'Casual — 5 min', xp: 10 },
  { id: 'regular', label: 'Regular — 10 min', xp: 20 },
  { id: 'serious', label: 'Serious — 15 min', xp: 30 },
  { id: 'intense', label: 'Intense — 25 min', xp: 50 },
]

export function xpForPracticeSeconds(seconds: number): number {
  return Math.round(Math.max(0, seconds) * XP_PER_PRACTICE_SECOND)
}

export function xpForSongResult(stars: number, completed: boolean): number {
  if (!completed) return 0
  const clamped = Math.min(Math.max(Math.round(stars), 0), SONG_COMPLETION_XP.length - 1)
  return SONG_COMPLETION_XP[clamped]
}

export interface LevelInfo {
  level: number
  xpIntoLevel: number
  xpForNextLevel: number
}

/** Flat 100 XP per level — simple and predictable, unlike Duolingo's crown curve. */
export function levelForXp(totalXp: number): LevelInfo {
  const safeXp = Math.max(0, totalXp)
  return {
    level: Math.floor(safeXp / XP_PER_LEVEL) + 1,
    xpIntoLevel: safeXp % XP_PER_LEVEL,
    xpForNextLevel: XP_PER_LEVEL,
  }
}

export function defaultDailyGoalXp(profileType: 'child' | 'adult'): number {
  return profileType === 'child' ? DAILY_GOAL_PRESETS[0].xp : DAILY_GOAL_PRESETS[1].xp
}
