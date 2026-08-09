# ks-piano

A falling-notes piano trainer that runs entirely in the browser.

## Features

- 88-key on-screen piano, playable by mouse/touch, a real MIDI keyboard (Web MIDI API), or your computer keyboard (`A`–`;` maps to one octave+ starting at C4)
- Falling-notes visualizer synced to playback, color-coded by hand
- **Listen mode**: the song plays itself through a built-in synth
- **Practice mode**: playback pauses at each note/chord until you play the right key(s), then continues
- Upload your own `.mid`/`.midi` files, or pick from a few built-in public-domain demo songs
- Adjustable playback speed and seekable timeline

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

React + TypeScript + Vite, [Tone.js](https://tonejs.github.io/) for synthesis, [@tonejs/midi](https://github.com/Tonejs/Midi) for parsing uploaded MIDI files.
