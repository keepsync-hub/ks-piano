const PITCH_CLASS: Record<string, number> = {
  C: 0,
  'C#': 1,
  DB: 1,
  D: 2,
  'D#': 3,
  EB: 3,
  E: 4,
  F: 5,
  'F#': 6,
  GB: 6,
  G: 7,
  'G#': 8,
  AB: 8,
  A: 9,
  'A#': 10,
  BB: 10,
  B: 11,
}

/** Parses names like "C4", "F#3", "Bb5" into a MIDI note number. */
export function noteNameToMidi(name: string): number {
  const match = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(name.trim())
  if (!match) throw new Error(`Invalid note name: ${name}`)
  const [, letter, accidental, octaveStr] = match
  const key = letter.toUpperCase() + (accidental === '#' ? '#' : accidental === 'b' ? 'B' : '')
  const pitchClass = PITCH_CLASS[key]
  const octave = parseInt(octaveStr, 10)
  return (octave + 1) * 12 + pitchClass
}
