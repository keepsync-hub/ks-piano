import { useEffect, useState } from 'react'
import type { LoopRegion } from '../hooks/usePlaybackEngine'
import type { SongProgress } from '../hooks/useProgress'
import type { PlaybackMode, Song } from '../types'
import './TransportControls.css'

interface TransportControlsProps {
  song: Song | null
  playing: boolean
  time: number
  progress: number
  speed: number
  mode: PlaybackMode
  midiDevices: string[]
  isWaitingForInput: boolean
  loop?: LoopRegion | null
  loopEnabled?: boolean
  songProgress?: SongProgress
  onTogglePlay: () => void
  onRestart: () => void
  onSeek: (t: number) => void
  onSpeedChange: (s: number) => void
  onModeChange: (m: PlaybackMode) => void
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function TransportControls({
  song,
  playing,
  time,
  progress,
  speed,
  mode,
  midiDevices,
  isWaitingForInput,
  loop,
  loopEnabled,
  songProgress,
  onTogglePlay,
  onRestart,
  onSeek,
  onSpeedChange,
  onModeChange,
}: TransportControlsProps) {
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement)

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen()
  }

  return (
    <div className="transport">
      <div className="transport-row">
        <button type="button" className="icon-btn" onClick={onRestart} disabled={!song} title="Restart">
          ⏮
        </button>
        <button
          type="button"
          className="icon-btn icon-btn-primary"
          onClick={onTogglePlay}
          disabled={!song}
          title={playing ? 'Pause' : 'Play'}
        >
          {playing ? '⏸' : '▶'}
        </button>

        <div className="seek-wrap">
          {song && loop && song.duration > 0 && (
            <span
              className={loopEnabled ? 'seek-loop' : 'seek-loop seek-loop-off'}
              style={{
                left: `${(loop.start / song.duration) * 100}%`,
                width: `${((loop.end - loop.start) / song.duration) * 100}%`,
              }}
            />
          )}
          <input
            className="seek"
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={Number.isFinite(progress) ? progress : 0}
            disabled={!song}
            onChange={(e) => song && onSeek(Number(e.target.value) * song.duration)}
          />
        </div>
        <span className="time-label">
          {formatTime(time)} / {formatTime(song?.duration ?? 0)}
        </span>

        <div className="mode-toggle" role="group" aria-label="Playback mode">
          <button
            type="button"
            className={mode === 'listen' ? 'mode-btn mode-btn-active' : 'mode-btn'}
            onClick={() => onModeChange('listen')}
          >
            Listen
          </button>
          <button
            type="button"
            className={mode === 'practice' ? 'mode-btn mode-btn-active' : 'mode-btn'}
            onClick={() => onModeChange('practice')}
          >
            Practice
          </button>
        </div>

        <label className="speed-control">
          Speed
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.05}
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
          />
          <span>{speed.toFixed(2)}x</span>
        </label>

        <button
          type="button"
          className="icon-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          aria-pressed={isFullscreen}
        >
          {isFullscreen ? '⤡' : '⤢'}
        </button>
      </div>

      <div className="transport-row transport-status">
        {mode === 'practice' && (
          <span className={isWaitingForInput ? 'status-pill status-pill-waiting' : 'status-pill'}>
            {isWaitingForInput ? 'Waiting for the highlighted note(s)…' : 'Practice mode'}
          </span>
        )}
        {songProgress && songProgress.bestStars > 0 && (
          <span
            className="status-pill status-pill-stars"
            title={`Best: ${songProgress.bestStars}/3 stars, ${songProgress.bestErrors} errors`}
          >
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i}>{i < songProgress.bestStars ? '★' : '☆'}</span>
            ))}
          </span>
        )}
        <span className="status-pill status-pill-muted">
          {midiDevices.length > 0 ? `MIDI: ${midiDevices.join(', ')}` : 'No MIDI device — use the on-screen keys or A–; keys'}
        </span>
      </div>
    </div>
  )
}
