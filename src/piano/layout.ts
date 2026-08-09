export const LOWEST_MIDI = 21 // A0
export const HIGHEST_MIDI = 108 // C8

const PITCH_CLASS_IS_BLACK = [
  false, // C
  true, // C#
  false, // D
  true, // D#
  false, // E
  false, // F
  true, // F#
  false, // G
  true, // G#
  false, // A
  true, // A#
  false, // B
]

export function isBlackKey(midi: number): boolean {
  return PITCH_CLASS_IS_BLACK[midi % 12]
}

export interface KeyRect {
  midi: number
  black: boolean
  /** Left edge in white-key units */
  x: number
  /** Width in white-key units */
  width: number
}

export interface KeyboardLayout {
  keys: KeyRect[]
  whiteKeyCount: number
  blackWidth: number
}

/** Classic "advance white-key cursor, black keys sit on the boundary" layout algorithm. */
export function buildKeyboardLayout(): KeyboardLayout {
  const blackWidth = 0.6
  const keys: KeyRect[] = []
  let whiteCursor = 0

  for (let midi = LOWEST_MIDI; midi <= HIGHEST_MIDI; midi++) {
    if (isBlackKey(midi)) {
      keys.push({
        midi,
        black: true,
        x: whiteCursor - blackWidth / 2,
        width: blackWidth,
      })
    } else {
      keys.push({
        midi,
        black: false,
        x: whiteCursor,
        width: 1,
      })
      whiteCursor += 1
    }
  }

  return { keys, whiteKeyCount: whiteCursor, blackWidth }
}

export function keyByMidi(layout: KeyboardLayout, midi: number): KeyRect | undefined {
  return layout.keys.find((k) => k.midi === midi)
}
