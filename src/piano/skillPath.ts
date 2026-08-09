import type { ProfileType } from '../types'
import type { Song } from '../types'
import { difficultyTier, DIFFICULTY_LABELS, type DifficultyTier } from './difficulty'

/** Minimum average stars on a tier's songs required to unlock the next one. */
const UNLOCK_STARS_THRESHOLD = 1.5

/** Kid profiles start with a smaller, curated slice of the library. */
const MAX_TIER_BY_PROFILE: Record<ProfileType, DifficultyTier> = {
  child: 3,
  adult: 5,
}

export interface SkillTier {
  tier: DifficultyTier
  label: string
  songs: Song[]
  /** True once the previous tier has been practised well enough (tier 1 is always unlocked). */
  unlocked: boolean
  averageStars: number
}

export function maxAvailableTier(profileType: ProfileType): DifficultyTier {
  return MAX_TIER_BY_PROFILE[profileType]
}

/**
 * Groups songs into difficulty tiers (à la Duolingo units) and marks which
 * ones are unlocked. A tier unlocks once the previous one's average star
 * rating clears UNLOCK_STARS_THRESHOLD; profiles cap out at their allowed
 * complexity, so a child profile never sees tier 4-5 material even mastered.
 */
export function buildSkillPath(
  songs: Song[],
  bestStarsFor: (songId: string) => number,
  profileType: ProfileType,
): SkillTier[] {
  const cap = maxAvailableTier(profileType)
  const byTier = new Map<DifficultyTier, Song[]>()
  for (const song of songs) {
    const tier = difficultyTier(song)
    if (tier > cap) continue
    const list = byTier.get(tier) ?? []
    list.push(song)
    byTier.set(tier, list)
  }

  const tiers: SkillTier[] = []
  // Tier 1 is always unlocked; an empty tier neither blocks nor unlocks the next one.
  let progressUnlocked: boolean = true

  for (let tier = 1; tier <= cap; tier++) {
    const tierSongs = byTier.get(tier as DifficultyTier) ?? []
    const starsInTier = tierSongs.map((s) => bestStarsFor(s.id))
    const averageStars = starsInTier.length > 0 ? starsInTier.reduce((a, b) => a + b, 0) / starsInTier.length : 0
    const unlocked: boolean = progressUnlocked

    tiers.push({
      tier: tier as DifficultyTier,
      label: DIFFICULTY_LABELS[tier as DifficultyTier],
      songs: tierSongs,
      unlocked,
      averageStars,
    })

    progressUnlocked = unlocked && (tierSongs.length === 0 || averageStars >= UNLOCK_STARS_THRESHOLD)
  }

  return tiers.filter((t) => t.songs.length > 0 || t.tier === 1)
}
