import type { CSSProperties } from 'react'
import './ProgressHUD.css'

interface ProgressHUDProps {
  level: number
  xpIntoLevel: number
  xpForNextLevel: number
  todayXp: number
  dailyGoalXp: number
  dailyGoalMet: boolean
  streakDays: number
}

export function ProgressHUD({
  level,
  xpIntoLevel,
  xpForNextLevel,
  todayXp,
  dailyGoalXp,
  dailyGoalMet,
  streakDays,
}: ProgressHUDProps) {
  const levelPct = Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100))
  const goalPct = Math.min(100, Math.round((todayXp / Math.max(dailyGoalXp, 1)) * 100))

  return (
    <div className="progress-hud">
      <div className="hud-level" title={`Level ${level} — ${xpIntoLevel}/${xpForNextLevel} XP to next level`}>
        <span className="hud-level-badge">Lv {level}</span>
        <div className="hud-xp-bar">
          <div className="hud-xp-fill" style={{ width: `${levelPct}%` }} />
        </div>
      </div>

      <div
        className={dailyGoalMet ? 'hud-goal hud-goal-met' : 'hud-goal'}
        title={`Daily goal: ${todayXp}/${dailyGoalXp} XP`}
      >
        <span className="hud-goal-ring" style={{ '--goal-pct': `${goalPct}%` } as CSSProperties}>
          {dailyGoalMet ? '✓' : `${goalPct}%`}
        </span>
        <span className="hud-goal-label">Daily goal</span>
      </div>

      {streakDays > 0 && (
        <span className="streak-badge" title={`${streakDays} day practice streak`}>
          🔥 {streakDays}
        </span>
      )}
    </div>
  )
}
