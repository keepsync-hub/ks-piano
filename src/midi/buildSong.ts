import type { Hand, NoteEvent, Song } from '../types'
import { noteNameToMidi } from './noteName'

export interface BeatNote {
  note: string
  beat: number
  beats: number
  hand: Hand
}

export interface BuildSongOptions {
  keySignature?: string
  timeSignature?: [number, number]
}

/** Builds a `Song` from a beats-relative note list, for bundled songs that aren't parsed from a .mid file. */
export function buildSong(
  id: string,
  title: string,
  composer: string,
  bpm: number,
  beatNotes: BeatNote[],
  options: BuildSongOptions = {},
): Song {
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
  return {
    id,
    title,
    composer,
    notes,
    duration,
    bpm,
    keySignature: options.keySignature ?? 'C Major',
    timeSignature: options.timeSignature,
  }
}
