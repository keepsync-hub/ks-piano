import type { Hand, Song } from '../types'
import { buildSong } from './buildSong'
import { ADULT_PIANO_ADVENTURES_BOOK1_SONGS } from './adultPianoAdventuresBook1'

// Simple right-hand-only warm-up exercise.
const scaleWarmup = buildSong('demo-scale', 'C Major Scale Warm-up', 'Traditional exercise', 84, [
  { note: 'C4', beat: 0, beats: 1, hand: 'right' },
  { note: 'D4', beat: 1, beats: 1, hand: 'right' },
  { note: 'E4', beat: 2, beats: 1, hand: 'right' },
  { note: 'F4', beat: 3, beats: 1, hand: 'right' },
  { note: 'G4', beat: 4, beats: 1, hand: 'right' },
  { note: 'A4', beat: 5, beats: 1, hand: 'right' },
  { note: 'B4', beat: 6, beats: 1, hand: 'right' },
  { note: 'C5', beat: 7, beats: 1, hand: 'right' },
  { note: 'B4', beat: 8, beats: 1, hand: 'right' },
  { note: 'A4', beat: 9, beats: 1, hand: 'right' },
  { note: 'G4', beat: 10, beats: 1, hand: 'right' },
  { note: 'F4', beat: 11, beats: 1, hand: 'right' },
  { note: 'E4', beat: 12, beats: 1, hand: 'right' },
  { note: 'D4', beat: 13, beats: 1, hand: 'right' },
  { note: 'C4', beat: 14, beats: 2, hand: 'right' },
])

// Traditional melody (public domain), right hand melody + simple left hand chords.
const twinkle = buildSong('demo-twinkle', 'Twinkle Twinkle Little Star', 'Traditional', 100, [
  // melody - right hand
  { note: 'C4', beat: 0, beats: 1, hand: 'right' },
  { note: 'C4', beat: 1, beats: 1, hand: 'right' },
  { note: 'G4', beat: 2, beats: 1, hand: 'right' },
  { note: 'G4', beat: 3, beats: 1, hand: 'right' },
  { note: 'A4', beat: 4, beats: 1, hand: 'right' },
  { note: 'A4', beat: 5, beats: 1, hand: 'right' },
  { note: 'G4', beat: 6, beats: 2, hand: 'right' },
  { note: 'F4', beat: 8, beats: 1, hand: 'right' },
  { note: 'F4', beat: 9, beats: 1, hand: 'right' },
  { note: 'E4', beat: 10, beats: 1, hand: 'right' },
  { note: 'E4', beat: 11, beats: 1, hand: 'right' },
  { note: 'D4', beat: 12, beats: 1, hand: 'right' },
  { note: 'D4', beat: 13, beats: 1, hand: 'right' },
  { note: 'C4', beat: 14, beats: 2, hand: 'right' },
  // left hand accompaniment (root notes)
  { note: 'C3', beat: 0, beats: 2, hand: 'left' },
  { note: 'G2', beat: 2, beats: 2, hand: 'left' },
  { note: 'A2', beat: 4, beats: 2, hand: 'left' },
  { note: 'F2', beat: 6, beats: 2, hand: 'left' },
  { note: 'F2', beat: 8, beats: 2, hand: 'left' },
  { note: 'C3', beat: 10, beats: 2, hand: 'left' },
  { note: 'G2', beat: 12, beats: 2, hand: 'left' },
  { note: 'C3', beat: 14, beats: 2, hand: 'left' },
])

// "Ode to Joy" theme (Beethoven, Symphony No. 9 - public domain).
const odeToJoy = buildSong('demo-ode-to-joy', 'Ode to Joy (theme)', 'Beethoven', 112, [
  { note: 'E4', beat: 0, beats: 1, hand: 'right' },
  { note: 'E4', beat: 1, beats: 1, hand: 'right' },
  { note: 'F4', beat: 2, beats: 1, hand: 'right' },
  { note: 'G4', beat: 3, beats: 1, hand: 'right' },
  { note: 'G4', beat: 4, beats: 1, hand: 'right' },
  { note: 'F4', beat: 5, beats: 1, hand: 'right' },
  { note: 'E4', beat: 6, beats: 1, hand: 'right' },
  { note: 'D4', beat: 7, beats: 1, hand: 'right' },
  { note: 'C4', beat: 8, beats: 1, hand: 'right' },
  { note: 'C4', beat: 9, beats: 1, hand: 'right' },
  { note: 'D4', beat: 10, beats: 1, hand: 'right' },
  { note: 'E4', beat: 11, beats: 1, hand: 'right' },
  { note: 'E4', beat: 12, beats: 1.5, hand: 'right' },
  { note: 'D4', beat: 13.5, beats: 0.5, hand: 'right' },
  { note: 'D4', beat: 14, beats: 2, hand: 'right' },
  { note: 'C3', beat: 0, beats: 4, hand: 'left' },
  { note: 'G2', beat: 4, beats: 4, hand: 'left' },
  { note: 'C3', beat: 8, beats: 4, hand: 'left' },
  { note: 'G2', beat: 12, beats: 4, hand: 'left' },
])

