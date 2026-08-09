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
}

export interface Song {
  id: string
  title: string
  composer?: string
  notes: NoteEvent[]
  duration: number
}

export type PlaybackMode = 'listen' | 'practice'
