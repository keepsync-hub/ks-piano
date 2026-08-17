// Regenerates src/midi/himnarioGrande.ts from the local .mid copies under
// practice-plans/himnario-grande/midi/.
//
// Source: mono-piano (SATB reduction) MIDI files from
// https://himnosycanticos.org/media/hymns/midi/Himnario-grande/ — a public
// congregational hymnal. Only files whose name matches HyC-<number>_mono-piano.mid
// are picked up; run this after adding/removing files in that directory.
//
// Notes are extracted with @tonejs/midi — the same library the app uses at
// runtime for "Upload MIDI" (see src/midi/parser.ts) — so a bundled hymn
// behaves identically to uploading the same file by hand. The SATB
// part-name → clef/voice rule below mirrors src/midi/parser.ts's
// matchSatbPart(); keep the two in sync if that logic changes.
import pkg from '@tonejs/midi'
const { Midi } = pkg
import { parseMidi } from 'midi-file'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MIDI_DIR = path.join(ROOT, 'practice-plans/himnario-grande/midi')
const OUT_FILE = path.join(ROOT, 'src/midi/himnarioGrande.ts')

// Mirrors LOWEST_MIDI/HIGHEST_MIDI in src/piano/layout.ts (the 88-key range).
const LOWEST_MIDI = 21
const HIGHEST_MIDI = 108

const SATB_PARTS = [
  { hand: 0, voice: 0, regex: /\bsoprano\b/i },
  { hand: 0, voice: 1, regex: /\balto\b/i },
  { hand: 1, voice: 0, regex: /\btenor\b/i },
  { hand: 1, voice: 1, regex: /\b(bass|bajo|baixo|basse)\b/i },
]

function matchSatbPart(trackName) {
  if (!trackName) return null
  return SATB_PARTS.find((p) => p.regex.test(trackName)) ?? null
}

/** Derives a display title from the hymn's first line of lyrics, e.g. "1. Loor te rendimos, /..." -> "Loor te rendimos". */
function titleFromLyrics(rawTracks) {
  const wordsTrack = rawTracks.find((t) => t.find((e) => e.type === 'trackName' && e.text === 'Words'))
  if (!wordsTrack) return null
  const joined = wordsTrack
    .filter((e) => e.type === 'text' || e.type === 'lyrics')
    .map((e) => e.text)
    .join('')
  const firstLine = joined
    .replace(/^\\+/, '')
    .split('/')[0]
    .replace(/^\d+\.\s*/, '')
    .replace(/[,;:.\s]+$/, '')
    .trim()
  return firstLine || null
}

function buildRawSong(filePath, hymnNumber) {
  const buffer = readFileSync(filePath)
  const midi = new Midi(buffer)
  const rawTracks = parseMidi(buffer).tracks

  const tracksWithNotes = midi.tracks.filter((t) => t.notes.length > 0)
  const satbParts = tracksWithNotes.map((t) => matchSatbPart(t.name))
  const useSatb = tracksWithNotes.length >= 2 && satbParts.every((p) => p !== null) && new Set(satbParts).size === satbParts.length
  if (!useSatb) {
    throw new Error(`${filePath}: expected SATB-named tracks (Soprano/Alto/Tenor/Bass), got [${tracksWithNotes.map((t) => t.name).join(', ')}]`)
  }

  const notes = []
  tracksWithNotes.forEach((track, trackIndex) => {
    const part = satbParts[trackIndex]
    for (const n of track.notes) {
      if (n.midi < LOWEST_MIDI || n.midi > HIGHEST_MIDI) continue
      notes.push([n.midi, n.ticks, n.durationTicks, Math.round((n.velocity || 0.8) * 100) / 100, part.hand, part.voice])
    }
  })
  notes.sort((a, b) => a[1] - b[1] || a[0] - b[0])

  const bpm = midi.header.tempos[0]?.bpm ?? 120
  // Cantiquest exports repeat the same tempo meta event once per track (one
  // per SATB part) rather than a real mid-piece tempo change — only reject
  // when the values actually differ.
  const distinctBpms = new Set(midi.header.tempos.map((t) => t.bpm))
  if (distinctBpms.size > 1) {
    throw new Error(`${filePath}: has ${distinctBpms.size} distinct tempos (${[...distinctBpms].join(', ')}) — the generator assumes a single tempo, extend toSong() in the output before regenerating`)
  }
  const rawKey = midi.header.keySignatures[0]
  const keySignature = rawKey ? `${rawKey.key} ${rawKey.scale === 'minor' ? 'Minor' : 'Major'}` : 'C Major'
  const timeSignature = midi.header.timeSignatures[0]?.timeSignature ?? [4, 4]
  const title = titleFromLyrics(rawTracks) ?? `Himno ${hymnNumber}`

  return {
    id: `hyc-${hymnNumber}`,
    title,
    hymnNumber,
    bpm,
    ppq: midi.header.ppq,
    keySignature,
    timeSignature,
    notes,
  }
}

