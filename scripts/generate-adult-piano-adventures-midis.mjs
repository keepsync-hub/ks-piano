// Generates the .mid files for practice-plans/adult-piano-adventures-book1/midi/
//
// These are original, simplified practice arrangements written for this study
// plan — not scans/transcriptions of the Faber Adult Piano Adventures® books
// (which are copyrighted). Public-domain melodies (traditional tunes, hymns,
// out-of-copyright classical themes) are arranged in full; anything associated
// with a still-copyrighted piece is written as a short "simplified motif" for
// sight-reading practice, or skipped entirely in favor of a manual-search note
// in ADULT_PIANO_ADVENTURES_PLAN.md.
import pkg from '@tonejs/midi'
const { Midi } = pkg
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../practice-plans/adult-piano-adventures-book1/midi')
mkdirSync(OUT_DIR, { recursive: true })

const PITCH_CLASS = {
  C: 0, 'C#': 1, DB: 1, D: 2, 'D#': 3, EB: 3, E: 4, F: 5, 'F#': 6, GB: 6,
  G: 7, 'G#': 8, AB: 8, A: 9, 'A#': 10, BB: 10, B: 11,
}

function noteNameToMidi(name) {
  const match = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(name.trim())
  if (!match) throw new Error(`Invalid note name: ${name}`)
  const [, letter, accidental, octaveStr] = match
  const key = letter.toUpperCase() + (accidental === '#' ? '#' : accidental === 'b' ? 'B' : '')
  const octave = parseInt(octaveStr, 10)
  return (octave + 1) * 12 + PITCH_CLASS[key]
}

/** beatNotes: { note, beat, beats, hand: 'left'|'right', velocity? }[] */
function writeSong({ id, title, composer, bpm, timeSignature = [4, 4], beatNotes }) {
  const secondsPerBeat = 60 / bpm
  const midi = new Midi()
  midi.header.setTempo(bpm)
  midi.header.timeSignatures.push({ ticks: 0, timeSignature })
  midi.header.update()
  midi.header.name = title

  const right = midi.addTrack()
  right.name = 'Right Hand'
  const left = midi.addTrack()
  left.name = 'Left Hand'

  for (const n of beatNotes) {
    const track = n.hand === 'left' ? left : right
    track.addNote({
      midi: noteNameToMidi(n.note),
      time: n.beat * secondsPerBeat,
      duration: n.beats * secondsPerBeat * 0.92,
      velocity: n.velocity ?? 0.75,
    })
  }

  const bytes = midi.toArray()
  const filePath = path.join(OUT_DIR, `${id}.mid`)
  writeFileSync(filePath, Buffer.from(bytes))
  console.log(`wrote ${filePath} (${composer})`)
}

// ---------------------------------------------------------------------------
// Technique drills — procedurally generated 5-finger patterns and cadences,
// mirroring the pentascale-by-pentascale, chord-by-chord progression the book
// is built around (see ADULT_PIANO_ADVENTURES_PLAN.md for the unit mapping).
// ---------------------------------------------------------------------------

const MAJOR_STEPS = [0, 2, 4, 5, 7]
const MINOR_STEPS = [0, 2, 3, 5, 7]

function transposeUp(rootMidi, semitones) {
  return rootMidi + semitones
}

function midiToName(midiNum) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(midiNum / 12) - 1
  return `${names[midiNum % 12]}${octave}`
}

function pentascaleWarmup(id, title, rootNote, steps, bpm) {
  const root = noteNameToMidi(rootNote)
  const degrees = steps.map((s) => midiToName(transposeUp(root, s)))
  const beatNotes = []
  degrees.forEach((note, i) => beatNotes.push({ note, beat: i, beats: 1, hand: 'right' }))
  ;[...degrees].reverse().forEach((note, i) => {
    const isLast = i === degrees.length - 1
    beatNotes.push({ note, beat: 5 + i, beats: isLast ? 2 : 1, hand: 'right' })
  })
  // Left hand: sustained root note under the whole pattern.
  const rootLow = midiToName(root - 12)
  beatNotes.push({ note: rootLow, beat: 0, beats: 10, hand: 'left' })
  writeSong({ id, title, composer: 'Ejercicio técnico (dominio propio)', bpm, timeSignature: [4, 4], beatNotes })
}

