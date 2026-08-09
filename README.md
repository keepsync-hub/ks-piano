# ks-piano

A falling-notes piano trainer that runs entirely in the browser.

## Features

- 88-key on-screen piano, playable by mouse/touch, a real MIDI keyboard (Web MIDI API), or your computer keyboard (`A`–`;` maps to one octave+ starting at C4)
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

Then open the printed local URL. For real MIDI keyboard input, use a Chromium-based browser (Web MIDI API support).

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check and build for production
- `npm run lint` — run oxlint
- `npm run preview` — preview the production build locally

## Stack

React + TypeScript + Vite, [Tone.js](https://tonejs.github.io/) for synthesis, [@tonejs/midi](https://github.com/Tonejs/Midi) for parsing uploaded MIDI files, [VexFlow](https://www.vexflow.com/) for sheet-music notation (lazy-loaded only when that view is opened).

## Notation limitations

The engraver reads musical time (MIDI ticks) through the file's tempo map, so
tempo changes do not shift the barlines. Two things it does not handle yet:

- A **time-signature change mid-piece** — the whole score uses the meter the
  file starts with.
- **Very long scores take a few seconds to engrave** (a 5-minute, ~150-bar
  piece takes roughly 4-5s on first open) because every measure is laid out up
  front rather than windowed around the playhead.
