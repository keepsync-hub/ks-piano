import * as Tone from 'tone'

let synth: Tone.PolySynth<Tone.Synth> | null = null
let started = false

function getSynth(): Tone.PolySynth<Tone.Synth> {
  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle8' },
      envelope: {
        attack: 0.004,
        decay: 0.25,
        sustain: 0.15,
        release: 0.9,
      },
    }).toDestination()
    synth.volume.value = -8
  }
  return synth
}

export async function ensureAudioStarted(): Promise<void> {
  if (started) return
  await Tone.start()
  started = true
}

function midiToNoteName(midi: number): string {
  return Tone.Frequency(midi, 'midi').toNote()
}

export function playNote(midi: number, velocity = 0.8, durationSeconds?: number): void {
  const s = getSynth()
  const note = midiToNoteName(midi)
  if (durationSeconds) {
    s.triggerAttackRelease(note, durationSeconds, undefined, velocity)
  } else {
    s.triggerAttack(note, undefined, velocity)
  }
}

export function releaseNote(midi: number): void {
  const s = getSynth()
  s.triggerRelease(midiToNoteName(midi))
}

export function releaseAll(): void {
  synth?.releaseAll()
}