function cadenceDrill(id, title, rootNote, bpm) {
  const root = noteNameToMidi(rootNote)
  const maj = (semi) => midiToName(transposeUp(root, semi))
  const I = [maj(0), maj(4), maj(7)]
  const IV = [maj(5), maj(9), maj(12)]
  const V7 = [maj(7), maj(11), maj(14), maj(17)]
  const beatNotes = []
  const chord = (notes, beat, beats) => notes.forEach((note) => beatNotes.push({ note, beat, beats, hand: 'right' }))
  chord(I, 0, 2)
  chord(IV, 2, 2)
  chord(V7, 4, 2)
  chord(I, 6, 2)
  const rootLow = midiToName(root - 24)
  const fourthLow = midiToName(transposeUp(root - 24, 5))
  const fifthLow = midiToName(transposeUp(root - 24, 7))
  beatNotes.push({ note: rootLow, beat: 0, beats: 2, hand: 'left' })
  beatNotes.push({ note: fourthLow, beat: 2, beats: 2, hand: 'left' })
  beatNotes.push({ note: fifthLow, beat: 4, beats: 2, hand: 'left' })
  beatNotes.push({ note: rootLow, beat: 6, beats: 2, hand: 'left' })
  writeSong({ id, title, composer: 'Ejercicio técnico (dominio propio)', bpm, timeSignature: [4, 4], beatNotes })
}

pentascaleWarmup('unit03-c-pentascale', 'Pentacordio de Do — calentamiento', 'C4', MAJOR_STEPS, 84)
pentascaleWarmup('unit05-g-pentascale', 'Pentacordio de Sol — calentamiento', 'G4', MAJOR_STEPS, 88)
pentascaleWarmup('unit07-f-pentascale', 'Pentacordio de Fa — calentamiento', 'F4', MAJOR_STEPS, 88)
pentascaleWarmup('unit09-d-pentascale', 'Pentacordio de Re — calentamiento', 'D4', MAJOR_STEPS, 92)
pentascaleWarmup('unit11-a-pentascale', 'Pentacordio de La — calentamiento', 'A3', MAJOR_STEPS, 92)
pentascaleWarmup('unit13-a-minor-pentascale', 'Pentacordio de La menor — calentamiento', 'A3', MINOR_STEPS, 84)
cadenceDrill('unit08-cadence-C', 'Cadencia I-IV-V7-I en Do', 'C4', 76)
cadenceDrill('unit10-cadence-G', 'Cadencia I-IV-V7-I en Sol', 'G3', 76)

// Unit 15 finale: full one-octave C major scale + I-IV-V7-I cadence.
{
  const bpm = 96
  const beatNotes = []
  const up = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']
  up.forEach((note, i) => beatNotes.push({ note, beat: i, beats: 1, hand: 'right' }))
  ;[...up].reverse().forEach((note, i) => {
    const isLast = i === up.length - 1
    beatNotes.push({ note, beat: 8 + i, beats: isLast ? 2 : 1, hand: 'right' })
  })
  const chord = (notes, beat, beats) => notes.forEach((note) => beatNotes.push({ note, beat, beats, hand: 'left' }))
  chord(['C3', 'E3', 'G3'], 17, 2)
  chord(['F2', 'A2', 'C3'], 19, 2)
  chord(['G2', 'B2', 'D3', 'F3'], 21, 2)
  chord(['C2', 'E2', 'G2'], 23, 2)
  writeSong({
    id: 'unit15-c-scale-and-cadence',
    title: 'Escala de Do Mayor (una octava) + cadencia final',
    composer: 'Ejercicio técnico (dominio propio)',
    bpm,
    timeSignature: [4, 4],
    beatNotes,
  })
}

