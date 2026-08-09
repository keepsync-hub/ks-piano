import * as Tone from 'tone'

let click: Tone.MembraneSynth | null = null

function getClick(): Tone.MembraneSynth {
  if (!click) {
    click = new Tone.MembraneSynth({
      pitchDecay: 0.006,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.11, sustain: 0, release: 0.02 },
    }).toDestination()
    click.volume.value = -9
  }
  return click
}

/** Downbeats get a higher, brighter click so the bar is audible. */
export function playClick(accent: boolean): void {
  try {
    getClick().triggerAttackRelease(accent ? 'C6' : 'G4', 0.02)
  } catch {
    // Two clicks landing in the same audio tick is harmless; skip the second.
  }
}
