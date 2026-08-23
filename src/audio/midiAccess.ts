/**
 * One shared MIDIAccess for the whole app.
 *
 * Input and output both need it, and asking twice would hand each of them a
 * separate access object — wasteful, and easy to get subtly wrong. Sharing one
 * means listeners must be attached with addEventListener('statechange', …):
 * `onstatechange` is a single slot, so input and output would clobber each
 * other's handler.
 */
let accessPromise: Promise<MIDIAccess | null> | null = null

export function getMidiAccess(): Promise<MIDIAccess | null> {
  if (!accessPromise) {
    accessPromise = navigator.requestMIDIAccess
      ? navigator.requestMIDIAccess().catch(() => null)
      : Promise.resolve(null)
  }
  return accessPromise
}

/** Test seam: drops the cached access so each case can install its own mock. */
export function resetMidiAccessForTests(): void {
  accessPromise = null
}