// ---------------------------------------------------------------------------
// Repertoire — traditional / public-domain tunes, arranged simply (RH melody,
// simple LH roots) at a Level 1-appropriate difficulty. Anything tied to a
// piece still under copyright (movie/pop songs, some concert-hall staples in
// their original form) is intentionally NOT reproduced here — see the plan
// doc's "manual search" column instead.
// ---------------------------------------------------------------------------

writeSong({
  id: 'unit01-merrily-we-roll-along',
  title: 'Merrily We Roll Along',
  composer: 'Tradicional',
  bpm: 100,
  beatNotes: [
    { note: 'E4', beat: 0, beats: 1, hand: 'right' }, { note: 'D4', beat: 1, beats: 1, hand: 'right' },
    { note: 'C4', beat: 2, beats: 1, hand: 'right' }, { note: 'D4', beat: 3, beats: 1, hand: 'right' },
    { note: 'E4', beat: 4, beats: 1, hand: 'right' }, { note: 'E4', beat: 5, beats: 1, hand: 'right' }, { note: 'E4', beat: 6, beats: 1, hand: 'right' },
    { note: 'D4', beat: 8, beats: 1, hand: 'right' }, { note: 'D4', beat: 9, beats: 1, hand: 'right' }, { note: 'D4', beat: 10, beats: 2, hand: 'right' },
    { note: 'E4', beat: 12, beats: 1, hand: 'right' }, { note: 'G4', beat: 13, beats: 1, hand: 'right' }, { note: 'G4', beat: 14, beats: 2, hand: 'right' },
    { note: 'E4', beat: 16, beats: 1, hand: 'right' }, { note: 'D4', beat: 17, beats: 1, hand: 'right' },
    { note: 'C4', beat: 18, beats: 1, hand: 'right' }, { note: 'D4', beat: 19, beats: 1, hand: 'right' },
    { note: 'E4', beat: 20, beats: 1, hand: 'right' }, { note: 'E4', beat: 21, beats: 1, hand: 'right' },
    { note: 'E4', beat: 22, beats: 1, hand: 'right' }, { note: 'E4', beat: 23, beats: 1, hand: 'right' },
    { note: 'D4', beat: 24, beats: 1, hand: 'right' }, { note: 'D4', beat: 25, beats: 1, hand: 'right' },
    { note: 'E4', beat: 26, beats: 1, hand: 'right' }, { note: 'D4', beat: 27, beats: 1, hand: 'right' },
    { note: 'C4', beat: 28, beats: 4, hand: 'right' },
    { note: 'C3', beat: 0, beats: 4, hand: 'left' }, { note: 'C3', beat: 4, beats: 3, hand: 'left' },
    { note: 'C3', beat: 8, beats: 4, hand: 'left' }, { note: 'G2', beat: 12, beats: 4, hand: 'left' },
    { note: 'C3', beat: 16, beats: 4, hand: 'left' }, { note: 'C3', beat: 20, beats: 4, hand: 'left' },
    { note: 'C3', beat: 24, beats: 4, hand: 'left' }, { note: 'C3', beat: 28, beats: 4, hand: 'left' },
  ],
})

