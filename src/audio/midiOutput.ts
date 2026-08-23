import { getMidiAccess } from './midiAccess'

export interface MidiOutputDevice {
  id: string
  name: string
}

export interface MidiOutputController {
  /** Picks the port that receives notes; null falls back to the first available one. */
  select: (id: string | null) => void
  /** velocity is 0-1, matching the app's internal convention. */
  noteOn: (midi: number, velocity: number) => void
  /** No-op for a pitch this controller never sounded, so it can't cut someone else's note. */
  noteOff: (midi: number) => void
  /** Explicit note-offs for everything sounding, then All Sound Off and All Notes Off. */
  allNotesOff: () => void
  close: () => void
}

/** MIDI channel 1. Not configurable — a piano listens on all channels anyway. */
const CHANNEL = 0
const NOTE_ON = 0x90 | CHANNEL
const NOTE_OFF = 0x80 | CHANNEL
const CONTROL_CHANGE = 0xb0 | CHANNEL
const ALL_SOUND_OFF = 120
const ALL_NOTES_OFF = 123

/**
 * A 0-1 gain as a MIDI velocity. The floor of 1 is deliberate: velocity 0 in a
 * note-on message *is* a note-off, so a very quiet note must never round to it.
 * Fully muted notes never reach here — getHandGain returns 0 and the engine
 * skips the send entirely.
 */
function toVelocity7(velocity: number): number {
  return Math.min(127, Math.max(1, Math.round(velocity * 127)))
}

const NOOP_CONTROLLER: MidiOutputController = {
  select: () => {},
  noteOn: () => {},
  noteOff: () => {},
  allNotesOff: () => {},
  close: () => {},
}

/**
 * Connects to the Web MIDI output ports so song playback can be sounded by a
 * connected instrument instead of (or alongside) the in-browser synth.
 *
 * Only the app's own playback is ever sent here — never the user's live input,
 * which would double every note they play and feed back when the same
 * instrument is both the input and the output.
 */
export async function connectMidiOutputs(
  onDevicesChanged: (devices: MidiOutputDevice[]) => void,
): Promise<MidiOutputController> {
  const maybeAccess = await getMidiAccess()
  if (!maybeAccess) {
    onDevicesChanged([])
    return NOOP_CONTROLLER
  }
  const access: MIDIAccess = maybeAccess

  let ports: MIDIOutput[] = []
  let selectedId: string | null = null
  /** Pitches this controller has actually sounded, so note-off stays honest. */
  const active = new Set<number>()

  function currentPort(): MIDIOutput | null {
    if (ports.length === 0) return null
    if (selectedId === null) return ports[0]
    return ports.find((p) => p.id === selectedId) ?? ports[0]
  }

  function send(data: number[]): void {
    const port = currentPort()
    if (!port) return
    try {
      port.send(data)
    } catch {
      // A port yanked mid-send throws; the statechange handler will re-enumerate.
    }
  }

  function allNotesOff(): void {
    for (const midi of active) send([NOTE_OFF, midi, 0])
    active.clear()
    // Belt and braces: catches anything the app lost track of.
    send([CONTROL_CHANGE, ALL_SOUND_OFF, 0])
    send([CONTROL_CHANGE, ALL_NOTES_OFF, 0])
  }

  function enumerate(): void {
    const next: MIDIOutput[] = []
    access.outputs.forEach((port) => next.push(port))
    ports = next
    // Fall back to the first port when the chosen one is unplugged.
    if (selectedId !== null && !ports.some((p) => p.id === selectedId)) selectedId = null
    onDevicesChanged(ports.map((p) => ({ id: p.id, name: p.name ?? 'MIDI device' })))
  }

  function handleStateChange(): void {
    enumerate()
  }

  enumerate()
  access.addEventListener('statechange', handleStateChange)

  return {
    select(id) {
      if (id === selectedId) return
      // Silence the port we're leaving, or its notes hang forever.
      allNotesOff()
      selectedId = id
    },
    noteOn(midi, velocity) {
      send([NOTE_ON, midi, toVelocity7(velocity)])
      active.add(midi)
    },
    noteOff(midi) {
      if (!active.delete(midi)) return
      send([NOTE_OFF, midi, 0])
    },
    allNotesOff,
    close() {
      allNotesOff()
      access.removeEventListener('statechange', handleStateChange)
    },
  }
}
