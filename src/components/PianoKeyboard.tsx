import { useMemo } from 'react'
import { buildKeyboardLayout } from '../piano/layout'
import type { Hand } from '../types'
import './PianoKeyboard.css'

interface PianoKeyboardProps {
  heldNotes: Set<number>
  soundingNotes: Set<number>
  requiredNotes: Set<number>
  /** Which hand each currently-sounding note belongs to, for colour coding. */
  soundingHands?: Map<number, Hand>
  /** Suggested finger (1-5) to play each lit key with. */
  fingers?: Map<number, number>
  showFingering?: boolean
  /** MIDI note that was just played incorrectly (flashes red). */
  errorFlash?: number | null
  /** MIDI note that was just played correctly (flashes green, briefly). */
  successFlash?: number | null
  onNoteOn: (midi: number) => void
  onNoteOff: (midi: number) => void
}

export function PianoKeyboard({
  heldNotes,
  soundingNotes,
  requiredNotes,
  soundingHands,
  fingers,
  showFingering = false,
  errorFlash,
  successFlash,
  onNoteOn,
  onNoteOff,
}: PianoKeyboardProps) {
  const layout = useMemo(() => buildKeyboardLayout(), [])
  const widthUnits = layout.whiteKeyCount

  function keyState(midi: number): string | null {
    if (errorFlash === midi) return 'error'
    if (successFlash === midi) return 'success'
    if (heldNotes.has(midi)) return 'input'
    if (requiredNotes.has(midi)) return 'required'
    if (soundingNotes.has(midi)) return soundingHands?.get(midi) === 'left' ? 'left' : 'right'
    return null
  }

  function bind(midi: number) {
    return {
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault()
        onNoteOn(midi)
        try {
          ;(e.target as Element).setPointerCapture?.(e.pointerId)
        } catch {
          // Pointer capture is best-effort (e.g. unsupported/synthetic pointers); the note must still play.
        }
      },
      onPointerUp: () => onNoteOff(midi),
      onPointerLeave: (e: React.PointerEvent) => {
        if (e.buttons > 0) onNoteOff(midi)
      },
      onPointerCancel: () => onNoteOff(midi),
    }
  }

  const whiteKeys = layout.keys.filter((k) => !k.black)
  const blackKeys = layout.keys.filter((k) => k.black)

  function renderKey(midi: number, x: number, width: number, black: boolean) {
    const state = keyState(midi)
    const finger = showFingering ? fingers?.get(midi) : undefined
    const classes = ['key', black ? 'key-black' : 'key-white']
    if (state) classes.push(`key-on key-on-${state}`)
    return (
      <button
        key={midi}
        type="button"
        aria-label={`Key ${midi}`}
        data-finger={state && finger ? finger : undefined}
        className={classes.join(' ')}
        style={{ left: `${(x / widthUnits) * 100}%`, width: `${(width / widthUnits) * 100}%` }}
        {...bind(midi)}
      >
        {state && <i className={finger ? 'key-dot key-dot-finger' : 'key-dot'}>{finger ?? ''}</i>}
      </button>
    )
  }

  return (
    <div className="piano-keyboard">
      <div className="keys-layer">
        {whiteKeys.map((k) => renderKey(k.midi, k.x, k.width, false))}
        {blackKeys.map((k) => renderKey(k.midi, k.x, k.width, true))}
      </div>
    </div>
  )
}