writeSong({
  id: 'unit02-mary-had-a-little-lamb',
  title: 'Mary Had a Little Lamb',
  composer: 'Tradicional',
  bpm: 76,
  beatNotes: [
    { note: 'E4', beat: 0, beats: 1, hand: 'right' }, { note: 'D4', beat: 1, beats: 1, hand: 'right' },
    { note: 'C4', beat: 2, beats: 1, hand: 'right' }, { note: 'D4', beat: 3, beats: 1, hand: 'right' },
    { note: 'E4', beat: 4, beats: 1, hand: 'right' }, { note: 'E4', beat: 5, beats: 1, hand: 'right' }, { note: 'E4', beat: 6, beats: 2, hand: 'right' },
    { note: 'D4', beat: 8, beats: 1, hand: 'right' }, { note: 'D4', beat: 9, beats: 1, hand: 'right' }, { note: 'D4', beat: 10, beats: 2, hand: 'right' },
    { note: 'E4', beat: 12, beats: 1, hand: 'right' }, { note: 'G4', beat: 13, beats: 1, hand: 'right' }, { note: 'G4', beat: 14, beats: 2, hand: 'right' },
    { note: 'E4', beat: 16, beats: 1, hand: 'right' }, { note: 'D4', beat: 17, beats: 1, hand: 'right' },
    { note: 'C4', beat: 18, beats: 1, hand: 'right' }, { note: 'D4', beat: 19, beats: 1, hand: 'right' },
    { note: 'E4', beat: 20, beats: 1, hand: 'right' }, { note: 'E4', beat: 21, beats: 1, hand: 'right' },
    { note: 'E4', beat: 22, beats: 1, hand: 'right' }, { note: 'E4', beat: 23, beats: 1, hand: 'right' },
    { note: 'D4', beat: 24, beats: 1, hand: 'right' }, { note: 'D4', beat: 25, beats: 1, hand: 'right' },
    { note: 'E4', beat: 26, beats: 1, hand: 'right' }, { note: 'D4', beat: 27, beats: 1, hand: 'right' },
    { note: 'C4', beat: 28, beats: 4, hand: 'right' },
  ],
})

writeSong({
  id: 'unit02-row-row-row-your-boat',
  title: 'Row, Row, Row Your Boat',
  composer: 'Tradicional',
  bpm: 92,
  beatNotes: [
    { note: 'C4', beat: 0, beats: 1, hand: 'right' }, { note: 'C4', beat: 1, beats: 1, hand: 'right' }, { note: 'C4', beat: 2, beats: 1, hand: 'right' },
    { note: 'D4', beat: 3, beats: 1, hand: 'right' }, { note: 'E4', beat: 4, beats: 2, hand: 'right' },
    { note: 'E4', beat: 6, beats: 1, hand: 'right' }, { note: 'D4', beat: 7, beats: 1, hand: 'right' },
    { note: 'E4', beat: 8, beats: 1, hand: 'right' }, { note: 'F4', beat: 9, beats: 1, hand: 'right' }, { note: 'G4', beat: 10, beats: 2, hand: 'right' },
    { note: 'C5', beat: 12, beats: 1, hand: 'right' }, { note: 'C5', beat: 13, beats: 1, hand: 'right' }, { note: 'C5', beat: 14, beats: 1, hand: 'right' },
    { note: 'G4', beat: 15, beats: 1, hand: 'right' }, { note: 'G4', beat: 16, beats: 1, hand: 'right' }, { note: 'G4', beat: 17, beats: 1, hand: 'right' },
    { note: 'E4', beat: 18, beats: 1, hand: 'right' }, { note: 'E4', beat: 19, beats: 1, hand: 'right' }, { note: 'E4', beat: 20, beats: 1, hand: 'right' },
    { note: 'C4', beat: 21, beats: 1, hand: 'right' }, { note: 'C4', beat: 22, beats: 1, hand: 'right' }, { note: 'C4', beat: 23, beats: 1, hand: 'right' },
    { note: 'G4', beat: 24, beats: 1, hand: 'right' }, { note: 'F4', beat: 25, beats: 1, hand: 'right' },
    { note: 'E4', beat: 26, beats: 1, hand: 'right' }, { note: 'D4', beat: 27, beats: 1, hand: 'right' }, { note: 'C4', beat: 28, beats: 2, hand: 'right' },
    { note: 'C3', beat: 0, beats: 6, hand: 'left' }, { note: 'C3', beat: 6, beats: 6, hand: 'left' },
    { note: 'C3', beat: 12, beats: 12, hand: 'left' }, { note: 'G2', beat: 24, beats: 3, hand: 'left' }, { note: 'C3', beat: 27, beats: 3, hand: 'left' },
  ],
})

