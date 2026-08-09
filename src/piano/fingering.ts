import type { Hand, NoteEvent, Song } from '../types'

/**
 * Heuristic piano fingering.
 *
 * Real fingering depends on context a static pass can't see, so this produces a
 * playable *suggestion* the user can override per note. The rules are the
 * conventional ones: chords spread across the hand, stepwise motion walks
 * neighbouring fingers, running off the end tucks the thumb under (or crosses
 * finger 3 over it), and a wide leap repositions the hand.
 */

const CHORD_EPSILON = 0.05
/**
 * A *rest* this long lets the hand reset to a neutral position. Measured from
 * the end of the previous note — measuring from its start would reset on every
 * note in any slow passage.
 */
const PHRASE_REST_SECONDS = 1.0
/** Above this interval the hand relocates instead of stretching. */
const LEAP_SEMITONES = 7

/** Right-hand finger sets, low pitch first. Left hand mirrors these. */
function chordFingers(count: number, spanSemitones: number): number[] {
  switch (count) {
    case 1:
      return [1]
    case 2:
      return spanSemitones <= 4 ? [1, 3] : [1, 5]
    case 3:
      return [1, 3, 5]
    case 4:
      return [1, 2, 3, 5]
    default:
      return [1, 2, 3, 4, 5]
  }
}

function stepForInterval(semitones: number): number {
  const abs = Math.abs(semitones)
  if (abs <= 2) return 1
  if (abs <= 4) return 2
  return 3
}

interface HandState {
  prevFinger: number | null
  prevMidi: number | null
  prevEnd: number | null
}

function neutralStart(hand: Hand): number {
  // A hand at rest leads with the thumb on its inner side.
  return hand === 'right' ? 1 : 5
}

function fingerAfterLeap(hand: Hand, ascending: boolean): number {
  // Moving toward the thumb side puts the thumb on the target note.
  const towardThumb = hand === 'right' ? ascending : !ascending
  return towardThumb ? 1 : 5
}

function nextMelodicFinger(hand: Hand, state: HandState, midi: number): number {
  if (state.prevFinger === null || state.prevMidi === null) return neutralStart(hand)

  const interval = midi - state.prevMidi
  if (interval === 0) return state.prevFinger
  if (Math.abs(interval) > LEAP_SEMITONES) return fingerAfterLeap(hand, interval > 0)

  const ascending = interval > 0
  // Right hand: fingers rise as pitch rises. Left hand is mirrored.
  const towardHigherFinger = hand === 'right' ? ascending : !ascending
  const delta = stepForInterval(interval) * (towardHigherFinger ? 1 : -1)

  const next = state.prevFinger + delta
  if (next > 5) return 1 // thumb tucks under
  if (next < 1) return 3 // finger 3 crosses over the thumb
  return next
}

/** Assigns a finger to every note of one hand, in place on the returned copies. */
function fingerHand(notes: NoteEvent[], hand: Hand): NoteEvent[] {
  const sorted = [...notes].sort((a, b) => a.time - b.time || a.midi - b.midi)
  const out: NoteEvent[] = []
  const state: HandState = { prevFinger: null, prevMidi: null, prevEnd: null }

  let i = 0
  while (i < sorted.length) {
    // Collect everything struck at the same moment as one chord.
    let j = i + 1
    while (j < sorted.length && sorted[j].time - sorted[i].time < CHORD_EPSILON) j++
    const chord = sorted.slice(i, j)

    if (state.prevEnd !== null && sorted[i].time - state.prevEnd > PHRASE_REST_SECONDS) {
      state.prevFinger = null
      state.prevMidi = null
    }

    if (chord.length === 1) {
      const finger = nextMelodicFinger(hand, state, chord[0].midi)
      out.push({ ...chord[0], finger })
      state.prevFinger = finger
      state.prevMidi = chord[0].midi
    } else {
      const span = chord[chord.length - 1].midi - chord[0].midi
      const base = chordFingers(chord.length, span)
      // Left hand plays the lowest note with its strongest (highest-numbered) finger.
      const fingers = hand === 'right' ? base : [...base].reverse()
      chord.forEach((note, idx) => {
        out.push({ ...note, finger: fingers[Math.min(idx, fingers.length - 1)] })
      })
      const anchorIdx = hand === 'right' ? 0 : chord.length - 1
      state.prevFinger = fingers[Math.min(anchorIdx, fingers.length - 1)]
      state.prevMidi = chord[anchorIdx].midi
    }

    state.prevEnd = Math.max(...chord.map((n) => n.time + n.duration))
    i = j
  }

  return out
}

/** Returns a copy of the song with a suggested finger on every note. */
export function withSuggestedFingering(song: Song): Song {
  const left = fingerHand(
    song.notes.filter((n) => n.hand === 'left'),
    'left',
  )
  const right = fingerHand(
    song.notes.filter((n) => n.hand === 'right'),
    'right',
  )
  const notes = [...left, ...right].sort((a, b) => a.time - b.time || a.midi - b.midi)
  return { ...song, notes }
}
