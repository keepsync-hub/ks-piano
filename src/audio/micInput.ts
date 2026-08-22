import * as Tone from 'tone'
import { createNoteTracker, detectNotes } from './pitchDetect'

/**
 * Microphone input: listens to the device's microphone and reports the notes
 * it hears as note on/off events, so a real piano can drive practice mode the
 * way a MIDI cable would. Deliberately shaped like `connectMidiInputs`.
 */

export type MicStatus =
  | 'off'
  | 'requesting'
  /** Permission granted, but the browser will not process audio until the page is clicked. */
  | 'waiting'
  | 'listening'
  | 'denied'
  | 'unsupported'

export interface MicInfo {
  /** Input level, 0-1, for a meter. */
  level: number
  /** Loudest note currently heard, for a readout. */
  midi: number | null
}

export interface MicInputHandlers {
  onNoteOn: (midi: number, velocity: number) => void
  onNoteOff: (midi: number) => void
  /** Ignore a detected pitch — used to drop the app's own playback coming back in. */
  shouldIgnore?: (midi: number) => boolean
  /** Last chance to correct a detected pitch, e.g. an octave slip. */
  correct?: (midi: number) => number
}

export interface MicOptions {
  /** Try to hear more than one note at a time. */
  chordDetection?: boolean
  /** 0-1; higher opens the gate on quieter playing, at the cost of more false notes. */
  sensitivity?: number
}

export interface MicSession {
  stop: () => void
  /** Applies changed settings without dropping the microphone stream. */
  update: (options: MicOptions) => void
  /** Releases held notes and re-arms; a note still sounding must be heard afresh. */
  reset: () => void
  /** Re-measures the noise floor from the next moment of quiet. */
  calibrate: () => void
}

const FFT_SIZE = 8192
const POLL_MS = 30
const CALIBRATE_MS = 1500
/** Status updates are throttled to this, so a level meter does not re-render on every poll. */
const STATUS_MS = 100
const DEFAULT_SENSITIVITY = 0.5

const NOOP_SESSION: MicSession = {
  stop: () => {},
  update: () => {},
  reset: () => {},
  calibrate: () => {},
}

/** Gate thresholds, interpolated from the sensitivity setting. */
function gateFor(sensitivity: number) {
  const s = Math.max(0, Math.min(1, sensitivity))
  return {
    /** How far above the measured noise floor the input has to rise. */
    ratio: 8 - 6 * s,
    /** Absolute floor, so a silent room with a very low noise floor stays shut. */
    floor: 0.01 - 0.008 * s,
  }
}

/**
 * Browsers keep an AudioContext suspended until the page itself has been
 * interacted with, and granting the microphone permission does not count — so
 * a microphone opened on page load would capture nothing until the first
 * click. Resumes now if allowed, and otherwise on the first interaction.
 * Returns a function that detaches the listeners.
 */
function resumeWhenAllowed(context: AudioContext): () => void {
  const events = ['pointerdown', 'keydown', 'touchstart'] as const

  function attempt(): void {
    void context.resume?.().catch(() => {})
  }

  attempt()
  if (context.state === 'running') return () => {}

  function onGesture(): void {
    attempt()
    detach()
  }

  function detach(): void {
    for (const event of events) document.removeEventListener(event, onGesture, true)
  }

  for (const event of events) document.addEventListener(event, onGesture, true)
  return detach
}