writeSong({
  id: 'unit03-twinkle-twinkle-little-star',
  title: 'Twinkle Twinkle Little Star',
  composer: 'Tradicional',
  bpm: 100,
  beatNotes: [
    { note: 'C4', beat: 0, beats: 1, hand: 'right' }, { note: 'C4', beat: 1, beats: 1, hand: 'right' },
    { note: 'G4', beat: 2, beats: 1, hand: 'right' }, { note: 'G4', beat: 3, beats: 1, hand: 'right' },
    { note: 'A4', beat: 4, beats: 1, hand: 'right' }, { note: 'A4', beat: 5, beats: 1, hand: 'right' }, { note: 'G4', beat: 6, beats: 2, hand: 'right' },
    { note: 'F4', beat: 8, beats: 1, hand: 'right' }, { note: 'F4', beat: 9, beats: 1, hand: 'right' },
    { note: 'E4', beat: 10, beats: 1, hand: 'right' }, { note: 'E4', beat: 11, beats: 1, hand: 'right' },
    { note: 'D4', beat: 12, beats: 1, hand: 'right' }, { note: 'D4', beat: 13, beats: 1, hand: 'right' }, { note: 'C4', beat: 14, beats: 2, hand: 'right' },
    { note: 'C3', beat: 0, beats: 2, hand: 'left' }, { note: 'G2', beat: 2, beats: 2, hand: 'left' },
    { note: 'A2', beat: 4, beats: 2, hand: 'left' }, { note: 'F2', beat: 6, beats: 2, hand: 'left' },
    { note: 'F2', beat: 8, beats: 2, hand: 'left' }, { note: 'C3', beat: 10, beats: 2, hand: 'left' },
    { note: 'G2', beat: 12, beats: 2, hand: 'left' }, { note: 'C3', beat: 14, beats: 2, hand: 'left' },
  ],
})

writeSong({
  id: 'unit04-hot-cross-buns',
  title: 'Hot Cross Buns',
  composer: 'Tradicional',
  bpm: 100,
  beatNotes: [
    { note: 'E4', beat: 0, beats: 1, hand: 'right' }, { note: 'D4', beat: 1, beats: 1, hand: 'right' }, { note: 'C4', beat: 2, beats: 2, hand: 'right' },
    { note: 'E4', beat: 4, beats: 1, hand: 'right' }, { note: 'D4', beat: 5, beats: 1, hand: 'right' }, { note: 'C4', beat: 6, beats: 2, hand: 'right' },
    { note: 'C4', beat: 8, beats: 0.5, hand: 'right' }, { note: 'C4', beat: 8.5, beats: 0.5, hand: 'right' },
    { note: 'C4', beat: 9, beats: 0.5, hand: 'right' }, { note: 'C4', beat: 9.5, beats: 0.5, hand: 'right' },
    { note: 'D4', beat: 10, beats: 0.5, hand: 'right' }, { note: 'D4', beat: 10.5, beats: 0.5, hand: 'right' },
    { note: 'D4', beat: 11, beats: 0.5, hand: 'right' }, { note: 'D4', beat: 11.5, beats: 0.5, hand: 'right' },
    { note: 'E4', beat: 12, beats: 1, hand: 'right' }, { note: 'D4', beat: 13, beats: 1, hand: 'right' }, { note: 'C4', beat: 14, beats: 2, hand: 'right' },
    { note: 'C3', beat: 0, beats: 8, hand: 'left' }, { note: 'G2', beat: 8, beats: 4, hand: 'left' }, { note: 'C3', beat: 12, beats: 4, hand: 'left' },
  ],
})

