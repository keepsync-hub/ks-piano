const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/** Pitch-class label without octave, e.g. 60 -> "C", 61 -> "C#". */
export function midiToLabel(midi: number): string {
  return SHARP_NAMES[((midi % 12) + 12) % 12]
}

/** Scientific-pitch octave number, e.g. 60 -> 4. */
export function midiToOctave(midi: number): number {
  return Math.floor(midi / 12) - 1
}
