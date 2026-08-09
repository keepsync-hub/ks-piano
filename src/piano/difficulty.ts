import type { Hand, NoteEvent, Song } from '../types'

export type DifficultyTier = 1 | 2 | 3 | 4 | 5

export const DIFFICULTY_LABELS: Record<DifficultyTier, string> = {
  1: 'Beginner',
  2: 'Easy',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
}

const GROUP_EPSILON = 0.05

/** Largest number of notes struck at once within a single hand (i.e. an actual chord). */
function maxChordSizePerHand(notes: NoteEvent[]): number {
  let max = 1
  for (const hand of ['left', 'right'] as Hand[]) {
    const sorted = notes
      .filter((n) => n.hand === hand)
      .map((n) => n.time)
      .sort((a, b) => a - b)
    let runStart = 0
    for (let i = 1; i <= sorted.length; i++) {
      if (i === sorted.length || sorted[i] - sorted[runStart] >= GROUP_EPSILON) {
        max = Math.max(max, i - runStart)
        runStart = i
      }
    }
  }
  return max
}

/**
 * A rough 0-100 difficulty estimate from note density, hand independence,
 * chord complexity, pitch range and tempo. Used both for uploaded MIDI files
 * and for the bundled demo songs, so the same scale applies to everything in
 * the library.
 */
export function scoreDifficulty(song: Song): number {
  if (song.notes.length === 0) return 0

  const duration = Math.max(song.duration, 1)
  const density = song.notes.length / duration // notes per second
  const hands = new Set(song.notes.map((n) => n.hand))
  const pitches = song.notes.map((n) => n.midi)
  const range = Math.max(...pitches) - Math.min(...pitches)
  const chordSize = maxChordSizePerHand(song.notes)

  const densityScore = Math.min(density * 5, 25)
  const bothHandsScore = hands.size > 1 ? 8 : 0
  const rangeScore = Math.min(range / 3, 15)
  const chordScore = Math.min((chordSize - 1) * 15, 30)
  const tempoScore = Math.min(Math.max(song.bpm - 80, 0) / 4, 10)

  return densityScore + bothHandsScore + rangeScore + chordScore + tempoScore
}

const TIER_THRESHOLDS: [number, DifficultyTier][] = [
  [20, 1],
  [35, 2],
  [55, 3],
  [75, 4],
]

export function difficultyTier(song: Song): DifficultyTier {
  const score = scoreDifficulty(song)
  for (const [max, tier] of TIER_THRESHOLDS) {
    if (score < max) return tier
  }
  return 5
}