writeSong({
  id: 'unit04-ode-to-joy',
  title: 'Ode to Joy (theme)',
  composer: 'Beethoven',
  bpm: 112,
  beatNotes: [
    { note: 'E4', beat: 0, beats: 1, hand: 'right' }, { note: 'E4', beat: 1, beats: 1, hand: 'right' },
    { note: 'F4', beat: 2, beats: 1, hand: 'right' }, { note: 'G4', beat: 3, beats: 1, hand: 'right' },
    { note: 'G4', beat: 4, beats: 1, hand: 'right' }, { note: 'F4', beat: 5, beats: 1, hand: 'right' },
    { note: 'E4', beat: 6, beats: 1, hand: 'right' }, { note: 'D4', beat: 7, beats: 1, hand: 'right' },
    { note: 'C4', beat: 8, beats: 1, hand: 'right' }, { note: 'C4', beat: 9, beats: 1, hand: 'right' },
    { note: 'D4', beat: 10, beats: 1, hand: 'right' }, { note: 'E4', beat: 11, beats: 1, hand: 'right' },
    { note: 'E4', beat: 12, beats: 1.5, hand: 'right' }, { note: 'D4', beat: 13.5, beats: 0.5, hand: 'right' },
    { note: 'D4', beat: 14, beats: 2, hand: 'right' },
    { note: 'C3', beat: 0, beats: 4, hand: 'left' }, { note: 'G2', beat: 4, beats: 4, hand: 'left' },
    { note: 'C3', beat: 8, beats: 4, hand: 'left' }, { note: 'G2', beat: 12, beats: 4, hand: 'left' },
  ],
})

writeSong({
  id: 'unit06-amazing-grace',
  title: 'Amazing Grace',
  composer: 'Tradicional (himno "New Britain")',
  bpm: 76,
  timeSignature: [3, 4],
  beatNotes: [
    { note: 'G4', beat: 0, beats: 1, hand: 'right' }, { note: 'B4', beat: 1, beats: 1, hand: 'right' }, { note: 'B4', beat: 2, beats: 1, hand: 'right' },
    { note: 'D5', beat: 3, beats: 1, hand: 'right' }, { note: 'B4', beat: 4, beats: 1, hand: 'right' }, { note: 'G4', beat: 5, beats: 1, hand: 'right' },
    { note: 'E4', beat: 6, beats: 1, hand: 'right' }, { note: 'D4', beat: 7, beats: 2, hand: 'right' },
    { note: 'G4', beat: 9, beats: 1, hand: 'right' }, { note: 'B4', beat: 10, beats: 1, hand: 'right' }, { note: 'B4', beat: 11, beats: 1, hand: 'right' },
    { note: 'D5', beat: 12, beats: 1, hand: 'right' }, { note: 'B4', beat: 13, beats: 1, hand: 'right' }, { note: 'G4', beat: 14, beats: 1, hand: 'right' },
    { note: 'E4', beat: 15, beats: 1, hand: 'right' }, { note: 'D4', beat: 16, beats: 2, hand: 'right' },
    { note: 'B4', beat: 18, beats: 1, hand: 'right' }, { note: 'D5', beat: 19, beats: 1, hand: 'right' }, { note: 'B4', beat: 20, beats: 1, hand: 'right' },
    { note: 'G4', beat: 21, beats: 1, hand: 'right' }, { note: 'E4', beat: 22, beats: 1, hand: 'right' }, { note: 'D4', beat: 23, beats: 1, hand: 'right' },
    { note: 'G4', beat: 24, beats: 3, hand: 'right' },
    { note: 'G2', beat: 0, beats: 9, hand: 'left' }, { note: 'D3', beat: 9, beats: 6, hand: 'left' }, { note: 'G2', beat: 15, beats: 9, hand: 'left' }, { note: 'G2', beat: 24, beats: 3, hand: 'left' },
  ],
})

