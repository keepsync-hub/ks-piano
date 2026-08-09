import { Midi } from '@tonejs/midi'
import type { NoteEvent, Song } from '../types'
import { HIGHEST_MIDI, LOWEST_MIDI } from '../piano/layout'

/**
 * Loads a .mid/.midi file and converts it into our Song model.
 * Hand assignment: if the file has 2+ tracks with notes, the first
 * (usually the melody / right hand in most piano arrangements) is
 * "right" and the rest are "left". Single-track files fall back to
 * splitting by pitch around middle C.
 */
export async function parseMidiFile(file: File): Promise<Song> {
  if (!file.name.match(/\.(mid|midi)$/i)) {
    throw new Error('Only .mid and .midi files are supported')
  }

  const buffer = await file.arrayBuffer()
  let midi: Midi
  try {
    midi = new Midi(buffer)
  } catch {
    throw new Error('Could not parse MIDI file: the file may be corrupted or invalid')
  }

  const tracksWithNotes = midi.tracks.filter((t) => t.notes.length > 0)
  const useTrackHeuristic = tracksWithNotes.length >= 2

  const notes: NoteEvent[] = []
  tracksWithNotes.forEach((track, trackIndex) => {
    for (const n of track.notes) {
      if (n.midi < LOWEST_MIDI || n.midi > HIGHEST_MIDI) continue
      const hand = useTrackHeuristic ? (trackIndex === 0 ? 'right' : 'left') : n.midi >= 60 ? 'right' : 'left'
      notes.push({
        midi: n.midi,
        time: n.time,
        duration: Math.max(n.duration, 0.05),
        velocity: n.velocity || 0.8,
        hand,
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
