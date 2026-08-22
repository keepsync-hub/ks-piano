import { afterEach, describe, expect, it, vi } from 'vitest'
import { midiToFrequency } from './pitchDetect'

const { fakeContext } = vi.hoisted(() => ({
  fakeContext: { sampleRate: 48000, state: 'running', resume: () => Promise.resolve() } as unknown as AudioContext,
}))

vi.mock('tone', () => ({ getContext: () => ({ rawContext: fakeContext }) }))

const { connectMicInput } = await import('./micInput')

/** dB spectrum of a note's first eight partials, as the AnalyserNode would report it. */
function decibelsFor(midi: number, bins: number, binHz: number): Float32Array {
  const magnitudes = new Float32Array(bins)
  const f0 = midiToFrequency(midi)
  for (let h = 1; h <= 8; h++) {
    const bin = Math.round((f0 * h) / binHz)
    if (bin < bins) magnitudes[bin] = 1 / h
  }
  return magnitudes.map((m) => 20 * Math.log10(Math.max(m, 1e-9)))
}

function setupAudioGraph(midi: number | null, state: AudioContextState = 'running') {
  const node = { connect: vi.fn(), disconnect: vi.fn() }
  const analyser = {
    fftSize: 2048,
    smoothingTimeConstant: 1,
    frequencyBinCount: 4096,
    connect: vi.fn(),
    disconnect: vi.fn(),
    getFloatTimeDomainData: (buffer: Float32Array) => {
      // Loud enough to open the noise gate, or silence when there is no note.
      buffer.fill(midi === null ? 0 : 0.3)
    },
    getFloatFrequencyData: (buffer: Float32Array) => {
      buffer.set(midi === null ? buffer.fill(-140) : decibelsFor(midi, buffer.length, 48000 / 8192))
    },
  }

  Object.assign(fakeContext, {
    state,
    resume: vi.fn(() => Promise.resolve()),
    createMediaStreamSource: vi.fn(() => node),
    createBiquadFilter: vi.fn(() => ({ ...node, type: '', frequency: { value: 0 } })),
    createAnalyser: vi.fn(() => analyser),
  })
  return analyser
}

function fakeStream() {
  const track = { stop: vi.fn() }
  return { stream: { getTracks: () => [track] } as unknown as MediaStream, track }
}

function stubGetUserMedia(value: MediaStream | Error | null) {
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    value:
      value === null
        ? undefined
        : {
            getUserMedia: vi.fn(() => (value instanceof Error ? Promise.reject(value) : Promise.resolve(value))),
          },
    configurable: true,
  })
}

afterEach(() => {
  vi.useRealTimers()
})

/** The AnalyserNode reads nothing while the context is suspended. */
describe('connectMicInput with a suspended audio context', () => {
  it('says it is waiting for a click rather than pretending to listen', async () => {
    const { stream } = fakeStream()
    stubGetUserMedia(stream)
    setupAudioGraph(60, 'suspended')
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] })

    const onNoteOn = vi.fn()
    const onStatus = vi.fn()
    const session = await connectMicInput({ onNoteOn, onNoteOff: vi.fn() }, onStatus)

    vi.advanceTimersByTime(120)

    expect(onStatus).toHaveBeenLastCalledWith('waiting')
    expect(onNoteOn).not.toHaveBeenCalled()

    session.stop()
  })

  it('resumes the context on the first interaction with the page', async () => {
    const { stream } = fakeStream()
    stubGetUserMedia(stream)
    setupAudioGraph(60, 'suspended')

    const session = await connectMicInput({ onNoteOn: vi.fn(), onNoteOff: vi.fn() }, vi.fn())
    // Once on connecting, and again when the page is finally clicked.
    expect(fakeContext.resume).toHaveBeenCalledTimes(1)

    document.dispatchEvent(new Event('pointerdown'))
    expect(fakeContext.resume).toHaveBeenCalledTimes(2)

    session.stop()
  })

  it('stops listening for interactions once the microphone is closed', async () => {
    const { stream } = fakeStream()
    stubGetUserMedia(stream)
    setupAudioGraph(60, 'suspended')

    const session = await connectMicInput({ onNoteOn: vi.fn(), onNoteOff: vi.fn() }, vi.fn())
    session.stop()

    document.dispatchEvent(new Event('pointerdown'))
    expect(fakeContext.resume).toHaveBeenCalledTimes(1)
  })
})

describe('connectMicInput', () => {
  it('reports an unsupported browser instead of throwing', async () => {
    stubGetUserMedia(null)
    const onStatus = vi.fn()

    const session = await connectMicInput({ onNoteOn: vi.fn(), onNoteOff: vi.fn() }, onStatus)

    expect(onStatus).toHaveBeenCalledWith('unsupported')
    expect(() => session.stop()).not.toThrow()
  })

  it('reports a denied permission instead of throwing', async () => {
    stubGetUserMedia(new Error('NotAllowedError'))
    const onStatus = vi.fn()

    const session = await connectMicInput({ onNoteOn: vi.fn(), onNoteOff: vi.fn() }, onStatus)

    expect(onStatus).toHaveBeenCalledWith('denied')
    expect(() => session.stop()).not.toThrow()
  })

  it('reports the note it hears once it has been heard twice running', async () => {
    const { stream } = fakeStream()
    stubGetUserMedia(stream)
    setupAudioGraph(60)
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] })

    const onNoteOn = vi.fn()
    const session = await connectMicInput({ onNoteOn, onNoteOff: vi.fn() }, vi.fn())

    vi.advanceTimersByTime(30)
    expect(onNoteOn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(30)
    expect(onNoteOn).toHaveBeenCalledWith(60, expect.any(Number))

    session.stop()
  })

  it('passes the expected notes to the detector', async () => {
    const { stream } = fakeStream()
    stubGetUserMedia(stream)
    setupAudioGraph(60)
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] })

    const expectedNotes = vi.fn(() => [60, 64])
    const session = await connectMicInput(
      { onNoteOn: vi.fn(), onNoteOff: vi.fn(), expectedNotes },
      vi.fn(),
      { chordDetection: true },
    )

    vi.advanceTimersByTime(60)
    expect(expectedNotes).toHaveBeenCalled()

    session.stop()
  })

  it('drops a note the app is playing itself, so its own output cannot answer for the user', async () => {
    const { stream } = fakeStream()
    stubGetUserMedia(stream)
    setupAudioGraph(60)
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] })

    const onNoteOn = vi.fn()
    const session = await connectMicInput({ onNoteOn, onNoteOff: vi.fn(), shouldIgnore: (midi) => midi === 60 }, vi.fn())

    vi.advanceTimersByTime(120)
    expect(onNoteOn).not.toHaveBeenCalled()

    session.stop()
  })

  it('releases the note and the microphone track when stopped', async () => {
    const { stream, track } = fakeStream()
    stubGetUserMedia(stream)
    setupAudioGraph(60)
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] })

    const onNoteOff = vi.fn()
    const onStatus = vi.fn()
    const session = await connectMicInput({ onNoteOn: vi.fn(), onNoteOff }, onStatus)

    vi.advanceTimersByTime(60)
    session.stop()

    expect(onNoteOff).toHaveBeenCalledWith(60)
    expect(track.stop).toHaveBeenCalled()
    expect(onStatus).toHaveBeenLastCalledWith('off')
  })
})
