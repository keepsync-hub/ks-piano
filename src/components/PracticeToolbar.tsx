import type { HandFilter, LoopRegion, MixerState, OutputRoute } from '../hooks/usePlaybackEngine'
import type { MidiOutputDevice } from '../audio/midiOutput'
import type { MicSettings } from '../hooks/useMicrophoneInput'
import type { MicStatus } from '../audio/micInput'
import { midiToLabel, midiToOctave } from '../piano/noteNames'
import type { Hand } from '../types'
import './PracticeToolbar.css'

interface PracticeToolbarProps {
  open: boolean
  onClose: () => void
  onExportProgress: () => void
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
  outputRoute: OutputRoute
  onOutputRouteChange: (route: OutputRoute) => void
  midiOutputs: MidiOutputDevice[]
  midiOutputId: string | null
  onMidiOutputChange: (id: string | null) => void
  micEnabled: boolean
  onMicEnabledChange: (enabled: boolean) => void
  micStatus: MicStatus
  micLevel: number
  micDetectedMidi: number | null
  micSettings: MicSettings
  onMicSettingsChange: (settings: MicSettings) => void
  onMicCalibrate: () => void
}

const OUTPUT_ROUTE_LABEL: Record<OutputRoute, string> = {
  internal: 'This device',
  midi: 'MIDI piano',
  both: 'Both',
}

const MIC_STATUS_TEXT: Record<MicStatus, string> = {
  off: 'Off',
  idle: 'Starts in Practice mode',
  requesting: 'Asking permission…',
  waiting: 'Click the page to start',
  listening: 'Listening',
  denied: 'Permission denied',
  unsupported: 'Not supported here',
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function PracticeToolbar({
  open,
  onClose,
  onExportProgress,
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
  outputRoute,
  onOutputRouteChange,
  midiOutputs,
  midiOutputId,
  onMidiOutputChange,
  micEnabled,
  onMicEnabledChange,
  micStatus,
  micLevel,
  micDetectedMidi,
  micSettings,
  onMicSettingsChange,
  onMicCalibrate,
}: PracticeToolbarProps) {
  // Web MIDI output only exists in Chromium-based browsers; elsewhere the
  // controls stay visible but inert, with a line saying why.
  const webMidiSupported = typeof navigator !== 'undefined' && !!navigator.requestMIDIAccess
  const midiOutputSupported = midiOutputs.length > 0
  const outputHint = webMidiSupported
    ? 'Connect a piano over USB-MIDI to hear it play the song'
    : 'MIDI output needs Chrome, Edge or Opera'

  return (
    <>
      {open && <div className="toolbar-backdrop" onClick={onClose} />}
      <div
        className={open ? 'practice-toolbar practice-toolbar-open' : 'practice-toolbar'}
        aria-hidden={!open}
        role="dialog"
        aria-label="Practice options"
      >
        <div className="toolbar-drawer-header">
          <span className="toolbar-drawer-title">Options</span>
          <button type="button" className="toolbar-close-btn" onClick={onClose} aria-label="Close options menu">
            ✕
          </button>
        </div>

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

        <div className="tool-group tool-group-output" role="group" aria-label="Sound output">
          <span className="tool-label">Sound out</span>
          {(['internal', 'midi', 'both'] as const).map((route) => (
            <button
              key={route}
              type="button"
              className={outputRoute === route ? 'tool-btn tool-btn-active' : 'tool-btn'}
              onClick={() => onOutputRouteChange(route)}
              disabled={route !== 'internal' && !midiOutputSupported}
              aria-pressed={outputRoute === route}
              title={
                route === 'internal'
                  ? 'Play the song through this computer'
                  : route === 'midi'
                    ? 'Let the connected instrument make the sound itself'
                    : 'Play through both at once'
              }
            >
              {OUTPUT_ROUTE_LABEL[route]}
            </button>
          ))}
          {!midiOutputSupported && <span className="tool-hint">{outputHint}</span>}
          {midiOutputSupported && midiOutputs.length > 1 && (
            <label className="tool-select">
              Port
              <select
                value={midiOutputId ?? ''}
                onChange={(e) => onMidiOutputChange(e.target.value || null)}
                aria-label="MIDI output port"
              >
                <option value="">{`Automatic (${midiOutputs[0].name})`}</option>
                {midiOutputs.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {midiOutputSupported && outputRoute !== 'internal' && (
            <span className="tool-hint">The metronome still clicks through this device</span>
          )}
        </div>

        <div className="tool-group tool-group-mic" role="group" aria-label="Microphone input">
          <span className="tool-label">Microphone</span>
          <button
            type="button"
            className={micEnabled ? 'tool-btn tool-btn-active' : 'tool-btn'}
            onClick={() => onMicEnabledChange(!micEnabled)}
            title="Hear the notes you play on a real piano, instead of using a MIDI cable"
            aria-pressed={micEnabled}
          >
            {micEnabled ? 'On' : 'Off'}
          </button>
          <span className="tool-readout tool-readout-wide">{MIC_STATUS_TEXT[micStatus]}</span>
          {micEnabled && micStatus === 'listening' && (
            <>
              <div className="mic-meter" role="presentation">
                <div className="mic-meter-fill" style={{ width: `${Math.round(micLevel * 100)}%` }} />
              </div>
              <span className="mic-note" aria-live="off">
                {micDetectedMidi === null ? '—' : `${midiToLabel(micDetectedMidi)}${midiToOctave(micDetectedMidi)}`}
              </span>
              <button type="button" className="tool-btn" onClick={onMicCalibrate} title="Measure the room noise — stay quiet for a moment">
                Calibrate
              </button>
            </>
          )}
          {micEnabled && (
            <>
              <label className="tool-slider">
                Sensitivity
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(micSettings.sensitivity * 100)}
                  onChange={(e) => onMicSettingsChange({ ...micSettings, sensitivity: Number(e.target.value) / 100 })}
                  aria-label="Microphone sensitivity"
                />
              </label>
              <label className="tool-check">
                <input
                  type="checkbox"
                  checked={micSettings.chordDetection}
                  onChange={(e) => onMicSettingsChange({ ...micSettings, chordDetection: e.target.checked })}
                />
                Chords (experimental)
              </label>
              <label className="tool-check">
                <input
                  type="checkbox"
                  checked={micSettings.octaveTolerance}
                  onChange={(e) => onMicSettingsChange({ ...micSettings, octaveTolerance: e.target.checked })}
                />
                Allow octave slips
              </label>
              <span className="tool-hint">
                Use headphones — the app's own sound confuses the detector. In practice mode the detector also
                looks for the notes you are being asked to play, which is what makes chords work.
              </span>
            </>
          )}
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

        <div className="tool-group">
          <span className="tool-label">Progress</span>
          <button
            type="button"
            className="tool-btn"
            onClick={onExportProgress}
            title="Download every profile's stars, daily goal and streak as a Markdown file"
          >
            ⤓ Export progress (.md)
          </button>
        </div>
      </div>
    </>
  )
}
