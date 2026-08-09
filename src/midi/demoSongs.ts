import type { Hand, NoteEvent, Song } from '../types'
import { noteNameToMidi } from './noteName'

interface BeatNote {
  note: string
  beat: number
  beats: number
  hand: Hand
}

function buildSong(id: string, title: string, composer: string, bpm: number, beatNotes: BeatNote[]): Song {
  const secondsPerBeat = 60 / bpm
  const notes: NoteEvent[] = beatNotes.map((n) => ({
    midi: noteNameToMidi(n.note),
    time: n.beat * secondsPerBeat,
    duration: n.beats * secondsPerBeat * 0.92,
    velocity: 0.75,
    hand: n.hand,
  }))
  notes.sort((a, b) => a.time - b.time)
  const duration = Math.max(...notes.map((n) => n.time + n.duration)) + 1
  return { id, title, composer, notes, duration, bpm }
}

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

export const DEMO_SONGS: Song[] = [scaleWarmup, twinkle, odeToJoy]
