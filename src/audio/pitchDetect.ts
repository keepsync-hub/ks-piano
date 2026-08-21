/**
 * Pitch detection for microphone input, as a pure function of a magnitude
 * spectrum — the FFT itself is done by the browser's `AnalyserNode`, so there
 * is no DSP here beyond scoring candidate notes.
 *
 * Each candidate MIDI note is scored by the energy found at its harmonics
 * ("harmonic sum"). Taking the best candidate, subtracting its partials and
 * repeating turns the same loop into a chord detector, which is why one
 * algorithm covers both the monophonic and the (approximate) polyphonic case.
 */

export interface DetectedNote {
  midi: number
  /** Harmonic-sum score; only meaningful relative to the other candidates. */
  salience: number
}

export interface DetectOptions {
  /** How many notes to extract at most. 1 is a monophonic detector. */
  maxNotes?: number
  minMidi?: number
  maxMidi?: number
  /** Partials summed per candidate. */
  harmonics?: number
  /** A further note is kept only while its salience stays above this share of the first one's. */
  relativeThreshold?: number
  /** How far a note's partials must stand above the average bin to count as a note at all. */
  noiseFactor?: number
}

const DEFAULTS = {
  maxNotes: 1,
  minMidi: 36,
  maxMidi: 96,
  harmonics: 8,
  relativeThreshold: 0.35,
  noiseFactor: 3,
}

/**
 * Half-width of the band searched around each partial, as a fraction of its
 * frequency (~34 cents). Wide enough for a mistuned piano and for the string
 * inharmonicity that pushes upper partials sharp, narrow enough that two
 * candidates a semitone apart (100 cents) never share a band.
 */
const BAND = 0.02

/**
 * Below this, a candidate's odd partials are too weak for it to be the real
 * fundamental — the tell-tale of a sub-octave artifact, whose "harmonics" are
 * only ever the even ones.
 */
const ODD_HARMONIC_RATIO = 0.25

/**
 * A candidate must carry at least this share of its own strongest partial at
 * its fundamental. Without it every major triad is misread as the note two
 * octaves below the root: C-E-G sit on harmonics 2, 5 and 3 of that virtual
 * fundamental, so it scores higher than any of the notes actually played.
 * The cost is that a note whose fundamental is *entirely* absent reads as the
 * octave above — an acceptable trade, since a microphone attenuates a low
 * fundamental but never removes it completely.
 */
const FUNDAMENTAL_FLOOR = 0.12

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/** Loudest bin within ±BAND of `freq`, or 0 when the band falls outside the spectrum. */
function peakNear(spectrum: Float32Array, freq: number, binHz: number): number {
  const half = Math.max(binHz, freq * BAND)
  const from = Math.max(0, Math.round((freq - half) / binHz))
  const to = Math.min(spectrum.length - 1, Math.round((freq + half) / binHz))
  let peak = 0
  for (let i = from; i <= to; i++) {
    if (spectrum[i] > peak) peak = spectrum[i]
  }
  return peak
}

function clearNear(spectrum: Float32Array, freq: number, binHz: number): void {
  const half = Math.max(binHz, freq * BAND)
  const from = Math.max(0, Math.round((freq - half) / binHz))
  const to = Math.min(spectrum.length - 1, Math.round((freq + half) / binHz))
  for (let i = from; i <= to; i++) spectrum[i] = 0
}

/**
 * Harmonic sum for one candidate note: how much of the spectrum its partials
 * explain, averaged over the partials that fit below Nyquist.
 *
 * Partials are weighted equally on purpose. Weighting them 1/h would score a
 * candidate mostly by its fundamental, and a piano note whose fundamental is
 * weak or filtered out — routine on a laptop microphone — would then lose to
 * the note an octave above it.
 */
function scoreMidi(spectrum: Float32Array, midi: number, binHz: number, harmonics: number): number {
  const f0 = midiToFrequency(midi)
  const nyquist = spectrum.length * binHz
  let sum = 0
  let used = 0
  let strongest = 0
  let fundamental = 0
  for (let h = 1; h <= harmonics; h++) {
    const freq = f0 * h
    if (freq >= nyquist) break
    const peak = peakNear(spectrum, freq, binHz)
    if (h === 1) fundamental = peak
    if (peak > strongest) strongest = peak
    sum += peak
    used += 1
  }
  if (used === 0 || fundamental < strongest * FUNDAMENTAL_FLOOR) return 0
  return sum / used
}

/**
 * A note whose odd partials are missing is almost always an octave below the
 * real one: every partial it "found" was an even one, i.e. a partial of the
 * note an octave up. Returns the corrected MIDI number.
 */
function refineOctave(spectrum: Float32Array, midi: number, binHz: number, harmonics: number): number {
  const f0 = midiToFrequency(midi)
  const nyquist = spectrum.length * binHz
  let odd = 0
  let even = 0
  for (let h = 1; h <= harmonics; h++) {
    const freq = f0 * h
    if (freq >= nyquist) break
    const value = peakNear(spectrum, freq, binHz)
    if (h % 2 === 0) even += value
    else odd += value
  }
  return odd < even * ODD_HARMONIC_RATIO ? midi + 12 : midi
}

