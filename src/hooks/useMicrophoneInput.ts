import { useCallback, useEffect, useRef, useState } from 'react'
import { connectMicInput, type MicSession, type MicStatus } from '../audio/micInput'

export interface MicSettings {
  /** Try to hear more than one note at a time. Approximate by nature. */
  chordDetection: boolean
  /** Accept a note heard an octave or two off the one practice is waiting for. */
  octaveTolerance: boolean
  sensitivity: number
}

export const DEFAULT_MIC_SETTINGS: MicSettings = {
  chordDetection: true,
  octaveTolerance: true,
  sensitivity: 0.5,
}

/** How long after the app stops sounding a note its echo is still ignored. */
const ECHO_TAIL_MS = 300

interface UseMicrophoneInputArgs {
  enabled: boolean
  settings: MicSettings
  onNoteOn: (midi: number, velocity: number) => void
  onNoteOff: (midi: number) => void
  /** Notes the app is playing itself; the microphone hears them too. */
  soundingNotes: Set<number>
  /** Notes practice mode is waiting for, used for the octave tolerance. */
  requiredNotes: Set<number>
  /** Changes whenever practice mode moves on to the next note or chord. */
  advanceKey: number | null
  /** Called when the microphone turns out to be unusable, so the toggle can go back off. */
  onUnavailable?: () => void
}

export interface MicrophoneInput {
  status: MicStatus
  level: number
  detectedMidi: number | null
  calibrate: () => void
}

/**
 * Feeds microphone-detected notes into the playback engine, the same way
 * `useComputerKeyboard` feeds key presses. Nothing here reaches the engine
 * except note on/off, so every other input source is untouched.
 */
export function useMicrophoneInput({
  enabled,
  settings,
  onNoteOn,
  onNoteOff,
  soundingNotes,
  requiredNotes,
  advanceKey,
  onUnavailable,
}: UseMicrophoneInputArgs): MicrophoneInput {
  const [status, setStatus] = useState<MicStatus>('off')
  const [level, setLevel] = useState(0)
  const [detectedMidi, setDetectedMidi] = useState<number | null>(null)

  const sessionRef = useRef<MicSession | null>(null)
  const handlersRef = useRef({ onNoteOn, onNoteOff, onUnavailable })
  const requiredRef = useRef(requiredNotes)
  const octaveToleranceRef = useRef(settings.octaveTolerance)
  // Notes the app has played recently, with the moment their echo stops mattering.
  const echoRef = useRef<Map<number, number>>(new Map())

  useEffect(() => {
    handlersRef.current = { onNoteOn, onNoteOff, onUnavailable }
  }, [onNoteOn, onNoteOff, onUnavailable])

  useEffect(() => {
    requiredRef.current = requiredNotes
  }, [requiredNotes])

  useEffect(() => {
    octaveToleranceRef.current = settings.octaveTolerance
  }, [settings.octaveTolerance])

  useEffect(() => {
    const now = performance.now()
    for (const midi of soundingNotes) echoRef.current.set(midi, now + ECHO_TAIL_MS)
  }, [soundingNotes])

  const shouldIgnore = useCallback((midi: number): boolean => {
    const until = echoRef.current.get(midi)
    if (until === undefined) return false
    if (until > performance.now()) return true
    echoRef.current.delete(midi)
    return false
  }, [])

  /**
   * An octave slip is the classic pitch-detection error, so a note heard one or
   * two octaves away from the note being waited for is read as that note. It is
   * a deliberate leniency, and switchable off.
   */
  /** The notes the practice gate is waiting for, so the detector can look for them. */
  const expectedNotes = useCallback((): readonly number[] => [...requiredRef.current], [])

  const correct = useCallback((midi: number): number => {
    if (!octaveToleranceRef.current) return midi
    const required = requiredRef.current
    if (required.size === 0 || required.has(midi)) return midi
    for (const shift of [12, -12, 24, -24]) {
      if (required.has(midi + shift)) return midi + shift
    }
    return midi
  }, [])

  useEffect(() => {
    if (!enabled) {
      // A denial switches the microphone off by itself, so blanking the status
      // here would leave the toggle sitting at Off with no reason given.
      setStatus((prev) => (prev === 'denied' || prev === 'unsupported' ? prev : 'off'))
      setLevel(0)
      setDetectedMidi(null)
      return
    }

    let cancelled = false
    let active: MicSession | null = null
    const echo = echoRef.current
    sessionRef.current = null

    connectMicInput(
      {
        onNoteOn: (midi, velocity) => handlersRef.current.onNoteOn(midi, velocity),
        onNoteOff: (midi) => handlersRef.current.onNoteOff(midi),
        shouldIgnore,
        correct,
        expectedNotes,
      },
      (next, info) => {
        if (cancelled) return
        setStatus(next)
        if (info) {
          setLevel(info.level)
          setDetectedMidi(info.midi)
        }
        if (next === 'denied' || next === 'unsupported') handlersRef.current.onUnavailable?.()
      },
    ).then((session) => {
      if (cancelled) {
        session.stop()
        return
      }
      active = session
      sessionRef.current = session
    })

    return () => {
      cancelled = true
      active?.stop()
      echo.clear()
    }
  }, [enabled, shouldIgnore, correct, expectedNotes])

  useEffect(() => {
    sessionRef.current?.update({
      chordDetection: settings.chordDetection,
      sensitivity: settings.sensitivity,
    })
  }, [settings.chordDetection, settings.sensitivity])

  // Practice mode has moved on: drop what is still held so the notes just
  // played cannot satisfy the next chord on their own.
  useEffect(() => {
    sessionRef.current?.reset()
  }, [advanceKey])

  const calibrate = useCallback(() => sessionRef.current?.calibrate(), [])

  return { status, level, detectedMidi, calibrate }
}