const files = readdirSync(MIDI_DIR)
  .filter((f) => /^HyC-\d+_mono-piano\.mid$/.test(f))
  .sort()

if (files.length === 0) {
  console.error(`No HyC-<number>_mono-piano.mid files found in ${MIDI_DIR}`)
  process.exit(1)
}

const rawSongs = files.map((f) => {
  const hymnNumber = /^HyC-(\d+)_mono-piano\.mid$/.exec(f)[1]
  return buildRawSong(path.join(MIDI_DIR, f), hymnNumber)
})

function tupleLiteral(notes) {
  return notes.map((n) => `    [${n.join(', ')}],`).join('\n')
}

/** Single-quoted JS string literal, matching this repo's quote style. */
function quote(s) {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

const rawSongLiterals = rawSongs
  .map(
    (s) => `  {
    id: '${s.id}',
    title: ${quote(s.title)},
    hymnNumber: '${s.hymnNumber}',
    bpm: ${s.bpm},
    ppq: ${s.ppq},
    keySignature: '${s.keySignature}',
    timeSignature: [${s.timeSignature[0]}, ${s.timeSignature[1]}],
    notes: [
${tupleLiteral(s.notes)}
    ],
  },`,
  )
  .join('\n')

const output = `// AUTO-GENERATED by scripts/generate-himnario-grande-songs.mjs — do not hand-edit.
// Source: mono-piano (SATB reduction) MIDI files from
// https://himnosycanticos.org/media/hymns/midi/Himnario-grande/, local copies
// under practice-plans/himnario-grande/midi/. Regenerate after adding files
// there. Every note goes through the same clef/voice assignment
// src/midi/parser.ts applies to an uploaded SATB file (Soprano+Alto on the
// treble clef, Tenor+Bass on the bass clef, stems apart), so these songs
// notate exactly like uploading the same .mid by hand.
import type { NoteEvent, Song } from '../types'

interface RawHimnarioSong {
  id: string
  title: string
  hymnNumber: string
  bpm: number
  ppq: number
  keySignature: string
  timeSignature: [number, number]
  /** [midi, ticks, durationTicks, velocity, hand, voice] — hand: 0 right / 1 left, voice: 0 soprano/tenor (stem up) / 1 alto/bass (stem down). */
  notes: [number, number, number, number, number, number][]
}

const RAW_SONGS: RawHimnarioSong[] = [
${rawSongLiterals}
]

function toSong(raw: RawHimnarioSong): Song {
  const secondsPerTick = 60 / raw.bpm / raw.ppq
  const notes: NoteEvent[] = raw.notes.map(([midi, ticks, durationTicks, velocity, hand, voice]) => ({
    midi,
    time: ticks * secondsPerTick,
    duration: Math.max(durationTicks * secondsPerTick, 0.05),
    velocity,
    hand: hand === 0 ? 'right' : 'left',
    voice: (voice as 0 | 1),
    ticks,
    durationTicks,
  }))
  const duration = Math.max(...notes.map((n) => n.time + n.duration)) + 1
  return {
    id: raw.id,
    title: raw.title,
    composer: \`Himnario y Cánticos — Himno \${raw.hymnNumber}\`,
    notes,
    duration,
    bpm: raw.bpm,
    keySignature: raw.keySignature,
    ppq: raw.ppq,
    tempoEvents: [{ ticks: 0, bpm: raw.bpm }],
    timeSignature: raw.timeSignature,
  }
}

export const HIMNARIO_GRANDE_SONGS: Song[] = RAW_SONGS.map(toSong)
`

writeFileSync(OUT_FILE, output)
console.log(`wrote ${OUT_FILE} (${rawSongs.length} hymns: ${rawSongs.map((s) => s.id).join(', ')})`)
