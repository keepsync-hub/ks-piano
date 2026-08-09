import { useEffect } from 'react'
import { usePlaybackEngine } from './hooks/usePlaybackEngine'
import { useComputerKeyboard } from './hooks/useComputerKeyboard'
import { DEMO_SONGS } from './midi/demoSongs'
import { SongLibrary } from './components/SongLibrary'
import { PianoKeyboard } from './components/PianoKeyboard'
import { FallingNotes } from './components/FallingNotes'
import { TransportControls } from './components/TransportControls'
import { Legend } from './components/Legend'
import './App.css'

function App() {
  const engine = usePlaybackEngine()
  useComputerKeyboard(engine.noteOn, engine.noteOff)

  useEffect(() => {
    engine.loadSong(DEMO_SONGS[1])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>ks-piano</h1>
        <p className="tagline">Falling-notes piano trainer — play along on a MIDI keyboard, your computer keys, or click the keys below.</p>
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
          </div>
          <FallingNotes song={engine.song} time={engine.time} isWaitingForInput={engine.isWaitingForInput} />
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
