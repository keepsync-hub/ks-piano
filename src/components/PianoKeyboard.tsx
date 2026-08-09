import { useMemo } from 'react'
import { buildKeyboardLayout } from '../piano/layout'
import './PianoKeyboard.css'

interface PianoKeyboardProps {
  heldNotes: Set<number>
  soundingNotes: Set<number>
  requiredNotes: Set<number>
  onNoteOn: (midi: number) => void
  onNoteOff: (midi: number) => void
}

export function PianoKeyboard({ heldNotes, soundingNotes, requiredNotes, onNoteOn, onNoteOff }: PianoKeyboardProps) {
  const layout = useMemo(() => buildKeyboardLayout(), [])
  const widthUnits = layout.whiteKeyCount

  function keyClass(midi: number, black: boolean): string {
    const classes = ['key', black ? 'key-black' : 'key-white']
    if (heldNotes.has(midi)) classes.push('key-held')
    else if (requiredNotes.has(midi)) classes.push('key-required')
    else if (soundingNotes.has(midi)) classes.push('key-sounding')
    return classes.join(' ')
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

  return (
    <div className="piano-keyboard" style={{ ['--white-count' as string]: widthUnits }}>
      <div className="keys-layer">
        {whiteKeys.map((k) => (
          <button
            key={k.midi}
            type="button"
            aria-label={`Key ${k.midi}`}
            className={keyClass(k.midi, false)}
            style={{ left: `${(k.x / widthUnits) * 100}%`, width: `${(k.width / widthUnits) * 100}%` }}
            {...bind(k.midi)}
          />
        ))}
        {blackKeys.map((k) => (
          <button
            key={k.midi}
            type="button"
            aria-label={`Key ${k.midi}`}
            className={keyClass(k.midi, true)}
            style={{ left: `${(k.x / widthUnits) * 100}%`, width: `${(k.width / widthUnits) * 100}%` }}
            {...bind(k.midi)}
          />
        ))}
      </div>
    </div>
  )
}
