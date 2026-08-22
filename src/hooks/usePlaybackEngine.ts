import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Hand, NoteEvent, PlaybackMode, Song } from '../types'
import { ensureAudioStarted, playNote, releaseNote } from '../audio/synth'
import { playClick } from '../audio/metronome'
import { connectMidiInputs } from '../audio/midiInput'
import { withSuggestedFingering } from '../piano/fingering'

interface NoteGroup {
  time: number
  notes: NoteEvent[]
}

export type HandFilter = 'both' | Hand
/**
 * Where a live note came from. Microphone notes are already audible in the
 * room, so the app must not sound them a second time.
 */
export type NoteSource = 'device' | 'mic'
export interface LoopRegion {
  start: number
  end: number
}

export interface HandMixerState {
  /** 0-1 gain multiplier applied to this hand's auto-played notes. */
  volume: number
  muted: boolean
}

export interface MixerState {
  left: HandMixerState
  right: HandMixerState
  /** When set, only this hand's auto-play is audible (subject to its own mute). */
  solo: Hand | null
}

const DEFAULT_MIXER: MixerState = {
  left: { volume: 1, muted: false },
  right: { volume: 1, muted: false },
  solo: null,
}

const GROUP_EPSILON = 0.05
const COUNT_IN_BEATS = 4
/** Shorter A–B regions are treated as unset rather than looping every frame. */
const MIN_LOOP_SECONDS = 0.25

export function buildGroups(notes: NoteEvent[]): NoteGroup[] {
  const sorted = [...notes].sort((a, b) => a.time - b.time)
  const groups: NoteGroup[] = []
  for (const n of sorted) {
    const last = groups[groups.length - 1]
    if (last && Math.abs(n.time - last.time) < GROUP_EPSILON) {
      last.notes.push(n)
    } else {
      groups.push({ time: n.time, notes: [n] })
    }
  }
  return groups
}

/**
 * Gain multiplier for a hand's auto-played notes — 0 if that hand is muted
 * or another hand is soloed. Only ever applied to notes the app plays on its
 * own (song playback); a user's own live input has no reliable hand
 * association (a MIDI pitch alone can't tell you which hand played it) and
 * is never scaled by this.
 */
export function getHandGain(mixer: MixerState, hand: Hand): number {
  const entry = mixer[hand]
  if (entry.muted) return 0
  if (mixer.solo && mixer.solo !== hand) return 0
  return entry.volume
}

interface PlaybackEngineCallbacks {
  onError?: (midi: number) => void
  onSongComplete?: (songId: string, errors: number, totalNotes: number) => void
  onNotePlayed?: (midi: number, correct: boolean) => void
}

