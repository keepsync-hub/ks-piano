import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { usePlaybackEngine } from './hooks/usePlaybackEngine'
import { useComputerKeyboard } from './hooks/useComputerKeyboard'
import { useShortcuts } from './hooks/useShortcuts'
import { DEMO_SONGS } from './midi/demoSongs'
import { SongLibrary } from './components/SongLibrary'
import { PianoKeyboard } from './components/PianoKeyboard'
import { FallingNotes } from './components/FallingNotes'
import { TransportControls } from './components/TransportControls'
import { PracticeToolbar } from './components/PracticeToolbar'
import { Legend } from './components/Legend'
import './App.css'

// VexFlow pulls in a large glyph/font payload, so keep it out of the main bundle.
const SheetMusic = lazy(() => import('./components/SheetMusic').then((m) => ({ default: m.SheetMusic })))

type StageView = 'falling' | 'sheet' | 'both'

function App() {
  const engine = usePlaybackEngine()
  useComputerKeyboard(engine.externalNoteOn, engine.externalNoteOff)
  const [view, setView] = useState<StageView>('falling')
  const [lookaheadSeconds, setLookaheadSeconds] = useState(3.5)
  const [showMeasureLines, setShowMeasureLines] = useState(true)

  const { togglePlay, restart, seekBy, setMetronomeEnabled, setLoopStart, setLoopEnd, clearLoop } = engine
  const metronomeEnabled = engine.metronomeEnabled

  const shortcutHandlers = useMemo(
    () => ({
      onTogglePlay: togglePlay,
      onRestart: restart,
      onSeekBy: seekBy,
      onToggleMetronome: () => setMetronomeEnabled(!metronomeEnabled),
      onSetLoopStart: setLoopStart,
      onSetLoopEnd: setLoopEnd,
      onClearLoop: clearLoop,
    }),
    [togglePlay, restart, seekBy, setMetronomeEnabled, metronomeEnabled, setLoopStart, setLoopEnd, clearLoop],
  )
  useShortcuts(shortcutHandlers)

  useEffect(() => {
    engine.loadSong(DEMO_SONGS[1])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stageProps = {
    song: engine.song,
    time: engine.time,
    heldNotes: engine.heldNotes,
    requiredNotes: engine.nextRequiredNotes,
    requiredTime: engine.nextRequiredTime,
  }
  const fallingProps = {
    ...stageProps,
    isWaitingForInput: engine.isWaitingForInput,
    stats: engine.stats,
    lookaheadSeconds,
    showMeasureLines,
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>ks-piano</h1>
        <p className="tagline">
          Piano trainer — falling notes, sheet music, or both at once, with a metronome, section looping and
          one-hand practice. Play along on a MIDI keyboard, your computer keys, or the on-screen keys.
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
              {(['falling', 'sheet', 'both'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={view === v ? 'view-btn view-btn-active' : 'view-btn'}
                  onClick={() => setView(v)}
                >
                  {v === 'falling' ? 'Falling notes' : v === 'sheet' ? 'Sheet music' : 'Both'}
                </button>
              ))}
            </div>
          </div>

          {view === 'falling' && <FallingNotes {...fallingProps} />}
          {view === 'sheet' && (
            <Suspense fallback={<div className="sheet-music-loading">Loading sheet music renderer…</div>}>
              <SheetMusic {...stageProps} />
            </Suspense>
          )}
          {view === 'both' && (
            <div className="stage-split">
              <div className="stage-split-top">
                <Suspense fallback={<div className="sheet-music-loading">Loading sheet music renderer…</div>}>
                  <SheetMusic {...stageProps} />
                </Suspense>
              </div>
              <div className="stage-split-bottom">
                <FallingNotes {...fallingProps} />
              </div>
            </div>
          )}

          <PianoKeyboard
            heldNotes={engine.heldNotes}
            soundingNotes={engine.soundingNotes}
            requiredNotes={engine.nextRequiredNotes}
            soundingHands={engine.soundingHands}
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
            loop={engine.loop}
            loopEnabled={engine.loopEnabled}
            onTogglePlay={engine.togglePlay}
            onRestart={engine.restart}
            onSeek={engine.seek}
            onSpeedChange={engine.setSpeed}
            onModeChange={engine.setMode}
          />
          <PracticeToolbar
            handFilter={engine.handFilter}
            onHandFilterChange={engine.setHandFilter}
            metronomeEnabled={engine.metronomeEnabled}
            onMetronomeChange={engine.setMetronomeEnabled}
            countInEnabled={engine.countInEnabled}
            onCountInChange={engine.setCountInEnabled}
            countInBeat={engine.countInBeat}
            loop={engine.loop}
            loopEnabled={engine.loopEnabled}
            onLoopEnabledChange={engine.setLoopEnabled}
            onSetLoopStart={engine.setLoopStart}
            onSetLoopEnd={engine.setLoopEnd}
            onClearLoop={engine.clearLoop}
            lookaheadSeconds={lookaheadSeconds}
            onLookaheadChange={setLookaheadSeconds}
            showMeasureLines={showMeasureLines}
            onMeasureLinesChange={setShowMeasureLines}
            inputOctaveShift={engine.inputOctaveShift}
            onInputOctaveShiftChange={engine.setInputOctaveShift}
            hasMidiDevice={engine.midiDevices.length > 0}
          />
        </main>
      </div>
    </div>
  )
}

export default App