/**
 * Finds the notes sounding in a magnitude spectrum (linear magnitudes, not dB).
 * `binHz` is the width of one spectrum bin, i.e. sampleRate / fftSize.
 */
export function detectNotes(magnitudes: Float32Array, binHz: number, options: DetectOptions = {}): DetectedNote[] {
  const { maxNotes, minMidi, maxMidi, harmonics, relativeThreshold, noiseFactor } = { ...DEFAULTS, ...options }
  if (magnitudes.length === 0 || binHz <= 0) return []

  // Any spectrum with energy in it has a best candidate, so without this floor
  // room noise would always be reported as some note. A real note's partials
  // tower over the average bin; noise does not.
  let total = 0
  for (let i = 0; i < magnitudes.length; i++) total += magnitudes[i]
  const noiseLevel = (total / magnitudes.length) * noiseFactor

  // Copied because extraction subtracts each note's partials as it goes.
  const spectrum = Float32Array.from(magnitudes)
  const found: DetectedNote[] = []
  let best = 0

  for (let pass = 0; pass < maxNotes; pass++) {
    let bestMidi = -1
    let bestScore = 0
    for (let midi = minMidi; midi <= maxMidi; midi++) {
      const score = scoreMidi(spectrum, midi, binHz, harmonics)
      if (score > bestScore) {
        bestScore = score
        bestMidi = midi
      }
    }
    if (bestMidi < 0 || bestScore <= noiseLevel) break

    // Octaves and fifths of a note already found need no special guard: their
    // own fundamental has just been subtracted with that note's partials, so
    // the fundamental floor in scoreMidi rejects them by itself.
    if (pass === 0) best = bestScore
    else if (bestScore < best * relativeThreshold) break

    const midi = refineOctave(spectrum, bestMidi, binHz, harmonics)
    if (midi <= maxMidi && !found.some((n) => n.midi === midi)) {
      found.push({ midi, salience: bestScore })
    }

    const f0 = midiToFrequency(bestMidi)
    for (let h = 1; h <= harmonics; h++) clearNear(spectrum, f0 * h, binHz)
  }

  return found
}

/* ------------------------------------------------------------------ tracker */

export interface NoteChange {
  type: 'on' | 'off'
  midi: number
}

export interface TrackerOptions {
  /** Consecutive frames a note must appear in before it counts as played. */
  onFrames?: number
  /**
   * How long a note stays held after it stops being heard. This is also the
   * window in which a rolled or arpeggiated chord accumulates into one grip,
   * which is what lets practice mode advance past a chord.
   */
  releaseMs?: number
  /** Safety net for a note the detector never hears end (sustain pedal, reverb). */
  maxHoldMs?: number
}

const TRACKER_DEFAULTS = {
  onFrames: 2,
  releaseMs: 700,
  maxHoldMs: 6000,
}

interface TrackedNote {
  seen: number
  on: boolean
  lastHeardMs: number
  onSinceMs: number
}

export interface NoteTracker {
  /** Feeds one frame of detected notes and returns the note on/off changes it caused. */
  update: (midis: readonly number[], nowMs: number) => NoteChange[]
  /**
   * Releases everything and re-arms, so a note still sounding has to be heard
   * afresh before it counts again. Practice mode calls this when it advances,
   * so held notes cannot satisfy the next group on their own.
   */
  reset: (nowMs: number) => NoteChange[]
  held: () => number[]
}

export function createNoteTracker(options: TrackerOptions = {}): NoteTracker {
  const { onFrames, releaseMs, maxHoldMs } = { ...TRACKER_DEFAULTS, ...options }
  const notes = new Map<number, TrackedNote>()

  function update(midis: readonly number[], nowMs: number): NoteChange[] {
    const changes: NoteChange[] = []
    const heard = new Set(midis)

    for (const midi of heard) {
      const entry = notes.get(midi) ?? { seen: 0, on: false, lastHeardMs: nowMs, onSinceMs: nowMs }
      entry.seen += 1
      entry.lastHeardMs = nowMs
      if (!entry.on && entry.seen >= onFrames) {
        entry.on = true
        entry.onSinceMs = nowMs
        changes.push({ type: 'on', midi })
      }
      notes.set(midi, entry)
    }

    for (const [midi, entry] of notes) {
      if (heard.has(midi)) {
        if (entry.on && nowMs - entry.onSinceMs >= maxHoldMs) {
          notes.delete(midi)
          changes.push({ type: 'off', midi })
        }
        continue
      }
      entry.seen = 0
      if (nowMs - entry.lastHeardMs >= releaseMs) {
        notes.delete(midi)
        if (entry.on) changes.push({ type: 'off', midi })
      }
    }

    return changes
  }

  function reset(nowMs: number): NoteChange[] {
    void nowMs
    const changes: NoteChange[] = []
    for (const [midi, entry] of notes) {
      if (entry.on) changes.push({ type: 'off', midi })
    }
    notes.clear()
    return changes
  }

  function held(): number[] {
    return [...notes].filter(([, entry]) => entry.on).map(([midi]) => midi)
  }

  return { update, reset, held }
}