writeSong({
  id: 'unit06-eine-kleine-nachtmusik-motif',
  title: 'Eine Kleine Nachtmusik — motivo simplificado',
  composer: 'Motivo original inspirado en Mozart (no es transcripción literal)',
  bpm: 120,
  beatNotes: [
    { note: 'G4', beat: 0, beats: 0.5, hand: 'right' }, { note: 'B4', beat: 0.5, beats: 0.5, hand: 'right' },
    { note: 'D5', beat: 1, beats: 0.5, hand: 'right' }, { note: 'G5', beat: 1.5, beats: 0.5, hand: 'right' },
    { note: 'F#5', beat: 2, beats: 0.5, hand: 'right' }, { note: 'E5', beat: 2.5, beats: 0.5, hand: 'right' },
    { note: 'D5', beat: 3, beats: 0.5, hand: 'right' }, { note: 'C5', beat: 3.5, beats: 0.5, hand: 'right' },
    { note: 'B4', beat: 4, beats: 1, hand: 'right' }, { note: 'A4', beat: 5, beats: 1, hand: 'right' }, { note: 'G4', beat: 6, beats: 2, hand: 'right' },
    { note: 'G2', beat: 0, beats: 4, hand: 'left' }, { note: 'D3', beat: 4, beats: 4, hand: 'left' },
  ],
})

writeSong({
  id: 'unit07-can-can-motif',
  title: 'Can-Can (Infernal Galop) — motivo simplificado',
  composer: 'Motivo original inspirado en Offenbach (no es transcripción literal)',
  bpm: 160,
  beatNotes: [
    { note: 'C4', beat: 0, beats: 0.5, hand: 'right' }, { note: 'D4', beat: 0.5, beats: 0.5, hand: 'right' },
    { note: 'E4', beat: 1, beats: 0.5, hand: 'right' }, { note: 'F4', beat: 1.5, beats: 0.5, hand: 'right' },
    { note: 'G4', beat: 2, beats: 0.5, hand: 'right' }, { note: 'A4', beat: 2.5, beats: 0.5, hand: 'right' },
    { note: 'B4', beat: 3, beats: 0.5, hand: 'right' }, { note: 'C5', beat: 3.5, beats: 0.5, hand: 'right' },
    { note: 'C5', beat: 4, beats: 1, hand: 'right' }, { note: 'G4', beat: 5, beats: 1, hand: 'right' },
    { note: 'C5', beat: 6, beats: 1, hand: 'right' }, { note: 'G4', beat: 7, beats: 1, hand: 'right' },
    { note: 'E4', beat: 8, beats: 2, hand: 'right' }, { note: 'C4', beat: 10, beats: 2, hand: 'right' },
    { note: 'C3', beat: 0, beats: 4, hand: 'left' }, { note: 'G2', beat: 4, beats: 4, hand: 'left' }, { note: 'C3', beat: 8, beats: 4, hand: 'left' },
  ],
})

writeSong({
  id: 'unit08-danny-boy-motif',
  title: 'Danny Boy (Londonderry Air) — frase simplificada',
  composer: 'Motivo original inspirado en el aire tradicional (no es transcripción literal)',
  bpm: 66,
  beatNotes: [
    { note: 'D4', beat: 0, beats: 1, hand: 'right' }, { note: 'G4', beat: 1, beats: 1, hand: 'right' },
    { note: 'B4', beat: 2, beats: 1, hand: 'right' }, { note: 'A4', beat: 3, beats: 2, hand: 'right' },
    { note: 'G4', beat: 5, beats: 1, hand: 'right' }, { note: 'F#4', beat: 6, beats: 1, hand: 'right' },
    { note: 'E4', beat: 7, beats: 1, hand: 'right' }, { note: 'D4', beat: 8, beats: 3, hand: 'right' },
    { note: 'D3', beat: 0, beats: 5, hand: 'left' }, { note: 'A2', beat: 5, beats: 3, hand: 'left' }, { note: 'D3', beat: 8, beats: 3, hand: 'left' },
  ],
})

