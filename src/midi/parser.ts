import { Midi } from '@tonejs/midi'
import type { Hand, NoteEvent, Song } from '../types'
import { HIGHEST_MIDI, LOWEST_MIDI } from '../piano/layout'

/**
 * Recognized SATB part names, matched against each MIDI track's name.
 * Soprano/Alto share the treble clef (soprano stems up, alto down) and
 * Tenor/Bass share the bass clef (tenor stems up, bass down) — the
 * standard closed-score layout for hymns and choral pieces.
 */
const SATB_PARTS: { hand: Hand; voice: 0 | 1; regex: RegExp }[] = [
  { hand: 'right', voice: 0, regex: /\bsoprano\b/i },
  { hand: 'right', voice: 1, regex: /\balto\b/i },
  { hand: 'left', voice: 0, regex: /\btenor\b/i },
  { hand: 'left', voice: 1, regex: /\b(bass|bajo|baixo|basse)\b/i },
]

function matchSatbPart(trackName: string | undefined) {
  if (!trackName) return null
  return SATB_PARTS.find((p) => p.regex.test(trackName)) ?? null
}

/**
 * Loads a .mid/.midi file and converts it into our Song model.
 *
 * Hand assignment: when every track that has notes carries a recognizable
 * SATB part name (Soprano/Alto/Tenor/Bass), each note gets both the clef
 * (hand) and the notation voice (stem direction) its part conventionally
 * uses. Otherwise, if the file has 2+ tracks with notes, the first (usually
 * the melody / right hand in most piano arrangements) is "right" and the
 * rest are "left". Single-track files fall back to splitting by pitch
 * around middle C.
 */
export async function parseMidiFile(file: File): Promise<Song> {
  if (!file.name.match(/\.(mid|midi)$/i)) {
    throw new Error('Only .mid and .midi files are supported')
  }

  let buffer: ArrayBuffer
  let midi: Midi
  try {
    buffer = await file.arrayBuffer()
    midi = new Midi(buffer)
  } catch {
    throw new Error('Could not parse MIDI file: the file may be corrupted or invalid')
  }

  const tracksWithNotes = midi.tracks.filter((t) => t.notes.length > 0)
  const useTrackHeuristic = tracksWithNotes.length >= 2

  const satbParts = tracksWithNotes.map((t) => matchSatbPart(t.name))
  const useSatb =
    tracksWithNotes.length >= 2 &&
    satbParts.every((p) => p !== null) &&
    new Set(satbParts).size === satbParts.length

  const notes: NoteEvent[] = []
  tracksWithNotes.forEach((track, trackIndex) => {
    const satbPart = satbParts[trackIndex]
    for (const n of track.notes) {
      if (n.midi < LOWEST_MIDI || n.midi > HIGHEST_MIDI) continue
      const hand = useSatb
        ? satbPart!.hand
        : useTrackHeuristic
          ? trackIndex === 0
            ? 'right'
            : 'left'
          : n.midi >= 60
            ? 'right'
            : 'left'
      notes.push({
        midi: n.midi,
        time: n.time,
        duration: Math.max(n.duration, 0.05),
        velocity: n.velocity || 0.8,
        hand,
        voice: useSatb ? satbPart!.voice : undefined,
        ticks: n.ticks,
        durationTicks: n.durationTicks,
      })
    }
  })

  notes.sort((a, b) => a.time - b.time)

  const bpm = midi.header.tempos[0]?.bpm ?? 120

  const rawKey = midi.header.keySignatures[0]
  const keySignature = rawKey
    ? `${rawKey.key} ${rawKey.scale === 'minor' ? 'Minor' : 'Major'}`
    : undefined

  const [beatsPerBar, beatUnit] = midi.header.timeSignatures[0]?.timeSignature ?? [4, 4]

  return {
    id: `upload-${Date.now()}`,
    title: file.name.replace(/\.(mid|midi)$/i, ''),
    notes,
    duration: midi.duration,
    bpm,
    keySignature,
    ppq: midi.header.ppq,
    tempoEvents: midi.header.tempos.map((t) => ({ ticks: t.ticks, bpm: t.bpm })),
    timeSignature: [beatsPerBar, beatUnit],
  }
}
