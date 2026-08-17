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

/** Number of distinct onset moments in one hand — a simultaneous chord counts once. */
function eventCountPerHand(notes: NoteEvent[], hand: Hand): number {
  const times = notes
    .filter((n) => n.hand === hand)
    .map((n) => n.time)
    .sort((a, b) => a - b)
  let count = 0
  let last = -Infinity
  for (const t of times) {
    if (t - last >= GROUP_EPSILON) {
      count++
      last = t
    }
  }
  return count
}

/** True when most of a song's notes carry an explicit SATB voice (see NoteEvent.voice) — a hymn-style closed score, not free piano writing. */
function isSatbSong(song: Song): boolean {
  if (song.notes.length === 0) return false
  return song.notes.filter((n) => n.voice !== undefined).length / song.notes.length > 0.5
}

/** Sharps (positive) or flats (negative-magnitude, stored positive) in each major key VexFlow recognizes — see keySignatureToVexSpec. */
const KEY_ACCIDENTAL_COUNT: Record<string, number> = {
  C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7,
  F: 1, Bb: 2, Eb: 3, Ab: 4, Db: 5, Gb: 6, Cb: 7,
}

/**
 * A hymn-style closed score always has two simultaneous notes per hand
 * (soprano+alto, tenor+bass) — the generic chord/density heuristic below
 * would read that constant as "wide chords, high density" and rate nearly
 * every hymn as advanced, when playing two voices under one hand position
 * is a different (and usually easier) skill than a genuine wide-stretch
 * chord. Difficulty here instead tracks the factors that actually vary
 * hymn to hymn: tempo, how often the two-voice chords change (per hand,
 * not per note — so the paired voice doesn't double-count), pitch range,
 * key-signature accidentals, and compound meter.
 */
function scoreHymnDifficulty(song: Song): number {
  const duration = Math.max(song.duration, 1)
  const events = eventCountPerHand(song.notes, 'right') + eventCountPerHand(song.notes, 'left')
  const density = events / duration
  const pitches = song.notes.map((n) => n.midi)
  const range = Math.max(...pitches) - Math.min(...pitches)
  const keyLetter = song.keySignature?.split(' ')[0] ?? 'C'
  const accidentals = KEY_ACCIDENTAL_COUNT[keyLetter] ?? 0
  const [beatsPerBar, beatUnit] = song.timeSignature ?? [4, 4]
  const isCompoundMeter = beatUnit === 8 && beatsPerBar % 3 === 0 && beatsPerBar > 3

  const densityScore = Math.min(density * 3.5, 28)
  const rangeScore = Math.min(range / 6, 14)
  const tempoScore = Math.min(Math.max(song.bpm - 80, 0) / 5, 18)
  const keyScore = Math.min(accidentals * 1.2, 10)
  const meterScore = isCompoundMeter ? 8 : 0

  return densityScore + rangeScore + tempoScore + keyScore + meterScore
}

/**
 * A rough 0-100 difficulty estimate from note density, hand independence,
 * chord complexity, pitch range and tempo. Used both for uploaded MIDI files
 * and for the bundled demo songs, so the same scale applies to everything in
 * the library. Hymn-style SATB scores (see isSatbSong) use a dedicated
 * formula instead — see scoreHymnDifficulty for why.
 */
export function scoreDifficulty(song: Song): number {
  if (song.notes.length === 0) return 0
  if (isSatbSong(song)) return scoreHymnDifficulty(song)

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