// Original technical exercise: fast two-hand broken chords across a wide
// range, with real left-hand chords — not a real piece, just practice for
// unit 12's sus4 chords and arpeggiated accompaniment.
const arpeggioBeatNotes = []
const arpeggioPattern = ['C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'E5', 'C5']
const arpeggioBassChords = [
  ['C3', 'G3'],
  ['A2', 'E3'],
  ['F2', 'C3'],
  ['G2', 'D3'],
]
for (let bar = 0; bar < 4; bar++) {
  arpeggioPattern.forEach((note, i) => {
    arpeggioBeatNotes.push({ note, beat: bar * 4 + i * 0.5, beats: 0.5, hand: 'right' })
  })
  const [low, high] = arpeggioBassChords[bar % arpeggioBassChords.length]
  arpeggioBeatNotes.push({ note: low, beat: bar * 4, beats: 4, hand: 'left' })
  arpeggioBeatNotes.push({ note: high, beat: bar * 4, beats: 4, hand: 'left' })
}
writeSong({
  id: 'unit12-arpeggio-etude',
  title: 'Two-Hand Arpeggio Étude',
  composer: 'Ejercicio original',
  bpm: 132,
  beatNotes: arpeggioBeatNotes,
})

writeSong({
  id: 'unit12-greensleeves-motif',
  title: 'Greensleeves — frase simplificada',
  composer: 'Tradicional inglés (motivo simplificado)',
  bpm: 90,
  timeSignature: [3, 4],
  beatNotes: [
    { note: 'A4', beat: 0, beats: 1, hand: 'right' }, { note: 'C5', beat: 1, beats: 1, hand: 'right' }, { note: 'D5', beat: 2, beats: 1, hand: 'right' },
    { note: 'E5', beat: 3, beats: 1, hand: 'right' }, { note: 'F5', beat: 4, beats: 1, hand: 'right' }, { note: 'E5', beat: 5, beats: 1, hand: 'right' },
    { note: 'D5', beat: 6, beats: 1, hand: 'right' }, { note: 'B4', beat: 7, beats: 1, hand: 'right' }, { note: 'G4', beat: 8, beats: 1, hand: 'right' },
    { note: 'A4', beat: 9, beats: 3, hand: 'right' },
    { note: 'A2', beat: 0, beats: 6, hand: 'left' }, { note: 'E3', beat: 6, beats: 3, hand: 'left' }, { note: 'A2', beat: 9, beats: 3, hand: 'left' },
  ],
})

writeSong({
  id: 'unit14-the-entertainer-motif',
  title: 'The Entertainer — motivo simplificado',
  composer: 'Motivo original inspirado en Scott Joplin (no es transcripción literal)',
  bpm: 100,
  beatNotes: [
    { note: 'C4', beat: 0, beats: 0.75, hand: 'right' }, { note: 'D4', beat: 0.75, beats: 0.25, hand: 'right' },
    { note: 'E4', beat: 1, beats: 0.5, hand: 'right' }, { note: 'G4', beat: 1.5, beats: 0.5, hand: 'right' },
    { note: 'E4', beat: 2, beats: 0.75, hand: 'right' }, { note: 'D4', beat: 2.75, beats: 0.25, hand: 'right' }, { note: 'C4', beat: 3, beats: 1, hand: 'right' },
    { note: 'C4', beat: 4, beats: 0.75, hand: 'right' }, { note: 'D4', beat: 4.75, beats: 0.25, hand: 'right' },
    { note: 'E4', beat: 5, beats: 0.5, hand: 'right' }, { note: 'G4', beat: 5.5, beats: 0.5, hand: 'right' },
    { note: 'E4', beat: 6, beats: 0.75, hand: 'right' }, { note: 'D4', beat: 6.75, beats: 0.25, hand: 'right' }, { note: 'C4', beat: 7, beats: 1, hand: 'right' },
    { note: 'C3', beat: 0, beats: 4, hand: 'left' }, { note: 'G2', beat: 4, beats: 4, hand: 'left' },
  ],
})

console.log(`Output dir: ${OUT_DIR}`)
