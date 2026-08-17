import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePlaybackEngine } from './hooks/usePlaybackEngine'
import { useComputerKeyboard } from './hooks/useComputerKeyboard'
import { useShortcuts } from './hooks/useShortcuts'
import { useProgress } from './hooks/useProgress'
import { useProfiles } from './hooks/useProfiles'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useWorkout } from './hooks/useWorkout'
import { useDemoSongs } from './hooks/useDemoSongs'
import { buildProgressMarkdown } from './piano/progressExport'
import { SongLibrary } from './components/SongLibrary'
import { PianoKeyboard } from './components/PianoKeyboard'
import { FallingNotes } from './components/FallingNotes'
import { TransportControls } from './components/TransportControls'
import { PracticeToolbar } from './components/PracticeToolbar'
import { WorkoutPanel } from './components/WorkoutPanel'
import { ProgressHUD } from './components/ProgressHUD'
import { ProfileGate } from './components/ProfileGate'
import { Legend } from './components/Legend'
import './App.css'

// VexFlow pulls in a large glyph/font payload, so keep it out of the main bundle.
const SheetMusic = lazy(() => import('./components/SheetMusic').then((m) => ({ default: m.SheetMusic })))

type StageView = 'falling' | 'sheet' | 'both'

function App() {
  const { profiles, activeProfile, createProfile, selectProfile, clearActiveProfile } = useProfiles()
  const profileId = activeProfile?.id ?? '__none__'

  const { recordSongResult, recordPractice, recordWorkoutCompleted, stats, getSongProgress, isDueForReview } =
    useProgress(profileId)
  const [errorFlash, setErrorFlash] = useState<number | null>(null)
  const workoutCompleteRef = useRef<(() => void) | null>(null)
  const workoutNoteRef = useRef<((correct: boolean) => void) | null>(null)

  const engine = usePlaybackEngine({
    onError: (midi) => {
      setErrorFlash(midi)
      window.setTimeout(() => setErrorFlash(null), 300)
    },
    onSongComplete: (songId, errors, totalNotes) => {
      recordSongResult(songId, errors, true, totalNotes)
      recordPractice(engine.song?.duration ?? 0)
      workoutCompleteRef.current?.()
    },
    onNotePlayed: (_midi, correct) => {
      workoutNoteRef.current?.(correct)
    },
  })
  useComputerKeyboard(engine.externalNoteOn, engine.externalNoteOff)

  const demoSongs = useDemoSongs()
  const bestStarsFor = useCallback((songId: string) => getSongProgress(songId)?.bestStars ?? 0, [getSongProgress])

  const workout = useWorkout(demoSongs, engine.loadSong, engine.setMode)
  workoutCompleteRef.current = workout.recordSongComplete
  workoutNoteRef.current = workout.recordNote

  // A workout session only counts toward the daily goal and streak once it
  // runs its full 5 minutes — stopping early doesn't credit either.
  const lastCreditedWorkoutPhaseRef = useRef(workout.phase)
  useEffect(() => {
    if (lastCreditedWorkoutPhaseRef.current !== 'finished' && workout.phase === 'finished') {
      recordWorkoutCompleted()
    }
    lastCreditedWorkoutPhaseRef.current = workout.phase
  }, [workout.phase, recordWorkoutCompleted])

  const [view, setView] = useLocalStorage<StageView>('ks-piano-view', 'falling')
  const [lookaheadSeconds, setLookaheadSeconds] = useLocalStorage('ks-piano-lookahead', 3.5)
  const [showMeasureLines, setShowMeasureLines] = useLocalStorage('ks-piano-measure-lines', true)
  const [showFingering, setShowFingering] = useLocalStorage('ks-piano-fingering', true)
  const [sidebarOpen, setSidebarOpen] = useLocalStorage('ks-piano-sidebar', true)
  const [optionsOpen, setOptionsOpen] = useState(false)

  const { togglePlay, restart, seekBy, setMetronomeEnabled, setLoopStart, setLoopEnd, clearLoop, setFingerForCurrent } =
    engine
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
      onToggleFingering: () => setShowFingering((v) => !v),
      onSetFinger: setFingerForCurrent,
    }),
    [
      togglePlay,
      restart,
      seekBy,
      setMetronomeEnabled,
      metronomeEnabled,
      setLoopStart,
      setLoopEnd,
      clearLoop,
      setFingerForCurrent,
      setShowFingering,
    ],
  )
  useShortcuts(shortcutHandlers)

  const handleExportProgress = useCallback(() => {
    const markdown = buildProgressMarkdown(profiles, demoSongs)
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'PROGRESS.md'
    a.click()
    URL.revokeObjectURL(url)
  }, [profiles, demoSongs])

  useEffect(() => {
    if (!activeProfile) return
    // Prefer Merrily We Roll Along as a familiar first default.
    const preferred = demoSongs.find((s) => s.id === 'apa-b1-u01-merrily')
    engine.loadSong(preferred ?? demoSongs[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile])

  const stageProps = {
    song: engine.song,
    time: engine.time,
    heldNotes: engine.heldNotes,
    requiredNotes: engine.nextRequiredNotes,
    requiredTime: engine.nextRequiredTime,
  }
  const sheetProps = { ...stageProps, showFingering }
  const fallingProps = {
    ...stageProps,
    isWaitingForInput: engine.isWaitingForInput,
    stats: engine.stats,
    lookaheadSeconds,
    showMeasureLines,
  }

  if (!activeProfile) {
    return <ProfileGate profiles={profiles} onSelect={selectProfile} onCreate={createProfile} />
  }

  return (
    <div className={activeProfile.type === 'child' ? 'app app-kid-mode' : 'app'}>
      <header className="app-header">
        <div className="app-title-row">
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={sidebarOpen ? 'Hide song list' : 'Show song list'}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
          <h1>ks-piano</h1>
          <ProgressHUD
            level={stats.level}
            xpIntoLevel={stats.xpIntoLevel}
            xpForNextLevel={stats.xpForNextLevel}
            dailyGoalMet={stats.dailyGoalMet}
            streakDays={stats.streakDays}
          />
          <button
            type="button"
            className="profile-switch-btn"
            title={`Playing as ${activeProfile.name} — switch profile`}
            onClick={clearActiveProfile}
          >
            <span aria-hidden="true">{activeProfile.avatar}</span> {activeProfile.name}
          </button>
        </div>
        <p className="tagline">
          Piano trainer — falling notes, sheet music, or both at once, with a metronome, section looping and
          one-hand practice. Play along on a MIDI keyboard, your computer keys, or the on-screen keys.
        </p>
        <Legend />
      </header>

      <div className="app-body">
        {sidebarOpen && (
          <aside className="sidebar">
            <SongLibrary
              songs={demoSongs}
              currentSongId={engine.song?.id}
              onSelect={engine.loadSong}
              bestStarsFor={bestStarsFor}
              isDueForReview={isDueForReview}
            />
          </aside>
        )}

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
            <button
              type="button"
              className="options-toggle"
              aria-label={optionsOpen ? 'Hide options menu' : 'Show options menu'}
              aria-expanded={optionsOpen}
              onClick={() => setOptionsOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>

          {view === 'falling' && <FallingNotes {...fallingProps} />}
          {view === 'sheet' && (
            <Suspense fallback={<div className="sheet-music-loading">Loading sheet music renderer…</div>}>
              <SheetMusic {...sheetProps} />
            </Suspense>
          )}
          {view === 'both' && (
            <div className="stage-split">
              <div className="stage-split-top">
                <Suspense fallback={<div className="sheet-music-loading">Loading sheet music renderer…</div>}>
                  <SheetMusic {...sheetProps} />
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
            fingers={engine.keyFingers}
            showFingering={showFingering}
            errorFlash={errorFlash}
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
            songProgress={engine.song ? getSongProgress(engine.song.id) : undefined}
            onTogglePlay={engine.togglePlay}
            onRestart={engine.restart}
            onSeek={engine.seek}
            onSpeedChange={engine.setSpeed}
            onModeChange={engine.setMode}
          />
          <WorkoutPanel
            phase={workout.phase}
            timeLeft={workout.formattedTimeLeft}
            stats={workout.stats}
            onStart={workout.startWorkout}
            onStop={workout.stopWorkout}
            onNextSong={workout.nextSong}
          />
          <PracticeToolbar
            open={optionsOpen}
            onClose={() => setOptionsOpen(false)}
            onExportProgress={handleExportProgress}
            handFilter={engine.handFilter}
            onHandFilterChange={engine.setHandFilter}
            mixer={engine.mixer}
            onHandVolumeChange={engine.setHandVolume}
            onHandMuteChange={engine.setHandMuted}
            onHandSoloChange={engine.setHandSolo}
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
            showFingering={showFingering}
            onFingeringChange={setShowFingering}
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