export function usePlaybackEngine(callbacks?: PlaybackEngineCallbacks) {
  const callbacksRef = useRef(callbacks)
  useEffect(() => {
    callbacksRef.current = callbacks
  }, [callbacks])

  const [song, setSongState] = useState<Song | null>(null)
  const [mode, setModeState] = useState<PlaybackMode>('listen')
  const [speed, setSpeedState] = useState(1)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [heldNotes, setHeldNotes] = useState<Set<number>>(new Set())
  const [soundingNotes, setSoundingNotes] = useState<Set<number>>(new Set())
  const [soundingHands, setSoundingHands] = useState<Map<number, Hand>>(new Map())
  const [soundingFingers, setSoundingFingers] = useState<Map<number, number>>(new Map())
  const [clearedGroupIndex, setClearedGroupIndex] = useState(-1)
  const [midiDevices, setMidiDevices] = useState<string[]>([])
  const [notesPlayed, setNotesPlayed] = useState(0)
  const [totalNotes, setTotalNotes] = useState(0)
  const [errors, setErrors] = useState(0)

  const [handFilter, setHandFilterState] = useState<HandFilter>('both')
  const [mixer, setMixerState] = useState<MixerState>(DEFAULT_MIXER)
  const [loop, setLoop] = useState<LoopRegion | null>(null)
  const [loopEnabled, setLoopEnabledState] = useState(true)
  const [metronomeEnabled, setMetronomeEnabledState] = useState(false)
  const [countInEnabled, setCountInEnabled] = useState(true)
  const [countInBeat, setCountInBeat] = useState(0)
  const [inputOctaveShift, setInputOctaveShift] = useState(0)

  const songRef = useRef<Song | null>(null)
  const modeRef = useRef<PlaybackMode>('listen')
  const speedRef = useRef(1)
  const playingRef = useRef(false)
  const heldNotesRef = useRef<Set<number>>(new Set())
  const groupsRef = useRef<NoteGroup[]>([])
  const activeNotesRef = useRef<NoteEvent[]>([])
  const clearedGroupIndexRef = useRef(-1)
  const notesCursorRef = useRef(0)
  const notesPassedRef = useRef(0)
  const errorsRef = useRef(0)
  const requiredNotesRef = useRef<Set<number>>(new Set())
  const requiredTimeRef = useRef<number | null>(null)
  const handFilterRef = useRef<HandFilter>('both')
  const mixerRef = useRef<MixerState>(DEFAULT_MIXER)
  const loopRef = useRef<LoopRegion | null>(null)
  const loopEnabledRef = useRef(true)
  const metronomeRef = useRef(false)
  const lastBeatRef = useRef(Number.NEGATIVE_INFINITY)
  const inputShiftRef = useRef(0)
  const countInTimersRef = useRef<number[]>([])
  const soundingMapRef = useRef<Map<number, { endTime: number; hand: Hand; finger?: number }>>(new Map())
  const clockRef = useRef<{ baseTime: number; startedAt: number | null }>({ baseTime: 0, startedAt: null })

  const isActiveHand = useCallback(
    (hand: Hand) => handFilterRef.current === 'both' || handFilterRef.current === hand,
    [],
  )

  const computeTime = useCallback((): number => {
    const c = clockRef.current
    if (!playingRef.current || c.startedAt === null) return c.baseTime
    const elapsed = ((performance.now() - c.startedAt) / 1000) * speedRef.current
    return c.baseTime + elapsed
  }, [])

  const cancelCountIn = useCallback(() => {
    for (const id of countInTimersRef.current) window.clearTimeout(id)
    countInTimersRef.current = []
    setCountInBeat(0)
  }, [])

  const pauseAt = useCallback((t: number) => {
    clockRef.current = { baseTime: t, startedAt: null }
    playingRef.current = false
    setPlaying(false)
  }, [])

  const resumeFrom = useCallback((t: number) => {
    clockRef.current = { baseTime: t, startedAt: performance.now() }
    playingRef.current = true
    setPlaying(true)
  }, [])

  const recalcCursorsFor = useCallback((t: number) => {
    const notes = songRef.current?.notes ?? []
    let cursor = 0
    while (cursor < notes.length && notes[cursor].time <= t) cursor++
    notesCursorRef.current = cursor

    const active = activeNotesRef.current
    let passed = 0
    while (passed < active.length && active[passed].time <= t) passed++
    notesPassedRef.current = passed
    setNotesPlayed(passed)

    const groups = groupsRef.current
    let idx = -1
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].time < t - 1e-6) idx = i
      else break
    }
    clearedGroupIndexRef.current = idx
    setClearedGroupIndex(idx)

    lastBeatRef.current = Number.NEGATIVE_INFINITY
    soundingMapRef.current.clear()
    setSoundingNotes(new Set())
    setSoundingHands(new Map())
    setSoundingFingers(new Map())
  }, [])

  /** Rebuilds the practice target set whenever the song or the hand filter changes. */
  const rebuildActiveSet = useCallback(
    (targetSong: Song | null, filter: HandFilter, atTime: number) => {
      const notes = targetSong?.notes ?? []
      const active = notes.filter((n) => filter === 'both' || n.hand === filter)
      activeNotesRef.current = active
      groupsRef.current = buildGroups(active)
      setTotalNotes(active.length)
      recalcCursorsFor(atTime)
    },
    [recalcCursorsFor],
  )

  const loadSong = useCallback(
    (incoming: Song) => {
      // Songs arrive without fingering, so suggest one up front; it stays editable.
      const newSong = withSuggestedFingering(incoming)
      songRef.current = newSong
      clockRef.current = { baseTime: 0, startedAt: null }
      playingRef.current = false
      heldNotesRef.current = new Set()
      errorsRef.current = 0
      loopRef.current = null
      soundingMapRef.current.clear()
      setSongState(newSong)
      setTime(0)
      setPlaying(false)
      setHeldNotes(new Set())
      setSoundingNotes(new Set())
      setErrors(0)
      setLoop(null)
      rebuildActiveSet(newSong, handFilterRef.current, 0)
    },
    [rebuildActiveSet],
  )

  const seek = useCallback(
    (t: number) => {
      const dur = songRef.current?.duration ?? 0
      const clamped = Math.max(0, Math.min(t, dur))
      clockRef.current = { baseTime: clamped, startedAt: playingRef.current ? performance.now() : null }
      recalcCursorsFor(clamped)
      setTime(clamped)
    },
    [recalcCursorsFor],
  )

  /** Relative seek that reads the live clock, so shortcut handlers stay stable. */
  const seekBy = useCallback(
    (delta: number) => {
      seek(computeTime() + delta)
    },
    [computeTime, seek],
  )

  const play = useCallback(async () => {
    const current = songRef.current
    if (!current) return
    await ensureAudioStarted()

    // Optional count-in: click through a full bar before the clock starts.
    if (metronomeRef.current && countInEnabled) {
      cancelCountIn()
      const beatMs = ((60 / current.bpm) * 1000) / speedRef.current
      for (let i = 0; i < COUNT_IN_BEATS; i++) {
        const id = window.setTimeout(() => {
          playClick(i === 0)
          setCountInBeat(COUNT_IN_BEATS - i)
        }, i * beatMs)
        countInTimersRef.current.push(id)
      }
      const startId = window.setTimeout(() => {
        countInTimersRef.current = []
        setCountInBeat(0)
        resumeFrom(clockRef.current.baseTime)
      }, COUNT_IN_BEATS * beatMs)
      countInTimersRef.current.push(startId)
      return
    }

    resumeFrom(clockRef.current.baseTime)
  }, [cancelCountIn, countInEnabled, resumeFrom])

  const pause = useCallback(() => {
    cancelCountIn()
    pauseAt(computeTime())
  }, [cancelCountIn, computeTime, pauseAt])

  const togglePlay = useCallback(() => {
    if (playingRef.current || countInTimersRef.current.length > 0) pause()
    else void play()
  }, [pause, play])

  const restart = useCallback(() => {
    cancelCountIn()
    seek(0)
    pauseAt(0)
  }, [cancelCountIn, pauseAt, seek])

  const setSpeed = useCallback(
    (s: number) => {
      const t = computeTime()
      clockRef.current = { baseTime: t, startedAt: playingRef.current ? performance.now() : null }
      speedRef.current = s
      setSpeedState(s)
    },
    [computeTime],
  )

  const setMode = useCallback(
    (m: PlaybackMode) => {
      modeRef.current = m
      setModeState(m)
      recalcCursorsFor(computeTime())
    },
    [computeTime, recalcCursorsFor],
  )

  const setHandFilter = useCallback(
    (filter: HandFilter) => {
      handFilterRef.current = filter
      setHandFilterState(filter)
      rebuildActiveSet(songRef.current, filter, computeTime())
    },
    [computeTime, rebuildActiveSet],
  )

  const setHandVolume = useCallback((hand: Hand, volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume))
    setMixerState((prev) => {
      const next = { ...prev, [hand]: { ...prev[hand], volume: clamped } }
      mixerRef.current = next
      return next
    })
  }, [])

  const setHandMuted = useCallback((hand: Hand, muted: boolean) => {
    setMixerState((prev) => {
      const next = { ...prev, [hand]: { ...prev[hand], muted } }
      mixerRef.current = next
      return next
    })
  }, [])

  const setHandSolo = useCallback((hand: Hand | null) => {
    setMixerState((prev) => {
      const next = { ...prev, solo: hand }
      mixerRef.current = next
      return next
    })
  }, [])

  const setMetronomeEnabled = useCallback(
    (enabled: boolean) => {
      metronomeRef.current = enabled
      setMetronomeEnabledState(enabled)
      if (!enabled) cancelCountIn()
    },
    [cancelCountIn],
  )

  const setLoopEnabled = useCallback((enabled: boolean) => {
    loopEnabledRef.current = enabled
    setLoopEnabledState(enabled)
  }, [])

  const setLoopStart = useCallback(() => {
    const t = computeTime()
    setLoop((prev) => {
      const end = prev && prev.end > t ? prev.end : (songRef.current?.duration ?? t)
      const next = { start: t, end }
      loopRef.current = next
      return next
    })
  }, [computeTime])

  const setLoopEnd = useCallback(() => {
    const t = computeTime()
    setLoop((prev) => {
      const start = prev && prev.start < t ? prev.start : 0
      const next = { start, end: t }
      loopRef.current = next
      return next
    })
  }, [computeTime])

  const clearLoop = useCallback(() => {
    loopRef.current = null
    setLoop(null)
  }, [])

  /**
   * Overrides the suggested finger on the note(s) practice mode is waiting for,
   * so a wrong guess can be corrected in the flow of practising.
   */
  const setFingerForCurrent = useCallback(
    (finger: number) => {
      const current = songRef.current
      const groupTime = requiredTimeRef.current
      if (!current || groupTime === null) return

      // Only the note objects change, not their timing or grouping, so the
      // practice cursors are deliberately left untouched.
      const notes = current.notes.map((n) =>
        Math.abs(n.time - groupTime) < GROUP_EPSILON && isActiveHand(n.hand) ? { ...n, finger } : n,
      )
      const updated = { ...current, notes }
      songRef.current = updated
      setSongState(updated)
    },
    [isActiveHand],
  )

  const noteOn = useCallback(
    (midi: number, velocity = 0.9, source: NoteSource = 'device') => {
      void ensureAudioStarted()
      if (!heldNotesRef.current.has(midi)) {
        heldNotesRef.current.add(midi)
        setHeldNotes(new Set(heldNotesRef.current))

        // In practice mode, a key that isn't part of the note we're waiting on is a miss.
        const required = requiredNotesRef.current
        const isCorrect = required.size === 0 || required.has(midi)
        if (modeRef.current === 'practice' && required.size > 0 && !required.has(midi)) {
          errorsRef.current += 1
          setErrors(errorsRef.current)
          callbacksRef.current?.onError?.(midi)
        }
        callbacksRef.current?.onNotePlayed?.(midi, isCorrect)
      }
      // A note heard through the microphone is being played on a real
      // instrument already — doubling it would also feed the detector back.
      if (source !== 'mic') playNote(midi, velocity)
    },
    [],
  )

  const noteOff = useCallback((midi: number) => {
    heldNotesRef.current.delete(midi)
    setHeldNotes(new Set(heldNotesRef.current))
    releaseNote(midi)
  }, [])

  // External controllers (hardware MIDI, computer keys) go through the octave shift.
  const externalNoteOn = useCallback(
    (midi: number, velocity = 0.9) => noteOn(midi + inputShiftRef.current * 12, velocity),
    [noteOn],
  )
  const externalNoteOff = useCallback((midi: number) => noteOff(midi + inputShiftRef.current * 12), [noteOff])

  useEffect(() => {
    inputShiftRef.current = inputOctaveShift
  }, [inputOctaveShift])

  // Hardware MIDI input.
  useEffect(() => {
    let cleanup: (() => void) | undefined
    connectMidiInputs(
      { onNoteOn: (m, v) => externalNoteOn(m, v), onNoteOff: (m) => externalNoteOff(m) },
      (names) => setMidiDevices(names),
    ).then((fn) => {
      cleanup = fn
    })
    return () => cleanup?.()
  }, [externalNoteOn, externalNoteOff])

  useEffect(() => cancelCountIn, [cancelCountIn])

  // Main animation loop.
  useEffect(() => {
    let raf = 0

    function applyPracticeGate(t: number): number {
      if (modeRef.current !== 'practice') return t
      const groups = groupsRef.current
      const idx = clearedGroupIndexRef.current + 1
      if (idx >= groups.length) return t
      const group = groups[idx]

      if (playingRef.current && t >= group.time) {
        pauseAt(group.time)
        t = group.time
      }

      if (!playingRef.current && Math.abs(clockRef.current.baseTime - group.time) < 1e-6) {
        const required = group.notes.map((n) => n.midi)
        const satisfied = required.every((m) => heldNotesRef.current.has(m))
        if (satisfied) {
          clearedGroupIndexRef.current = idx
          setClearedGroupIndex(idx)
          resumeFrom(group.time)
          t = group.time
        }
      }
      return t
    }

    function frame() {
      let t = computeTime()
      t = applyPracticeGate(t)
      const song = songRef.current

      // Section loop: rewind as soon as the playhead leaves the region.
      // A degenerate (zero-length or inverted) region is ignored, otherwise it
      // would rewind on every single frame and freeze the playhead.
      const activeLoop = loopRef.current
      if (
        song &&
        playingRef.current &&
        loopEnabledRef.current &&
        activeLoop &&
        activeLoop.end - activeLoop.start >= MIN_LOOP_SECONDS &&
        t >= activeLoop.end
      ) {
        seek(activeLoop.start)
        t = activeLoop.start
      }

      if (song && playingRef.current) {
        const listening = modeRef.current === 'listen'
        const notes = song.notes
        let cursor = notesCursorRef.current
        let dirty = false
        while (cursor < notes.length && notes[cursor].time <= t) {
          const n = notes[cursor]
          // Listening plays everything; practising plays only the hand you're not training.
          if (listening || !isActiveHand(n.hand)) {
            // The mixer only attenuates the app's own auto-play, never the
            // user's live input (noteOn/externalNoteOn) — see getHandGain.
            const gain = getHandGain(mixerRef.current, n.hand)
            if (gain > 0) playNote(n.midi, n.velocity * gain, n.duration)
            soundingMapRef.current.set(n.midi, { endTime: n.time + n.duration, hand: n.hand, finger: n.finger })
            dirty = true
          }
          cursor++
        }
        notesCursorRef.current = cursor
        for (const [midi, info] of soundingMapRef.current) {
          if (info.endTime <= t) {
            soundingMapRef.current.delete(midi)
            dirty = true
          }
        }
        if (dirty) {
          setSoundingNotes(new Set(soundingMapRef.current.keys()))
          setSoundingHands(new Map([...soundingMapRef.current].map(([midi, info]) => [midi, info.hand])))
          setSoundingFingers(
            new Map(
              [...soundingMapRef.current]
                .filter(([, info]) => info.finger !== undefined)
                .map(([midi, info]) => [midi, info.finger as number]),
            ),
          )
        }

        if (metronomeRef.current) {
          const secondsPerBeat = 60 / song.bpm
          const beat = Math.floor(t / secondsPerBeat)
          const beatsPerMeasure = song.timeSignature?.[0] ?? 4
          if (beat !== lastBeatRef.current) {
            if (Number.isFinite(lastBeatRef.current)) playClick(beat % beatsPerMeasure === 0)
            lastBeatRef.current = beat
          }
        }
      }

      // Progress counter advances with the playhead in both modes.
      const active = activeNotesRef.current
      let passed = notesPassedRef.current
      while (passed < active.length && active[passed].time <= t) passed++
      if (passed !== notesPassedRef.current) {
        notesPassedRef.current = passed
        setNotesPlayed(passed)
      }

      if (song && playingRef.current && t >= song.duration) {
        pauseAt(song.duration)
        t = song.duration
        callbacksRef.current?.onSongComplete?.(song.id, errorsRef.current, activeNotesRef.current.length)
      }

      setTime(t)
      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [computeTime, isActiveHand, pauseAt, resumeFrom, seek])

  const groups = groupsRef.current
  const nextRequiredNotes = useMemo((): Set<number> => {
    if (mode !== 'practice') return new Set()
    const group = groups[clearedGroupIndex + 1]
    if (!group) return new Set()
    return new Set(group.notes.map((n) => n.midi))
  }, [mode, clearedGroupIndex, groups])

  /** Score time of the group practice mode is waiting on, so highlights can be scoped to it. */
  const nextRequiredTime = useMemo((): number | null => {
    if (mode !== 'practice') return null
    return groups[clearedGroupIndex + 1]?.time ?? null
  }, [mode, clearedGroupIndex, groups])

  /** Finger to show on each lit key: the note you must play next wins over one merely sounding. */
  const keyFingers = useMemo((): Map<number, number> => {
    const merged = new Map(soundingFingers)
    const group = mode === 'practice' ? groups[clearedGroupIndex + 1] : undefined
    for (const n of group?.notes ?? []) {
      if (n.finger !== undefined) merged.set(n.midi, n.finger)
    }
    return merged
  }, [soundingFingers, mode, clearedGroupIndex, groups])

  requiredNotesRef.current = nextRequiredNotes
  requiredTimeRef.current = nextRequiredTime

  const isWaitingForInput = mode === 'practice' && !playing && nextRequiredNotes.size > 0

  return {
    song,
    loadSong,
    mode,
    setMode,
    speed,
    setSpeed,
    playing,
    play,
    pause,
    togglePlay,
    restart,
    seek,
    seekBy,
    time,
    heldNotes,
    soundingNotes,
    soundingHands,
    keyFingers,
    noteOn,
    noteOff,
    setFingerForCurrent,
    externalNoteOn,
    externalNoteOff,
    midiDevices,
    nextRequiredNotes,
    nextRequiredTime,
    isWaitingForInput,
    handFilter,
    setHandFilter,
    mixer,
    setHandVolume,
    setHandMuted,
    setHandSolo,
    loop,
    loopEnabled,
    setLoopEnabled,
    setLoopStart,
    setLoopEnd,
    clearLoop,
    metronomeEnabled,
    setMetronomeEnabled,
    countInEnabled,
    setCountInEnabled,
    countInBeat,
    inputOctaveShift,
    setInputOctaveShift,
    stats: { notesPlayed, totalNotes, errors },
    progress: song && song.duration > 0 ? time / song.duration : 0,
  }
}

export type PlaybackEngine = ReturnType<typeof usePlaybackEngine>
