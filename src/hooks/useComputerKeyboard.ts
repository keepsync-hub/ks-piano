import { useEffect, useRef } from 'react'

// One octave plus a bit, starting at C4 - a common "typing piano" layout.
const KEY_TO_MIDI: Record<string, number> = {
  a: 60, // C4
  w: 61, // C#4
  s: 62, // D4
  e: 63, // D#4
  d: 64, // E4
  f: 65, // F4
  t: 66, // F#4
  g: 67, // G4
  y: 68, // G#4
  h: 69, // A4
  u: 70, // A#4
  j: 71, // B4
  k: 72, // C5
  o: 73, // C#5
  l: 74, // D5
  p: 75, // D#5
  ';': 76, // E5
}

export function useComputerKeyboard(onNoteOn: (midi: number) => void, onNoteOff: (midi: number) => void) {
  const heldRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      const el = target as HTMLElement | null
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target) || e.repeat) return
      const key = e.key.toLowerCase()
      const midi = KEY_TO_MIDI[key]
      if (midi === undefined) return
      e.preventDefault()
      if (!heldRef.current.has(key)) {
        heldRef.current.add(key)
        onNoteOn(midi)
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      const key = e.key.toLowerCase()
      const midi = KEY_TO_MIDI[key]
      if (midi === undefined) return
      heldRef.current.delete(key)
      onNoteOff(midi)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [onNoteOn, onNoteOff])
}

export const COMPUTER_KEYBOARD_MAP = KEY_TO_MIDI
