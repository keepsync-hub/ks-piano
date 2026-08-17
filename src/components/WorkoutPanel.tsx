import type { WorkoutPhase, WorkoutStats } from '../hooks/useWorkout'
import { Confetti } from './Confetti'
import './WorkoutPanel.css'

interface WorkoutPanelProps {
  phase: WorkoutPhase
  timeLeft: string
  stats: WorkoutStats
  onStart: () => void
  onStop: () => void
  onNextSong: () => void
}

export function WorkoutPanel({ phase, timeLeft, stats, onStart, onStop, onNextSong }: WorkoutPanelProps) {
  if (phase === 'idle') {
    return (
      <div className="workout-panel">
        <button type="button" className="workout-btn workout-btn-start" onClick={onStart}>
          ▶ Start 5-Min Workout
        </button>
      </div>
    )
  }

  if (phase === 'finished') {
    return (
      <div className="workout-panel workout-panel-finished">
        <Confetti />
        <div className="workout-summary">
          <h3>Workout Complete! 🎉</h3>
          <div className="workout-stats">
            <div className="workout-stat" style={{ animationDelay: '0s' }}>
              <span className="workout-stat-value">{stats.notesPlayed}</span>
              <span className="workout-stat-label">Notes</span>
            </div>
            <div className="workout-stat" style={{ animationDelay: '0.06s' }}>
              <span className="workout-stat-value">{stats.errors}</span>
              <span className="workout-stat-label">Errors</span>
            </div>
            <div className="workout-stat" style={{ animationDelay: '0.12s' }}>
              <span className="workout-stat-value">{stats.accuracy}%</span>
              <span className="workout-stat-label">Accuracy</span>
            </div>
            <div className="workout-stat" style={{ animationDelay: '0.18s' }}>
              <span className="workout-stat-value">{stats.songsCompleted}</span>
              <span className="workout-stat-label">Songs</span>
            </div>
          </div>
          <button type="button" className="workout-btn workout-btn-start" onClick={onStart}>
            ▶ Another Workout
          </button>
        </div>
      </div>
    )
  }

  // Active phase
  return (
    <div className="workout-panel workout-panel-active">
      <div className="workout-timer" title="Time remaining">
        ⏱ {timeLeft}
      </div>
      <div className="workout-live-stats">
        <span className="workout-live-stat">{stats.notesPlayed} notes</span>
        <span className="workout-live-stat">{stats.errors} errors</span>
        <span className="workout-live-stat">{stats.accuracy}%</span>
      </div>
      <div className="workout-actions">
        <button type="button" className="workout-btn workout-btn-next" onClick={onNextSong}>
          ⏭ Next Song
        </button>
        <button type="button" className="workout-btn workout-btn-stop" onClick={onStop}>
          ⏹ End Workout
        </button>
      </div>
    </div>
  )
}
