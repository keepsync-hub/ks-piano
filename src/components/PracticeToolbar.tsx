import type { HandFilter, LoopRegion, MixerState } from '../hooks/usePlaybackEngine'
import type { Hand } from '../types'
import './PracticeToolbar.css'

interface PracticeToolbarProps {
  handFilter: HandFilter
  onHandFilterChange: (filter: HandFilter) => void
  mixer: MixerState
  onHandVolumeChange: (hand: Hand, volume: number) => void
  onHandMuteChange: (hand: Hand, muted: boolean) => void
  onHandSoloChange: (hand: Hand | null) => void
  metronomeEnabled: boolean
  onMetronomeChange: (enabled: boolean) => void
  countInEnabled: boolean
  onCountInChange: (enabled: boolean) => void
  countInBeat: number
  loop: LoopRegion | null
  loopEnabled: boolean
  onLoopEnabledChange: (enabled: boolean) => void
  onSetLoopStart: () => void
  onSetLoopEnd: () => void
  onClearLoop: () => void
  lookaheadSeconds: number
  onLookaheadChange: (seconds: number) => void
  showMeasureLines: boolean
  onMeasureLinesChange: (show: boolean) => void
  showFingering: boolean
  onFingeringChange: (show: boolean) => void
  inputOctaveShift: number
  onInputOctaveShiftChange: (shift: number) => void
  hasMidiDevice: boolean
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function PracticeToolbar({
  handFilter,
  onHandFilterChange,
  mixer,
  onHandVolumeChange,
  onHandMuteChange,
  onHandSoloChange,
  metronomeEnabled,
  onMetronomeChange,
  countInEnabled,
  onCountInChange,
  countInBeat,
  loop,
  loopEnabled,
  onLoopEnabledChange,
  onSetLoopStart,
  onSetLoopEnd,
  onClearLoop,
  lookaheadSeconds,
  onLookaheadChange,
  showMeasureLines,
  onMeasureLinesChange,
  showFingering,
  onFingeringChange,
  inputOctaveShift,
  onInputOctaveShiftChange,
  hasMidiDevice,
}: PracticeToolbarProps) {
  return (
    <div className="practice-toolbar">
      <div className="tool-group" role="group" aria-label="Hands">
        <span className="tool-label">Hands</span>
        {(['both', 'left', 'right'] as const).map((h) => (
          <button
            key={h}
            type="button"
            className={handFilter === h ? 'tool-btn tool-btn-active' : 'tool-btn'}
            onClick={() => onHandFilterChange(h)}
          >
            {h === 'both' ? 'Both' : h === 'left' ? 'Left' : 'Right'}
          </button>
        ))}
      </div>

      <div className="tool-group tool-group-mixer" role="group" aria-label="Hand mixer">
        <span className="tool-label">Mixer</span>
        <div className="mixer-rows">
          {(['left', 'right'] as const).map((hand) => {
            const entry = mixer[hand]
            const soloed = mixer.solo === hand
            return (
              <div className="mixer-row" key={hand}>
                <span className="mixer-hand">{hand === 'left' ? 'L' : 'R'}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(entry.volume * 100)}
                  disabled={entry.muted}
                  onChange={(e) => onHandVolumeChange(hand, Number(e.target.value) / 100)}
                  aria-label={`${hand} hand volume`}
                />
                <button
                  type="button"
                  className={entry.muted ? 'tool-btn tool-btn-active' : 'tool-btn'}
                  onClick={() => onHandMuteChange(hand, !entry.muted)}
                  title={`Mute ${hand} hand's auto-play — your own playing is never muted`}
                  aria-pressed={entry.muted}
                >
                  Mute
                </button>
                <button
                  type="button"
                  className={soloed ? 'tool-btn tool-btn-active' : 'tool-btn'}
                  onClick={() => onHandSoloChange(soloed ? null : hand)}
                  title={`Solo ${hand} hand`}
                  aria-pressed={soloed}
                >
                  Solo
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="tool-group">
        <span className="tool-label">Metronome</span>
        <button
          type="button"
          className={metronomeEnabled ? 'tool-btn tool-btn-active' : 'tool-btn'}
          onClick={() => onMetronomeChange(!metronomeEnabled)}
          title="Toggle metronome (M)"
        >
          {metronomeEnabled ? 'On' : 'Off'}
        </button>
        <label className="tool-check">
          <input type="checkbox" checked={countInEnabled} onChange={(e) => onCountInChange(e.target.checked)} />
          Count-in
        </label>
        {countInBeat > 0 && <span className="tool-countin">{countInBeat}</span>}
      </div>

      <div className="tool-group">
        <span className="tool-label">Loop</span>
        <button type="button" className="tool-btn" onClick={onSetLoopStart} title="Set loop start ([)">
          Set A
        </button>
        <button type="button" className="tool-btn" onClick={onSetLoopEnd} title="Set loop end (])">
          Set B
        </button>
        {loop && (
          <>
            <button
              type="button"
              className={loopEnabled ? 'tool-btn tool-btn-active' : 'tool-btn'}
              onClick={() => onLoopEnabledChange(!loopEnabled)}
            >
              {loopEnabled ? 'On' : 'Off'}
            </button>
            <span className="tool-readout">
              {formatTime(loop.start)}–{formatTime(loop.end)}
            </span>
            <button type="button" className="tool-btn" onClick={onClearLoop} title="Clear loop (X)">
              Clear
            </button>
          </>
        )}
      </div>

      <div className="tool-group">
        <span className="tool-label">Zoom</span>
        <input
          type="range"
          min={1.5}
          max={7}
          step={0.5}
          value={lookaheadSeconds}
          onChange={(e) => onLookaheadChange(Number(e.target.value))}
          title="Seconds of music shown on the stage"
        />
        <label className="tool-check">
          <input
            type="checkbox"
            checked={showMeasureLines}
            onChange={(e) => onMeasureLinesChange(e.target.checked)}
          />
          Beat lines
        </label>
      </div>

      <div className="tool-group">
        <span className="tool-label">Fingering</span>
        <button
          type="button"
          className={showFingering ? 'tool-btn tool-btn-active' : 'tool-btn'}
          onClick={() => onFingeringChange(!showFingering)}
          title="Show suggested finger numbers on the keys and score (N)"
        >
          {showFingering ? 'On' : 'Off'}
        </button>
        {showFingering && <span className="tool-hint">Press 1–5 while practising to correct</span>}
      </div>

      {hasMidiDevice && (
        <div className="tool-group">
          <span className="tool-label">Input octave</span>
          <button type="button" className="tool-btn" onClick={() => onInputOctaveShiftChange(inputOctaveShift - 1)}>
            −
          </button>
          <span className="tool-readout">
            {inputOctaveShift > 0 ? `+${inputOctaveShift}` : inputOctaveShift}
          </span>
          <button type="button" className="tool-btn" onClick={() => onInputOctaveShiftChange(inputOctaveShift + 1)}>
            +
          </button>
        </div>
      )}
    </div>
  )
}
