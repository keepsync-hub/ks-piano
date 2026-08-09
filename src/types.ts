export type Hand = 'left' | 'right'

export interface NoteEvent {
  /** MIDI note number, 21 (A0) - 108 (C8) */
  midi: number
  /** Start time in seconds */
  time: number
  /** Duration in seconds */
  duration: number
  velocity: number
  hand: Hand
  /** Suggested or user-set fingering, 1 (thumb) to 5 (little finger). */
  finger?: number
  /** Musical position in MIDI ticks; tempo-independent, so notation uses it. */
  ticks?: number
  durationTicks?: number
}

export interface TempoEvent {
  ticks: number
  bpm: number
}

export interface Song {
  id: string
  title: string
  composer?: string
  notes: NoteEvent[]
  duration: number
  /** Beats per minute, used to lay out sheet music notation. */
  bpm: number
  /** Display label such as "G Major"; shown on the falling-notes stage. */
  keySignature?: string
  /** Ticks per quarter note; present when the song came from a MIDI file. */
  ppq?: number
  /** Tempo map, so notation can convert musical time to seconds accurately. */
  tempoEvents?: TempoEvent[]
  /** Beats per bar and beat unit, e.g. [4, 4] or [12, 8]. */
  timeSignature?: [number, number]
}

export type PlaybackMode = 'listen' | 'practice'
