import { beforeEach, describe, expect, it, vi } from 'vitest'
import { connectMidiOutputs } from './midiOutput'
import { resetMidiAccessForTests } from './midiAccess'

function fakePort(id: string, name: string) {
  return { id, name, send: vi.fn() }
}

function installAccess(ports: ReturnType<typeof fakePort>[]) {
  const access = {
    outputs: new Map(ports.map((p) => [p.id, p as unknown as MIDIOutput])),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
  Object.defineProperty(globalThis.navigator, 'requestMIDIAccess', {
    value: vi.fn().mockResolvedValue(access),
    configurable: true,
  })
  return access
}

describe('connectMidiOutputs', () => {
  beforeEach(() => {
    // The access promise is cached in a module variable, so each case needs a clean slate.
    resetMidiAccessForTests()
    Object.defineProperty(globalThis.navigator, 'requestMIDIAccess', {
      value: undefined,
      configurable: true,
    })
  })

  it('reports no devices and stays inert when Web MIDI is unavailable', async () => {
    const onDevicesChanged = vi.fn()
    const out = await connectMidiOutputs(onDevicesChanged)
    expect(onDevicesChanged).toHaveBeenCalledWith([])
    // Every method must be safe to call — the engine does not branch on support.
    expect(() => {
      out.noteOn(60, 1)
      out.noteOff(60)
      out.allNotesOff()
      out.select('anything')
      out.close()
    }).not.toThrow()
  })

  it('lists the available output ports', async () => {
    installAccess([fakePort('out-1', 'Digital Piano'), fakePort('out-2', 'Synth')])
    const onDevicesChanged = vi.fn()
    await connectMidiOutputs(onDevicesChanged)
    expect(onDevicesChanged).toHaveBeenCalledWith([
      { id: 'out-1', name: 'Digital Piano' },
      { id: 'out-2', name: 'Synth' },
    ])
  })

  it('sends note on and note off on channel 1', async () => {
    const port = fakePort('out-1', 'Digital Piano')
    installAccess([port])
    const out = await connectMidiOutputs(vi.fn())

    out.noteOn(60, 1)
    expect(port.send).toHaveBeenCalledWith([0x90, 60, 127])

    out.noteOff(60)
    expect(port.send).toHaveBeenCalledWith([0x80, 60, 0])
  })

  it('scales velocity but never sends zero, which would read as a note off', async () => {
    const port = fakePort('out-1', 'Digital Piano')
    installAccess([port])
    const out = await connectMidiOutputs(vi.fn())

    out.noteOn(60, 0.5)
    expect(port.send).toHaveBeenCalledWith([0x90, 60, 64])

    out.noteOn(62, 0.001)
    expect(port.send).toHaveBeenCalledWith([0x90, 62, 1])

    out.noteOn(64, 5)
    expect(port.send).toHaveBeenCalledWith([0x90, 64, 127])
  })

  it('ignores a note off for a pitch it never sounded', async () => {
    const port = fakePort('out-1', 'Digital Piano')
    installAccess([port])
    const out = await connectMidiOutputs(vi.fn())

    out.noteOff(60)
    expect(port.send).not.toHaveBeenCalled()
  })

  it('releases sounding notes and panics on allNotesOff', async () => {
    const port = fakePort('out-1', 'Digital Piano')
    installAccess([port])
    const out = await connectMidiOutputs(vi.fn())

    out.noteOn(60, 1)
    out.noteOn(64, 1)
    port.send.mockClear()
    out.allNotesOff()

    expect(port.send).toHaveBeenCalledWith([0x80, 60, 0])
    expect(port.send).toHaveBeenCalledWith([0x80, 64, 0])
    expect(port.send).toHaveBeenCalledWith([0xb0, 120, 0])
    expect(port.send).toHaveBeenCalledWith([0xb0, 123, 0])

    // The notes are forgotten, so a second panic does not re-release them.
    port.send.mockClear()
    out.allNotesOff()
    expect(port.send).not.toHaveBeenCalledWith([0x80, 60, 0])
  })

  it('silences the old port before switching, then sends to the new one', async () => {
    const first = fakePort('out-1', 'Digital Piano')
    const second = fakePort('out-2', 'Synth')
    installAccess([first, second])
    const out = await connectMidiOutputs(vi.fn())

    out.noteOn(60, 1)
    out.select('out-2')
    expect(first.send).toHaveBeenCalledWith([0x80, 60, 0])

    out.noteOn(62, 1)
    expect(second.send).toHaveBeenCalledWith([0x90, 62, 127])
    expect(first.send).not.toHaveBeenCalledWith([0x90, 62, 127])
  })

  it('flushes the instrument when closed', async () => {
    const port = fakePort('out-1', 'Digital Piano')
    const access = installAccess([port])
    const out = await connectMidiOutputs(vi.fn())

    out.noteOn(60, 1)
    out.close()
    expect(port.send).toHaveBeenCalledWith([0x80, 60, 0])
    expect(access.removeEventListener).toHaveBeenCalled()
  })
})
