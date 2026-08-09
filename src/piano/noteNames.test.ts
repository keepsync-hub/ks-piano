import { describe, expect, it } from 'vitest'
import { midiToLabel, midiToOctave } from './noteNames'

describe('midiToLabel', () => {
  it('returns correct pitch class labels', () => {
    expect(midiToLabel(60)).toBe('C')
    expect(midiToLabel(61)).toBe('C#')
    expect(midiToLabel(62)).toBe('D')
    expect(midiToLabel(63)).toBe('D#')
    expect(midiToLabel(64)).toBe('E')
    expect(midiToLabel(65)).toBe('F')
    expect(midiToLabel(66)).toBe('F#')
    expect(midiToLabel(67)).toBe('G')
    expect(midiToLabel(68)).toBe('G#')
    expect(midiToLabel(69)).toBe('A')
    expect(midiToLabel(70)).toBe('A#')
    expect(midiToLabel(71)).toBe('B')
  })

  it('handles negative modulo correctly', () => {
    expect(midiToLabel(0)).toBe('C')
    expect(midiToLabel(-1)).toBe('B')
  })
})

describe('midiToOctave', () => {
  it('returns correct octave numbers', () => {
    expect(midiToOctave(21)).toBe(0) // A0
    expect(midiToOctave(60)).toBe(4) // C4
    expect(midiToOctave(69)).toBe(4) // A4
    expect(midiToOctave(72)).toBe(5) // C5
    expect(midiToOctave(108)).toBe(8) // C8
  })
})
