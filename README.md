# ks-piano

A falling-notes piano trainer that runs entirely in the browser.

## Features

- **Profiles**: separate kid and adult profiles, each with its own streak, XP and song list — a kid profile starts with a smaller, easier slice of the library, an adult profile has the full range from the start
- **Progress & motivation**, à la Duolingo: XP for practice time and song completions, levels, a configurable daily XP goal that drives the streak, and a skill path that groups songs into difficulty tiers you unlock by mastering the previous one (see `DUOLINGO_ANALYSIS.md` for the full breakdown)
- 88-key on-screen piano, playable by mouse/touch, a real MIDI keyboard (Web MIDI API), your computer keyboard (`A`–`;` maps to one octave+ starting at C4), or **an acoustic piano through your microphone** — no MIDI cable needed
- Two ways to follow a song, switchable at any time: a falling-notes visualizer, or a real sheet-music (grand staff) view that auto-scrolls with a playhead, for reading practice
- **Listen mode**: the song plays itself through a built-in synth
- **Practice mode**: playback pauses at each note/chord until you play the right key(s), then continues
- **One-hand practice**: train the left or right hand while the other plays as accompaniment
- **Metronome** with accented downbeats and an optional count-in bar before playback
- **A–B section looping** to drill a passage, with the region shown on the timeline
- Suggested **fingering** shown on the piano keys and above the score, correctable with keys 1–5 while practising
- Beat/measure grid and adjustable zoom on the falling-notes stage
- Collapsible song list, to give the score and keyboard the full window
- Live progress and error counters, current measure and key signature
- Upload your own `.mid`/`.midi` files, or pick from a few built-in public-domain demo songs
- Adjustable playback speed, seekable timeline, and octave shift for small MIDI controllers

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` | Play / pause |
| `←` / `→` | Seek 5s (hold `Shift` for 1s) |
| `R` / `Home` | Restart |
| `M` | Toggle metronome |
| `[` / `]` | Set loop start / end |
| `X` | Clear loop |
| `N` | Toggle finger numbers |
| `1`–`5` | Set the finger for the note practice is waiting on |

Letters `A`–`;` are reserved for playing notes on the computer keyboard.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL. For real MIDI keyboard input, use a Chromium-based browser (Web MIDI API support). Microphone input works in any modern browser, but needs a secure context (`localhost` or HTTPS).

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check and build for production
- `npm run lint` — run oxlint
- `npm run preview` — preview the production build locally

## Stack

React + TypeScript + Vite, [Tone.js](https://tonejs.github.io/) for synthesis, the Web Audio `AnalyserNode` for microphone pitch detection (no extra dependency), [@tonejs/midi](https://github.com/Tonejs/Midi) for parsing uploaded MIDI files, [VexFlow](https://www.vexflow.com/) for sheet-music notation (lazy-loaded only when that view is opened).

## Playing through the microphone

Practice mode can listen to the microphone and treat what it hears as note on/off
events, so an acoustic piano — or a digital one with no USB cable — drives the
same practice gate a MIDI keyboard would. Turn it on under **Options →
Microphone**; the level meter and the note readout are there to check that it is
hearing you before you start.

The browser's `AnalyserNode` does the FFT, and each candidate note is scored by
the energy at its harmonics; taking the best candidate, subtracting its partials
and repeating turns the same loop into an approximate chord detector.

What it does and does not do well:

- **Melody and one-hand practice**: reliable, and the main reason to use it.
- **Two-note intervals**: usually found. **Three-note chords**: hit and miss.
  **Four dense voices** (an SATB hymn struck at once): not resolvable — roll the
  chord instead, since a note stays held for 700 ms after it stops being heard,
  which is long enough for an arpeggiated chord to count as one grip.
- **Use headphones.** The app's own accompaniment leaks into the microphone; the
  notes it is playing itself are ignored, but a loud room still costs accuracy.
- A note whose fundamental the microphone rolls off entirely reads as the octave
  above. **Allow octave slips** (on by default) fixes that up against the note
  practice is waiting for; turn it off for strict practice.
- The sustain pedal blurs where notes end, so a held note is force-released
  after 6 seconds.
- **Calibrate** measures the room noise; do it once, in silence, if the detector
  is either deaf or jumpy.

## Notation limitations

The engraver reads musical time (MIDI ticks) through the file's tempo map, so
tempo changes do not shift the barlines. Two things it does not handle yet:

- A **time-signature change mid-piece** — the whole score uses the meter the
  file starts with.
- **Very long scores take a few seconds to engrave** (a 5-minute, ~150-bar
  piece takes roughly 4-5s on first open) because every measure is laid out up
  front rather than windowed around the playhead.