export async function connectMicInput(
  handlers: MicInputHandlers,
  onStatus: (status: MicStatus, info?: MicInfo) => void,
  options: MicOptions = {},
): Promise<MicSession> {
  if (!navigator.mediaDevices?.getUserMedia) {
    onStatus('unsupported')
    return NOOP_SESSION
  }

  onStatus('requesting')

  let stream: MediaStream
  try {
    // Noise suppression and automatic gain wreck the harmonic structure the
    // detector reads, and echo cancellation colours the signal too — all off.
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
    })
  } catch {
    onStatus('denied')
    return NOOP_SESSION
  }

  // Deliberately not ensureAudioStarted(): capture needs the context running,
  // not Tone's synth started, and leaving that flag alone keeps the normal
  // gesture-driven Tone.start() intact for playback.
  const context = Tone.getContext().rawContext as unknown as AudioContext
  const stopResuming = resumeWhenAllowed(context)

  const source = context.createMediaStreamSource(stream)
  const highpass = context.createBiquadFilter()
  highpass.type = 'highpass'
  highpass.frequency.value = 40
  const analyser = context.createAnalyser()
  analyser.fftSize = FFT_SIZE
  analyser.smoothingTimeConstant = 0
  source.connect(highpass)
  highpass.connect(analyser)
  // Deliberately not connected to the destination: that would be a howl.

  const binHz = context.sampleRate / analyser.fftSize
  const decibels = new Float32Array(analyser.frequencyBinCount)
  const magnitudes = new Float32Array(analyser.frequencyBinCount)
  const samples = new Float32Array(analyser.fftSize)
  const tracker = createNoteTracker()

  let settings: MicOptions = { chordDetection: false, sensitivity: DEFAULT_SENSITIVITY, ...options }
  let noiseFloor = 0.002
  let calibratingUntil = 0
  let lastStatusAt = 0
  let lastLevel = -1
  let lastMidi: number | null = null

  function emit(changes: ReturnType<typeof tracker.update>): void {
    for (const change of changes) {
      if (change.type === 'off') handlers.onNoteOff(change.midi)
    }
  }

  function poll(): void {
    // Self-correcting: as soon as anything resumes the context — our own
    // listener, or the first note played — this reports 'listening' again.
    if (context.state !== 'running') {
      emit(tracker.reset(performance.now()))
      onStatus('waiting')
      return
    }

    const now = performance.now()
    analyser.getFloatTimeDomainData(samples)

    let sum = 0
    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i]
    const rms = Math.sqrt(sum / samples.length)

    if (now < calibratingUntil) {
      noiseFloor = Math.max(noiseFloor, rms)
    } else {
      // Falls to a quiet room quickly, creeps up on sustained noise slowly, so
      // a held note never raises the floor enough to gate itself out.
      noiseFloor += (rms - noiseFloor) * (rms < noiseFloor ? 0.5 : 0.002)
    }

    const gate = gateFor(settings.sensitivity ?? DEFAULT_SENSITIVITY)
    const open = now >= calibratingUntil && rms > Math.max(noiseFloor * gate.ratio, gate.floor)

    let heard: number[] = []
    if (open) {
      analyser.getFloatFrequencyData(decibels)
      for (let i = 0; i < decibels.length; i++) magnitudes[i] = Math.pow(10, decibels[i] / 20)

      for (const note of detectNotes(magnitudes, binHz, { maxNotes: settings.chordDetection ? 3 : 1 })) {
        if (handlers.shouldIgnore?.(note.midi)) continue
        const midi = handlers.correct?.(note.midi) ?? note.midi
        if (!heard.includes(midi)) heard.push(midi)
      }
    }

    const changes = tracker.update(heard, now)
    const velocity = Math.min(1, Math.max(0.2, rms * 8))
    for (const change of changes) {
      if (change.type === 'on') handlers.onNoteOn(change.midi, velocity)
      else handlers.onNoteOff(change.midi)
    }

    const level = Math.min(1, rms * 12)
    const midi = heard.length > 0 ? heard[0] : null
    const quantised = Math.round(level * 20)
    if (now - lastStatusAt >= STATUS_MS && (quantised !== lastLevel || midi !== lastMidi)) {
      lastStatusAt = now
      lastLevel = quantised
      lastMidi = midi
      onStatus('listening', { level, midi })
    }
  }

  const timer = window.setInterval(poll, POLL_MS)
  onStatus(context.state === 'running' ? 'listening' : 'waiting', { level: 0, midi: null })

  return {
    stop: () => {
      window.clearInterval(timer)
      stopResuming()
      emit(tracker.reset(performance.now()))
      analyser.disconnect()
      highpass.disconnect()
      source.disconnect()
      for (const track of stream.getTracks()) track.stop()
      onStatus('off')
    },
    update: (next: MicOptions) => {
      settings = { ...settings, ...next }
    },
    reset: () => {
      emit(tracker.reset(performance.now()))
    },
    calibrate: () => {
      noiseFloor = 0
      calibratingUntil = performance.now() + CALIBRATE_MS
    },
  }
}
