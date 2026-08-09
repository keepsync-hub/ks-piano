export interface MidiInputHandlers {
  onNoteOn: (midi: number, velocity: number) => void
  onNoteOff: (midi: number) => void
}

/**
 * Connects to any available Web MIDI input devices and forwards note on/off
 * events. Returns a cleanup function that detaches all listeners.
 */
export async function connectMidiInputs(
  handlers: MidiInputHandlers,
  onDevicesChanged: (names: string[]) => void,
): Promise<() => void> {
  if (!navigator.requestMIDIAccess) {
    onDevicesChanged([])
    return () => {}
  }

  let access: MIDIAccess
  try {
    access = await navigator.requestMIDIAccess()
  } catch {
    onDevicesChanged([])
    return () => {}
  }

  const attached: MIDIInput[] = []

  function handleMessage(e: MIDIMessageEvent) {
    const data = e.data
    if (!data || data.length < 2) return
    const [status, note, velocity = 0] = data
    const command = status & 0xf0
    if (command === 0x90 && velocity > 0) {
      handlers.onNoteOn(note, velocity / 127)
    } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
      handlers.onNoteOff(note)
    }
  }

  function attachAll() {
    for (const input of attached) input.removeEventListener('midimessage', handleMessage as EventListener)
    attached.length = 0
    const names: string[] = []
    access.inputs.forEach((input) => {
      input.addEventListener('midimessage', handleMessage as EventListener)
      attached.push(input)
      names.push(input.name ?? 'MIDI device')
    })
    onDevicesChanged(names)
  }

  attachAll()
  access.onstatechange = () => attachAll()

  return () => {
    access.onstatechange = null
    for (const input of attached) input.removeEventListener('midimessage', handleMessage as EventListener)
  }
}
