import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { NoteEvent, PlaybackMode, Song } from '../types'
import { ensureAudioStarted, playNote, releaseNote } from '../audio/synth'
import { connectMidiInputs } from '../audio/midiInput'

interface NoteGroup {
  time: number
  notes: NoteEvent[]
}

const GROUP_EPSILON = 0.05

function buildGroups(notes: NoteEvent[]): NoteGroup[] {
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

export type InputSource = 'midi' | 'keyboard' | 'mouse'

export function usePlaybackEngine() {
  const [song, setSongState] = useState<Song | null>(null)
  const [mode, setModeState] = useState<PlaybackMode>('listen')
  const [speed, setSpeedState] = useState(1)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [heldNotes, setHeldNotes] = useState<Set<number>>(new Set())
  const [soundingNotes, setSoundingNotes] = useState<Set<number>>(new Set())
  const [clearedGroupIndex, setClearedGroupIndex] = useState(-1)
  const [midiDevices, setMidiDevices] = useState<string[]>([])

  const songRef = useRef<Song | null>(null)
  const modeRef = useRef<PlaybackMode>('listen')
  const speedRef = useRef(1)
  const playingRef = useRef(false)
  const heldNotesRef = useRef<Set<number>>(new Set())
  const groupsRef = useRef<NoteGroup[]>([])
  const clearedGroupIndexRef = useRef(-1)
  const notesCursorRef = useRef(0)
  const soundingMapRef = useRef<Map<number, number>>(new Map())
  const clockRef = useRef<{ baseTime: number; startedAt: number | null }>({ baseTime: 0, startedAt: null })

  const computeTime = useCallback((): number => {
    const c = clockRef.current
    if (!playingRef.current || c.startedAt === null) return c.baseTime
    const elapsed = ((performance.now() - c.startedAt) / 1000) * speedRef.current
    return c.baseTime + elapsed
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

    const groups = groupsRef.current
    let idx = -1
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].time < t - 1e-6) idx = i
      else break
    }
    clearedGroupIndexRef.current = idx
    setClearedGroupIndex(idx)

    soundingMapRef.current.clear()
    setSoundingNotes(new Set())
  }, [])

  const loadSong = useCallback(
    (newSong: Song) => {
      songRef.current = newSong
      groupsRef.current = buildGroups(newSong.notes)
      clockRef.current = { baseTime: 0, startedAt: null }
      playingRef.current = false
      heldNotesRef.current = new Set()
      notesCursorRef.current = 0
      soundingMapRef.current.clear()
      setSongState(newSong)
      setTime(0)
      setPlaying(false)
      setHeldNotes(new Set())
      setSoundingNotes(new Set())
      recalcCursorsFor(0)
    },
    [recalcCursorsFor],
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

  const play = useCallback(async () => {
    if (!songRef.current) return
    await ensureAudioStarted()
    resumeFrom(clockRef.current.baseTime)
  }, [resumeFrom])

  const pause = useCallback(() => {
    pauseAt(computeTime())
  }, [computeTime, pauseAt])

  const togglePlay = useCallback(() => {
    if (playingRef.current) pause()
    else void play()
  }, [pause, play])

  const restart = useCallback(() => {
    seek(0)
    pauseAt(0)
  }, [pauseAt, seek])

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

  const noteOn = useCallback((midi: number, velocity = 0.9) => {
    void ensureAudioStarted()
    if (!heldNotesRef.current.has(midi)) {
      heldNotesRef.current.add(midi)
      setHeldNotes(new Set(heldNotesRef.current))
    }
    playNote(midi, velocity)
  }, [])

  const noteOff = useCallback((midi: number) => {
    heldNotesRef.current.delete(midi)
    setHeldNotes(new Set(heldNotesRef.current))
    releaseNote(midi)
  }, [])

  // Hardware MIDI input.
  useEffect(() => {
    let cleanup: (() => void) | undefined
    connectMidiInputs(
      { onNoteOn: (m, v) => noteOn(m, v), onNoteOff: (m) => noteOff(m) },
      (names) => setMidiDevices(names),
    ).then((fn) => {
      cleanup = fn
    })
    return () => cleanup?.()
  }, [noteOn, noteOff])

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

      if (song && modeRef.current === 'listen' && playingRef.current) {
        const notes = song.notes
        let cursor = notesCursorRef.current
        let dirty = false
        while (cursor < notes.length && notes[cursor].time <= t) {
          const n = notes[cursor]
          playNote(n.midi, n.velocity, n.duration)
          soundingMapRef.current.set(n.midi, n.time + n.duration)
          dirty = true
          cursor++
        }
        notesCursorRef.current = cursor
        for (const [midi, endTime] of soundingMapRef.current) {
          if (endTime <= t) {
            soundingMapRef.current.delete(midi)
            dirty = true
          }
        }
        if (dirty) setSoundingNotes(new Set(soundingMapRef.current.keys()))
      }

      if (song && playingRef.current && t >= song.duration) {
        pauseAt(song.duration)
        t = song.duration
      }

      setTime(t)
      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [computeTime, pauseAt, resumeFrom])

  const groups = groupsRef.current
  const nextRequiredNotes = useMemo((): Set<number> => {
    if (mode !== 'practice') return new Set()
    const idx = clearedGroupIndex + 1
    const group = groups[idx]
    if (!group) return new Set()
    return new Set(group.notes.map((n) => n.midi))
  }, [mode, clearedGroupIndex, groups])

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
    time,
    heldNotes,
    soundingNotes,
    noteOn,
    noteOff,
    midiDevices,
    nextRequiredNotes,
    isWaitingForInput,
    progress: song && song.duration > 0 ? time / song.duration : 0,
  }
}

export type PlaybackEngine = ReturnType<typeof usePlaybackEngine>
