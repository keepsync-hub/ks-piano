import { beforeEach, describe, expect, it, vi } from 'vitest'
import { connectMidiInputs } from './midiInput'
import { resetMidiAccessForTests } from './midiAccess'

describe('connectMidiInputs', () => {
  beforeEach(() => {
    // The access promise is cached in a module variable, so each case needs a clean slate.
    resetMidiAccessForTests()
    Object.defineProperty(globalThis.navigator, 'requestMIDIAccess', {
      value: undefined,
      configurable: true,
    })
  })

  it('returns empty device list when Web MIDI is unavailable', async () => {
    const onDevicesChanged = vi.fn()
    const cleanup = await connectMidiInputs({ onNoteOn: vi.fn(), onNoteOff: vi.fn() }, onDevicesChanged)
    expect(onDevicesChanged).toHaveBeenCalledWith([])
    expect(cleanup).toBeInstanceOf(Function)
    cleanup()
  })

  it('forwards note on/off messages from a MIDI input', async () => {
    const onNoteOn = vi.fn()
    const onNoteOff = vi.fn()
    const onDevicesChanged = vi.fn()

    const input = {
      name: 'Test Keyboard',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }

    const access = {
      inputs: new Map([['input-1', input as unknown as MIDIInput]]),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }

    Object.defineProperty(globalThis.navigator, 'requestMIDIAccess', {
      value: vi.fn().mockResolvedValue(access),
      configurable: true,
    })

    await connectMidiInputs({ onNoteOn, onNoteOff }, onDevicesChanged)

    const listener = input.addEventListener.mock.calls[0][1] as (e: { data: Uint8Array }) => void

    // Note on C4 velocity 127
    listener({ data: new Uint8Array([0x90, 60, 127]) })
    expect(onNoteOn).toHaveBeenCalledWith(60, 1)

    // Note off C4
    listener({ data: new Uint8Array([0x80, 60, 0]) })
    expect(onNoteOff).toHaveBeenCalledWith(60)

    // Note on with zero velocity is treated as note off
    onNoteOff.mockClear()
    listener({ data: new Uint8Array([0x90, 62, 0]) })
    expect(onNoteOff).toHaveBeenCalledWith(62)
  })
})
