import type { Hand, Song } from '../types'
import { buildSong, type BeatNote } from './buildSong'

/**
 * Practice repertoire for the 32-session study plan built around Adult Piano
 * Adventures® All-in-One Course Book 1 (see ADULT_PIANO_ADVENTURES_PLAN.md at
 * the repo root for the full session-by-session breakdown, and
 * scripts/generate-adult-piano-adventures-midis.mjs, which mirrors this same
 * data as standalone .mid files under practice-plans/).
 *
 * Technique drills are generic pedagogical patterns (pentascales, cadences);
 * repertoire pieces are original simplified arrangements of public-domain
 * tunes, or short motifs "inspired by" a classical theme — not transcriptions
 * of the book's own (copyrighted) arrangements.
 */

const MAJOR_STEPS = [0, 2, 4, 5, 7]
const MINOR_STEPS = [0, 2, 3, 5, 7]

const PITCH_CLASS: Record<string, number> = {
  C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11,
}
const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function noteNameToMidiNum(name: string): number {
  const match = /^([A-Ga-g])(#?)(-?\d+)$/.exec(name)!
  const [, letter, sharp, octaveStr] = match
  return (parseInt(octaveStr, 10) + 1) * 12 + PITCH_CLASS[letter.toUpperCase() + sharp]
}

function midiNumToNoteName(midiNum: number): string {
  const octave = Math.floor(midiNum / 12) - 1
  return `${PITCH_NAMES[midiNum % 12]}${octave}`
}

/** A 5-finger position warm-up: up the pentascale, then back down, with a sustained root note in the left hand. */
function pentascaleWarmup(id: string, title: string, rootNote: string, steps: number[], bpm: number): Song {
  const root = noteNameToMidiNum(rootNote)
  const degrees = steps.map((s) => midiNumToNoteName(root + s))
  const beatNotes: BeatNote[] = []
  degrees.forEach((note, i) => beatNotes.push({ note, beat: i, beats: 1, hand: 'right' }))
  ;[...degrees].reverse().forEach((note, i) => {
    const isLast = i === degrees.length - 1
    beatNotes.push({ note, beat: 5 + i, beats: isLast ? 2 : 1, hand: 'right' })
  })
  const rootLow = midiNumToNoteName(root - 12)
  beatNotes.push({ note: rootLow, beat: 0, beats: 10, hand: 'left' })
  return buildSong(id, title, 'Ejercicio técnico (dominio propio)', bpm, beatNotes)
}

/** A I-IV-V7-I cadence, block chords in the right hand over root-position bass notes. */
function cadenceDrill(id: string, title: string, rootNote: string, bpm: number): Song {
  const root = noteNameToMidiNum(rootNote)
  const maj = (semi: number) => midiNumToNoteName(root + semi)
  const I = [maj(0), maj(4), maj(7)]
  const IV = [maj(5), maj(9), maj(12)]
  const V7 = [maj(7), maj(11), maj(14), maj(17)]
  const beatNotes: BeatNote[] = []
  const chord = (notes: string[], beat: number, beats: number) =>
    notes.forEach((note) => beatNotes.push({ note, beat, beats, hand: 'right' as Hand }))
  chord(I, 0, 2)
  chord(IV, 2, 2)
  chord(V7, 4, 2)
  chord(I, 6, 2)
  const rootLow = midiNumToNoteName(root - 24)
  const fourthLow = midiNumToNoteName(root - 24 + 5)
  const fifthLow = midiNumToNoteName(root - 24 + 7)
  beatNotes.push({ note: rootLow, beat: 0, beats: 2, hand: 'left' })
  beatNotes.push({ note: fourthLow, beat: 2, beats: 2, hand: 'left' })
  beatNotes.push({ note: fifthLow, beat: 4, beats: 2, hand: 'left' })
  beatNotes.push({ note: rootLow, beat: 6, beats: 2, hand: 'left' })
  return buildSong(id, title, 'Ejercicio técnico (dominio propio)', bpm, beatNotes)
}

const unit03CPentascale = pentascaleWarmup('apa-b1-u03-c-pentascale', 'Pentacordio de Do — calentamiento', 'C4', MAJOR_STEPS, 84)
const unit05GPentascale = pentascaleWarmup('apa-b1-u05-g-pentascale', 'Pentacordio de Sol — calentamiento', 'G4', MAJOR_STEPS, 88)
const unit07FPentascale = pentascaleWarmup('apa-b1-u07-f-pentascale', 'Pentacordio de Fa — calentamiento', 'F4', MAJOR_STEPS, 88)
const unit09DPentascale = pentascaleWarmup('apa-b1-u09-d-pentascale', 'Pentacordio de Re — calentamiento', 'D4', MAJOR_STEPS, 92)
const unit11APentascale = pentascaleWarmup('apa-b1-u11-a-pentascale', 'Pentacordio de La — calentamiento', 'A3', MAJOR_STEPS, 92)
const unit13AMinorPentascale = pentascaleWarmup(
  'apa-b1-u13-a-minor-pentascale',
  'Pentacordio de La menor — calentamiento',
  'A3',
  MINOR_STEPS,
  84,
)
const unit08CadenceC = cadenceDrill('apa-b1-u08-cadence-c', 'Cadencia I-IV-V7-I en Do', 'C4', 76)
const unit10CadenceG = cadenceDrill('apa-b1-u10-cadence-g', 'Cadencia I-IV-V7-I en Sol', 'G3', 76)

const unit15CScaleAndCadence = (() => {
  const bpm = 96
  const beatNotes: BeatNote[] = []
  const up = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']
  up.forEach((note, i) => beatNotes.push({ note, beat: i, beats: 1, hand: 'right' }))
  ;[...up].reverse().forEach((note, i) => {
    const isLast = i === up.length - 1
    beatNotes.push({ note, beat: 8 + i, beats: isLast ? 2 : 1, hand: 'right' })
  })
  const chord = (notes: string[], beat: number, beats: number) =>
    notes.forEach((note) => beatNotes.push({ note, beat, beats, hand: 'left' as Hand }))
  chord(['C3', 'E3', 'G3'], 17, 2)
  chord(['F2', 'A2', 'C3'], 19, 2)
  chord(['G2', 'B2', 'D3', 'F3'], 21, 2)
  chord(['C2', 'E2', 'G2'], 23, 2)
  return buildSong(
    'apa-b1-u15-c-scale-and-cadence',
    'Escala de Do Mayor (una octava) + cadencia final',
    'Ejercicio técnico (dominio propio)',
    bpm,
    beatNotes,
  )
})()

const unit01MerrilyWeRollAlong = buildSong('apa-b1-u01-merrily', 'Merrily We Roll Along', 'Tradicional', 100, [
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
])

const unit02RowRowRowYourBoat = buildSong('apa-b1-u02-row-row-row', 'Row, Row, Row Your Boat', 'Tradicional', 92, [
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
])

const unit04HotCrossBuns = buildSong('apa-b1-u04-hot-cross-buns', 'Hot Cross Buns', 'Tradicional', 100, [
  { note: 'E4', beat: 0, beats: 1, hand: 'right' }, { note: 'D4', beat: 1, beats: 1, hand: 'right' }, { note: 'C4', beat: 2, beats: 2, hand: 'right' },
  { note: 'E4', beat: 4, beats: 1, hand: 'right' }, { note: 'D4', beat: 5, beats: 1, hand: 'right' }, { note: 'C4', beat: 6, beats: 2, hand: 'right' },
  { note: 'C4', beat: 8, beats: 0.5, hand: 'right' }, { note: 'C4', beat: 8.5, beats: 0.5, hand: 'right' },
  { note: 'C4', beat: 9, beats: 0.5, hand: 'right' }, { note: 'C4', beat: 9.5, beats: 0.5, hand: 'right' },
  { note: 'D4', beat: 10, beats: 0.5, hand: 'right' }, { note: 'D4', beat: 10.5, beats: 0.5, hand: 'right' },
  { note: 'D4', beat: 11, beats: 0.5, hand: 'right' }, { note: 'D4', beat: 11.5, beats: 0.5, hand: 'right' },
  { note: 'E4', beat: 12, beats: 1, hand: 'right' }, { note: 'D4', beat: 13, beats: 1, hand: 'right' }, { note: 'C4', beat: 14, beats: 2, hand: 'right' },
  { note: 'C3', beat: 0, beats: 8, hand: 'left' }, { note: 'G2', beat: 8, beats: 4, hand: 'left' }, { note: 'C3', beat: 12, beats: 4, hand: 'left' },
])

const unit06AmazingGrace = buildSong(
  'apa-b1-u06-amazing-grace',
  'Amazing Grace',
  'Tradicional (himno "New Britain")',
  76,
  [
    { note: 'G4', beat: 0, beats: 1, hand: 'right' }, { note: 'B4', beat: 1, beats: 1, hand: 'right' }, { note: 'B4', beat: 2, beats: 1, hand: 'right' },
    { note: 'D5', beat: 3, beats: 1, hand: 'right' }, { note: 'B4', beat: 4, beats: 1, hand: 'right' }, { note: 'G4', beat: 5, beats: 1, hand: 'right' },
    { note: 'E4', beat: 6, beats: 1, hand: 'right' }, { note: 'D4', beat: 7, beats: 2, hand: 'right' },
    { note: 'G4', beat: 9, beats: 1, hand: 'right' }, { note: 'B4', beat: 10, beats: 1, hand: 'right' }, { note: 'B4', beat: 11, beats: 1, hand: 'right' },
    { note: 'D5', beat: 12, beats: 1, hand: 'right' }, { note: 'B4', beat: 13, beats: 1, hand: 'right' }, { note: 'G4', beat: 14, beats: 1, hand: 'right' },
    { note: 'E4', beat: 15, beats: 1, hand: 'right' }, { note: 'D4', beat: 16, beats: 2, hand: 'right' },
    { note: 'B4', beat: 18, beats: 1, hand: 'right' }, { note: 'D5', beat: 19, beats: 1, hand: 'right' }, { note: 'B4', beat: 20, beats: 1, hand: 'right' },
    { note: 'G4', beat: 21, beats: 1, hand: 'right' }, { note: 'E4', beat: 22, beats: 1, hand: 'right' }, { note: 'D4', beat: 23, beats: 1, hand: 'right' },
    { note: 'G4', beat: 24, beats: 3, hand: 'right' },
    { note: 'G2', beat: 0, beats: 9, hand: 'left' }, { note: 'D3', beat: 9, beats: 6, hand: 'left' },
    { note: 'G2', beat: 15, beats: 9, hand: 'left' }, { note: 'G2', beat: 24, beats: 3, hand: 'left' },
  ],
  { timeSignature: [3, 4], keySignature: 'G Major' },
)

const unit06EineKleineNachtmusikMotif = buildSong(
  'apa-b1-u06-eine-kleine-nachtmusik',
  'Eine Kleine Nachtmusik — motivo simplificado',
  'Motivo original inspirado en Mozart (no es transcripción literal)',
  120,
  [
    { note: 'G4', beat: 0, beats: 0.5, hand: 'right' }, { note: 'B4', beat: 0.5, beats: 0.5, hand: 'right' },
    { note: 'D5', beat: 1, beats: 0.5, hand: 'right' }, { note: 'G5', beat: 1.5, beats: 0.5, hand: 'right' },
    { note: 'F#5', beat: 2, beats: 0.5, hand: 'right' }, { note: 'E5', beat: 2.5, beats: 0.5, hand: 'right' },
    { note: 'D5', beat: 3, beats: 0.5, hand: 'right' }, { note: 'C5', beat: 3.5, beats: 0.5, hand: 'right' },
    { note: 'B4', beat: 4, beats: 1, hand: 'right' }, { note: 'A4', beat: 5, beats: 1, hand: 'right' }, { note: 'G4', beat: 6, beats: 2, hand: 'right' },
    { note: 'G2', beat: 0, beats: 4, hand: 'left' }, { note: 'D3', beat: 4, beats: 4, hand: 'left' },
  ],
  { keySignature: 'G Major' },
)

const unit07CanCanMotif = buildSong(
  'apa-b1-u07-can-can',
  'The Can-Can (Infernal Galop) — motivo simplificado',
  'Motivo original inspirado en Offenbach (no es transcripción literal)',
  160,
  [
    { note: 'C4', beat: 0, beats: 0.5, hand: 'right' }, { note: 'D4', beat: 0.5, beats: 0.5, hand: 'right' },
    { note: 'E4', beat: 1, beats: 0.5, hand: 'right' }, { note: 'F4', beat: 1.5, beats: 0.5, hand: 'right' },
    { note: 'G4', beat: 2, beats: 0.5, hand: 'right' }, { note: 'A4', beat: 2.5, beats: 0.5, hand: 'right' },
    { note: 'B4', beat: 3, beats: 0.5, hand: 'right' }, { note: 'C5', beat: 3.5, beats: 0.5, hand: 'right' },
    { note: 'C5', beat: 4, beats: 1, hand: 'right' }, { note: 'G4', beat: 5, beats: 1, hand: 'right' },
    { note: 'C5', beat: 6, beats: 1, hand: 'right' }, { note: 'G4', beat: 7, beats: 1, hand: 'right' },
    { note: 'E4', beat: 8, beats: 2, hand: 'right' }, { note: 'C4', beat: 10, beats: 2, hand: 'right' },
    { note: 'C3', beat: 0, beats: 4, hand: 'left' }, { note: 'G2', beat: 4, beats: 4, hand: 'left' }, { note: 'C3', beat: 8, beats: 4, hand: 'left' },
  ],
)

const unit08DannyBoyMotif = buildSong(
  'apa-b1-u08-danny-boy',
  'Danny Boy (Londonderry Air) — frase simplificada',
  'Motivo original inspirado en el aire tradicional (no es transcripción literal)',
  66,
  [
    { note: 'D4', beat: 0, beats: 1, hand: 'right' }, { note: 'G4', beat: 1, beats: 1, hand: 'right' },
    { note: 'B4', beat: 2, beats: 1, hand: 'right' }, { note: 'A4', beat: 3, beats: 2, hand: 'right' },
    { note: 'G4', beat: 5, beats: 1, hand: 'right' }, { note: 'F#4', beat: 6, beats: 1, hand: 'right' },
    { note: 'E4', beat: 7, beats: 1, hand: 'right' }, { note: 'D4', beat: 8, beats: 3, hand: 'right' },
    { note: 'D3', beat: 0, beats: 5, hand: 'left' }, { note: 'A2', beat: 5, beats: 3, hand: 'left' }, { note: 'D3', beat: 8, beats: 3, hand: 'left' },
  ],
  { keySignature: 'D Major' },
)

const unit12GreensleevesMotif = buildSong(
  'apa-b1-u12-greensleeves',
  'Greensleeves — frase simplificada',
  'Tradicional inglés (motivo simplificado)',
  90,
  [
    { note: 'A4', beat: 0, beats: 1, hand: 'right' }, { note: 'C5', beat: 1, beats: 1, hand: 'right' }, { note: 'D5', beat: 2, beats: 1, hand: 'right' },
    { note: 'E5', beat: 3, beats: 1, hand: 'right' }, { note: 'F5', beat: 4, beats: 1, hand: 'right' }, { note: 'E5', beat: 5, beats: 1, hand: 'right' },
    { note: 'D5', beat: 6, beats: 1, hand: 'right' }, { note: 'B4', beat: 7, beats: 1, hand: 'right' }, { note: 'G4', beat: 8, beats: 1, hand: 'right' },
    { note: 'A4', beat: 9, beats: 3, hand: 'right' },
    { note: 'A2', beat: 0, beats: 6, hand: 'left' }, { note: 'E3', beat: 6, beats: 3, hand: 'left' }, { note: 'A2', beat: 9, beats: 3, hand: 'left' },
  ],
  { timeSignature: [3, 4], keySignature: 'A Minor' },
)

const unit14TheEntertainerMotif = buildSong(
  'apa-b1-u14-the-entertainer',
  'The Entertainer — motivo simplificado',
  'Motivo original inspirado en Scott Joplin (no es transcripción literal)',
  100,
  [
    { note: 'C4', beat: 0, beats: 0.75, hand: 'right' }, { note: 'D4', beat: 0.75, beats: 0.25, hand: 'right' },
    { note: 'E4', beat: 1, beats: 0.5, hand: 'right' }, { note: 'G4', beat: 1.5, beats: 0.5, hand: 'right' },
    { note: 'E4', beat: 2, beats: 0.75, hand: 'right' }, { note: 'D4', beat: 2.75, beats: 0.25, hand: 'right' }, { note: 'C4', beat: 3, beats: 1, hand: 'right' },
    { note: 'C4', beat: 4, beats: 0.75, hand: 'right' }, { note: 'D4', beat: 4.75, beats: 0.25, hand: 'right' },
    { note: 'E4', beat: 5, beats: 0.5, hand: 'right' }, { note: 'G4', beat: 5.5, beats: 0.5, hand: 'right' },
    { note: 'E4', beat: 6, beats: 0.75, hand: 'right' }, { note: 'D4', beat: 6.75, beats: 0.25, hand: 'right' }, { note: 'C4', beat: 7, beats: 1, hand: 'right' },
    { note: 'C3', beat: 0, beats: 4, hand: 'left' }, { note: 'G2', beat: 4, beats: 4, hand: 'left' },
  ],
)

export const ADULT_PIANO_ADVENTURES_BOOK1_SONGS: Song[] = [
  unit01MerrilyWeRollAlong,
  unit02RowRowRowYourBoat,
  unit03CPentascale,
  unit04HotCrossBuns,
  unit05GPentascale,
  unit06AmazingGrace,
  unit06EineKleineNachtmusikMotif,
  unit07FPentascale,
  unit07CanCanMotif,
  unit08CadenceC,
  unit08DannyBoyMotif,
  unit09DPentascale,
  unit10CadenceG,
  unit11APentascale,
  unit12GreensleevesMotif,
  unit13AMinorPentascale,
  unit14TheEntertainerMotif,
  unit15CScaleAndCadence,
]
