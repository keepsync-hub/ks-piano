import { describe, expect, it } from 'vitest'
import { createNoteTracker, detectNotes, midiToFrequency } from './pitchDetect'

// The detector consumes a spectrum, not a waveform, so the fixtures are built
// directly in the frequency domain: one peak per partial, amplitude 1/h.
const BINS = 4096
const BIN_HZ = 48000 / 8192

function addPartial(spectrum: Float32Array, freq: number, amplitude: number): void {
  const centre = freq / BIN_HZ
  // A couple of bins of skirt, as a real windowed FFT would show.
  for (let i = Math.floor(centre) - 2; i <= Math.ceil(centre) + 2; i++) {
    if (i < 0 || i >= spectrum.length) continue
    const distance = Math.abs(i - centre)
    spectrum[i] += amplitude * Math.exp(-(distance * distance))
  }
}

function spectrumOf(midis: number[], harmonics = 8, gain = 1): Float32Array {
  const spectrum = new Float32Array(BINS)
  for (const midi of midis) {
    const f0 = midiToFrequency(midi)
    for (let h = 1; h <= harmonics; h++) addPartial(spectrum, f0 * h, (gain / h) * 1)
  }
  return spectrum
}

describe('detectNotes', () => {
  it('finds a single note from its harmonic series', () => {
    for (const midi of [40, 48, 60, 67, 79]) {
      const notes = detectNotes(spectrumOf([midi]), BIN_HZ)
      expect(notes.map((n) => n.midi)).toEqual([midi])
    }
  })

  it('finds the fundamental when the microphone has all but rolled it off', () => {
    // Small microphones attenuate low fundamentals badly; the note is still
    // recognised from its partials as long as some fundamental survives.
    const spectrum = new Float32Array(BINS)
    const f0 = midiToFrequency(55)
    addPartial(spectrum, f0, 0.2)
    for (let h = 2; h <= 6; h++) addPartial(spectrum, f0 * h, 1 / h)

    expect(detectNotes(spectrum, BIN_HZ)[0].midi).toBe(55)
  })

  it('does not report the octave below a note as the note', () => {
    // The classic sub-octave artifact: every partial of C4 is also an even
    // partial of C3, so a naive harmonic sum scores C3 just as highly.
    const notes = detectNotes(spectrumOf([60]), BIN_HZ, { maxNotes: 3 })
    expect(notes[0].midi).toBe(60)
    expect(notes.map((n) => n.midi)).not.toContain(48)
  })

  it('returns nothing for an empty spectrum', () => {
    expect(detectNotes(new Float32Array(BINS), BIN_HZ)).toEqual([])
  })

  it('returns nothing for broadband noise', () => {
    // Deterministic pseudo-noise: every bin busy, no harmonic structure.
    const spectrum = new Float32Array(BINS)
    for (let i = 0; i < BINS; i++) spectrum[i] = 0.4 + 0.2 * Math.sin(i * 12.9898)

    expect(detectNotes(spectrum, BIN_HZ, { maxNotes: 3 })).toEqual([])
  })

  it('still hears a note through that noise', () => {
    const spectrum = new Float32Array(BINS)
    for (let i = 0; i < BINS; i++) spectrum[i] = 0.04 + 0.02 * Math.sin(i * 12.9898)
    const f0 = midiToFrequency(60)
    for (let h = 1; h <= 8; h++) addPartial(spectrum, f0 * h, 1 / h)

    expect(detectNotes(spectrum, BIN_HZ)[0].midi).toBe(60)
  })

  it('extracts both notes of a two-note interval', () => {
    const notes = detectNotes(spectrumOf([60, 64]), BIN_HZ, { maxNotes: 3 })
    expect(notes.map((n) => n.midi).sort((a, b) => a - b)).toEqual([60, 64])
  })

  it('extracts a bare fifth, whose upper note hides inside the lower one', () => {
    // A left-hand root-and-fifth grip. The fifth's own partials overlap the
    // root's, so it only survives because its fundamental does not.
    const notes = detectNotes(spectrumOf([48, 55]), BIN_HZ, { maxNotes: 3 })
    expect(notes.map((n) => n.midi).sort((a, b) => a - b)).toEqual([48, 55])
  })

  it('extracts a three-note triad', () => {
    const notes = detectNotes(spectrumOf([60, 64, 67]), BIN_HZ, { maxNotes: 3 })
    expect(notes.map((n) => n.midi).sort((a, b) => a - b)).toEqual([60, 64, 67])
  })

  it('stays monophonic when asked for one note, even on a chord', () => {
    const notes = detectNotes(spectrumOf([60, 64, 67]), BIN_HZ)
    expect(notes).toHaveLength(1)
  })

  it('cannot resolve four dense voices — documents the known limit', () => {
    // An SATB hymn chord struck at once. The detector is not expected to return
    // all four voices; the accumulating release window in the tracker is what
    // makes such a chord practisable, by rolling it.
    const voices = [48, 55, 64, 67]
    const notes = detectNotes(spectrumOf(voices), BIN_HZ, { maxNotes: 3 })

    expect(notes.length).toBeLessThanOrEqual(3)
    expect(notes.some((n) => voices.includes(n.midi))).toBe(true)
  })
})

describe('createNoteTracker', () => {
  it('waits for two consecutive frames before reporting a note', () => {
    const tracker = createNoteTracker()
    expect(tracker.update([60], 0)).toEqual([])
    expect(tracker.update([60], 30)).toEqual([{ type: 'on', midi: 60 }])
    expect(tracker.held()).toEqual([60])
  })

  it('holds a note for the release window after it stops being heard', () => {
    const tracker = createNoteTracker({ releaseMs: 700 })
    tracker.update([60], 0)
    tracker.update([60], 30)

    expect(tracker.update([], 400)).toEqual([])
    expect(tracker.held()).toEqual([60])
    expect(tracker.update([], 800)).toEqual([{ type: 'off', midi: 60 }])
    expect(tracker.held()).toEqual([])
  })

  it('accumulates an arpeggiated chord inside the release window', () => {
    const tracker = createNoteTracker({ releaseMs: 700 })
    tracker.update([60], 0)
    tracker.update([60], 30)
    tracker.update([64], 200)
    tracker.update([64], 230)
    tracker.update([67], 400)
    tracker.update([67], 430)

    expect(tracker.held().sort((a, b) => a - b)).toEqual([60, 64, 67])
  })

  it('releases and re-arms on reset, so a sustained note counts as a new attack', () => {
    const tracker = createNoteTracker()
    tracker.update([60], 0)
    tracker.update([60], 30)

    expect(tracker.reset(60)).toEqual([{ type: 'off', midi: 60 }])
    expect(tracker.held()).toEqual([])

    expect(tracker.update([60], 90)).toEqual([])
    expect(tracker.update([60], 120)).toEqual([{ type: 'on', midi: 60 }])
  })

  it('force-releases a note that is never heard to stop', () => {
    const tracker = createNoteTracker({ maxHoldMs: 6000 })
    tracker.update([60], 0)
    tracker.update([60], 30)

    expect(tracker.update([60], 3000)).toEqual([])
    expect(tracker.update([60], 6100)).toEqual([{ type: 'off', midi: 60 }])
  })
})
