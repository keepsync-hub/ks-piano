import { lazy, Suspense, useEffect, useState } from 'react'
import { usePlaybackEngine } from './hooks/usePlaybackEngine'
import { useComputerKeyboard } from './hooks/useComputerKeyboard'
import { DEMO_SONGS } from './midi/demoSongs'
import { SongLibrary } from './components/SongLibrary'
import { PianoKeyboard } from './components/PianoKeyboard'
import { FallingNotes } from './components/FallingNotes'
import { TransportControls } from './components/TransportControls'
import { Legend } from './components/Legend'
import './App.css'

// VexFlow pulls in a large glyph/font payload, so keep it out of the main bundle.
const SheetMusic = lazy(() => import('./components/SheetMusic').then((m) => ({ default: m.SheetMusic })))

type StageView = 'falling' | 'sheet' | 'both'

function App() {
  const engine = usePlaybackEngine()
  useComputerKeyboard(engine.noteOn, engine.noteOff)
  const [view, setView] = useState<StageView>('falling')

  useEffect(() => {
    engine.loadSong(DEMO_SONGS[1])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>ks-piano</h1>
        <p className="tagline">
          Piano trainer — switch between falling notes, sheet music, or both at once, and play along on a MIDI
          keyboard, your computer keys, or the on-screen keys.
        </p>
        <Legend />
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <SongLibrary currentSongId={engine.song?.id} onSelect={engine.loadSong} />
        </aside>

        <main className="stage">
          <div className="song-heading">
            <h2>{engine.song?.title ?? 'No song loaded'}</h2>
            {engine.song?.composer && <span className="song-heading-composer">{engine.song.composer}</span>}
            <div className="view-toggle" role="group" aria-label="Stage view">
              <button
                type="button"
                className={view === 'falling' ? 'view-btn view-btn-active' : 'view-btn'}
                onClick={() => setView('falling')}
              >
                Falling notes
              </button>
              <button
                type="button"
                className={view === 'sheet' ? 'view-btn view-btn-active' : 'view-btn'}
                onClick={() => setView('sheet')}
              >
                Sheet music
              </button>
              <button
                type="button"
                className={view === 'both' ? 'view-btn view-btn-active' : 'view-btn'}
                onClick={() => setView('both')}
              >
                Both
              </button>
            </div>
          </div>
          {view === 'falling' && (
            <FallingNotes song={engine.song} time={engine.time} isWaitingForInput={engine.isWaitingForInput} />
          )}
          {view === 'sheet' && (
            <Suspense fallback={<div className="sheet-music-loading">Loading sheet music renderer…</div>}>
              <SheetMusic
                song={engine.song}
                time={engine.time}
                heldNotes={engine.heldNotes}
                requiredNotes={engine.nextRequiredNotes}
              />
            </Suspense>
          )}
          {view === 'both' && (
            <div className="stage-split">
              <div className="stage-split-top">
                <Suspense fallback={<div className="sheet-music-loading">Loading sheet music renderer…</div>}>
                  <SheetMusic
                    song={engine.song}
                    time={engine.time}
                    heldNotes={engine.heldNotes}
                    requiredNotes={engine.nextRequiredNotes}
                  />
                </Suspense>
              </div>
              <div className="stage-split-bottom">
                <FallingNotes song={engine.song} time={engine.time} isWaitingForInput={engine.isWaitingForInput} />
              </div>
            </div>
          )}
          <PianoKeyboard
            heldNotes={engine.heldNotes}
            soundingNotes={engine.soundingNotes}
            requiredNotes={engine.nextRequiredNotes}
            onNoteOn={engine.noteOn}
            onNoteOff={engine.noteOff}
          />
          <TransportControls
            song={engine.song}
            playing={engine.playing}
            time={engine.time}
            progress={engine.progress}
            speed={engine.speed}
            mode={engine.mode}
            midiDevices={engine.midiDevices}
            isWaitingForInput={engine.isWaitingForInput}
            onTogglePlay={engine.togglePlay}
            onRestart={engine.restart}
            onSeek={engine.seek}
            onSpeedChange={engine.setSpeed}
            onModeChange={engine.setMode}
          />
        </main>
      </div>
    </div>
  )
}

export default App
