import type { Profile, Song } from '../types'
import { todayKey, type UserProgress } from '../hooks/useProgress'
import { levelForXp } from './xp'

function readProgressForProfile(profileId: string): UserProgress | null {
  try {
    const raw = window.localStorage.getItem(`ks-piano-progress-${profileId}`)
    return raw ? (JSON.parse(raw) as UserProgress) : null
  } catch {
    return null
  }
}

function starGlyphs(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars)
}

/**
 * Renders every profile's practice progress — level, streak, today's daily
 * goal, and per-song star ratings — as a single Markdown document. Used by
 * the "Export progress (.md)" option to produce a file the user can save
 * into the repo, since a browser app has no direct filesystem access.
 */
export function buildProgressMarkdown(profiles: Profile[], songs: Song[], generatedAt: Date = new Date()): string {
  const songTitleById = new Map(songs.map((s) => [s.id, s.title] as const))
  const lines: string[] = ['# ks-piano practice progress', '', `_Generated ${generatedAt.toISOString()}_`, '']

  if (profiles.length === 0) {
    lines.push('_No profiles have been created yet._')
    return lines.join('\n')
  }

  for (const profile of profiles) {
    const progress = readProgressForProfile(profile.id)
    lines.push(`## ${profile.avatar} ${profile.name} (${profile.type})`, '')

    if (!progress) {
      lines.push('_No practice recorded yet._', '')
      continue
    }

    const level = levelForXp(progress.totalXp)
    const todayWorkouts = progress.workoutsByDate[todayKey()] ?? 0
    lines.push(`- **Level:** ${level.level} (${progress.totalXp} XP)`)
    lines.push(`- **Streak:** ${progress.streakDays} day${progress.streakDays === 1 ? '' : 's'}`)
    lines.push(`- **Daily goal today:** ${todayWorkouts >= 1 ? 'Met ✅' : 'Not met yet'}`, '')

    const songEntries = Object.values(progress.songs).sort((a, b) => b.bestStars - a.bestStars)
    if (songEntries.length === 0) {
      lines.push('_No songs played yet._', '')
      continue
    }

    lines.push('| Song | Stars | Times completed | Last played |', '| --- | --- | --- | --- |')
    for (const entry of songEntries) {
      const title = songTitleById.get(entry.songId) ?? entry.songId
      const lastPlayed = new Date(entry.lastPlayedAt).toISOString().slice(0, 10)
      lines.push(`| ${title} | ${starGlyphs(entry.bestStars)} | ${entry.timesCompleted} | ${lastPlayed} |`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
