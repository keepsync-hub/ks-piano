import './ProgressHUD.css'

interface ProgressHUDProps {
  level: number
  xpIntoLevel: number
  xpForNextLevel: number
  dailyGoalMet: boolean
  streakDays: number
}

export function ProgressHUD({ level, xpIntoLevel, xpForNextLevel, dailyGoalMet, streakDays }: ProgressHUDProps) {
  const levelPct = Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100))

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
        title={dailyGoalMet ? 'Daily goal met — finished a workout session today' : 'Finish a workout session to meet today’s goal'}
      >
        <span className="hud-goal-ring">{dailyGoalMet ? '✓' : ''}</span>
        <span className="hud-goal-label">Daily goal</span>
      </div>

      {streakDays > 0 && (
        <span className="streak-badge" title={`${streakDays} day practice streak`}>
          <span className="streak-flame">🔥</span> {streakDays}
        </span>
      )}
    </div>
  )
}
