import { describe, expect, it } from 'vitest'
import { getHandGain } from './usePlaybackEngine'
import type { MixerState } from './usePlaybackEngine'

function mixer(overrides: Partial<MixerState> = {}): MixerState {
  return {
    left: { volume: 1, muted: false },
    right: { volume: 1, muted: false },
    solo: null,
    ...overrides,
  }
}

describe('getHandGain', () => {
  it('returns full volume by default for both hands', () => {
    expect(getHandGain(mixer(), 'left')).toBe(1)
    expect(getHandGain(mixer(), 'right')).toBe(1)
  })

  it('returns 0 for a muted hand', () => {
    const m = mixer({ left: { volume: 1, muted: true } })
    expect(getHandGain(m, 'left')).toBe(0)
    expect(getHandGain(m, 'right')).toBe(1)
  })

  it('applies volume scaling', () => {
    const m = mixer({ right: { volume: 0.5, muted: false } })
    expect(getHandGain(m, 'right')).toBe(0.5)
  })

  it('silences the non-soloed hand', () => {
    const m = mixer({ solo: 'left' })
    expect(getHandGain(m, 'left')).toBe(1)
    expect(getHandGain(m, 'right')).toBe(0)
  })

  it('mute wins even when that hand is soloed', () => {
    const m = mixer({ left: { volume: 1, muted: true }, solo: 'left' })
    expect(getHandGain(m, 'left')).toBe(0)
  })
})