// Traditional nursery tune (public domain), right hand only — an easy first song.
const maryHadALittleLamb = buildSong('demo-mary', 'Mary Had a Little Lamb', 'Traditional', 76, [
  { note: 'E4', beat: 0, beats: 1, hand: 'right' },
  { note: 'D4', beat: 1, beats: 1, hand: 'right' },
  { note: 'C4', beat: 2, beats: 1, hand: 'right' },
  { note: 'D4', beat: 3, beats: 1, hand: 'right' },
  { note: 'E4', beat: 4, beats: 1, hand: 'right' },
  { note: 'E4', beat: 5, beats: 1, hand: 'right' },
  { note: 'E4', beat: 6, beats: 2, hand: 'right' },
  { note: 'D4', beat: 8, beats: 1, hand: 'right' },
  { note: 'D4', beat: 9, beats: 1, hand: 'right' },
  { note: 'D4', beat: 10, beats: 2, hand: 'right' },
  { note: 'E4', beat: 12, beats: 1, hand: 'right' },
  { note: 'G4', beat: 13, beats: 1, hand: 'right' },
  { note: 'G4', beat: 14, beats: 2, hand: 'right' },
  { note: 'E4', beat: 16, beats: 1, hand: 'right' },
  { note: 'D4', beat: 17, beats: 1, hand: 'right' },
  { note: 'C4', beat: 18, beats: 1, hand: 'right' },
  { note: 'D4', beat: 19, beats: 1, hand: 'right' },
  { note: 'E4', beat: 20, beats: 1, hand: 'right' },
  { note: 'E4', beat: 21, beats: 1, hand: 'right' },
  { note: 'E4', beat: 22, beats: 1, hand: 'right' },
  { note: 'E4', beat: 23, beats: 1, hand: 'right' },
  { note: 'D4', beat: 24, beats: 1, hand: 'right' },
  { note: 'D4', beat: 25, beats: 1, hand: 'right' },
  { note: 'E4', beat: 26, beats: 1, hand: 'right' },
  { note: 'D4', beat: 27, beats: 1, hand: 'right' },
  { note: 'C4', beat: 28, beats: 4, hand: 'right' },
])

// Original technical exercise: fast two-hand broken chords across a wide
// range, with real left-hand chords. Sits near the top of the difficulty
// scale so the skill path has something to unlock into once a player is
// ready — not a real piece, just a workout for hand independence.
const arpeggioNotes: { note: string; beat: number; beats: number; hand: Hand }[] = []
const arpeggioPattern = ['C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'E5', 'C5']
const bassChords: [string, string][] = [
  ['C3', 'G3'],
  ['A2', 'E3'],
  ['F2', 'C3'],
  ['G2', 'D3'],
]
for (let bar = 0; bar < 4; bar++) {
  arpeggioPattern.forEach((note, i) => {
    arpeggioNotes.push({ note, beat: bar * 4 + i * 0.5, beats: 0.5, hand: 'right' })
  })
  const [low, high] = bassChords[bar % bassChords.length]
  arpeggioNotes.push({ note: low, beat: bar * 4, beats: 4, hand: 'left' })
  arpeggioNotes.push({ note: high, beat: bar * 4, beats: 4, hand: 'left' })
}
const arpeggioEtude = buildSong('demo-arpeggio-etude', 'Two-Hand Arpeggio Étude', 'Original exercise', 132, arpeggioNotes)

export const DEMO_SONGS: Song[] = [
  scaleWarmup,
  maryHadALittleLamb,
  twinkle,
  odeToJoy,
  arpeggioEtude,
  ...ADULT_PIANO_ADVENTURES_BOOK1_SONGS,
]
