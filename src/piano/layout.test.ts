import { describe, expect, it } from 'vitest'
import { buildKeyboardLayout, isBlackKey, keyByMidi, LOWEST_MIDI, HIGHEST_MIDI } from './layout'

describe('isBlackKey', () => {
  it('returns false for white keys', () => {
    expect(isBlackKey(60)).toBe(false) // C4
    expect(isBlackKey(62)).toBe(false) // D4
    expect(isBlackKey(64)).toBe(false) // E4
    expect(isBlackKey(65)).toBe(false) // F4
    expect(isBlackKey(67)).toBe(false) // G4
    expect(isBlackKey(69)).toBe(false) // A4
    expect(isBlackKey(71)).toBe(false) // B4
  })

  it('returns true for black keys', () => {
    expect(isBlackKey(61)).toBe(true) // C#4
    expect(isBlackKey(63)).toBe(true) // D#4
    expect(isBlackKey(66)).toBe(true) // F#4
    expect(isBlackKey(68)).toBe(true) // G#4
    expect(isBlackKey(70)).toBe(true) // A#4
  })
})

describe('buildKeyboardLayout', () => {
  it('covers the full 88-key range', () => {
    const layout = buildKeyboardLayout()
    expect(layout.keys.length).toBe(HIGHEST_MIDI - LOWEST_MIDI + 1)
    expect(layout.keys[0].midi).toBe(LOWEST_MIDI)
    expect(layout.keys[layout.keys.length - 1].midi).toBe(HIGHEST_MIDI)
  })

  it('white keys have width 1 and black keys are narrower', () => {
    const layout = buildKeyboardLayout()
    const whiteKey = layout.keys.find((k) => k.midi === 60)
    const blackKey = layout.keys.find((k) => k.midi === 61)
    expect(whiteKey?.width).toBe(1)
    expect(blackKey?.width).toBeLessThan(1)
  })

  it('counts white keys correctly', () => {
    const layout = buildKeyboardLayout()
    const whiteCount = layout.keys.filter((k) => !k.black).length
    expect(layout.whiteKeyCount).toBe(whiteCount)
  })
})

describe('keyByMidi', () => {
  it('finds a key by midi number', () => {
    const layout = buildKeyboardLayout()
    expect(keyByMidi(layout, 60)?.midi).toBe(60)
    expect(keyByMidi(layout, 21)?.black).toBe(false)
  })

  it('returns undefined for out-of-range midi', () => {
    const layout = buildKeyboardLayout()
    expect(keyByMidi(layout, 20)).toBeUndefined()
    expect(keyByMidi(layout, 109)).toBeUndefined()
  })
})
