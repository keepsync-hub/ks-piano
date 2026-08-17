import { useMemo } from 'react'
import './Confetti.css'

const COLORS = ['var(--brand)', 'var(--gold)', 'var(--success)', 'var(--warm)', 'var(--brand-light)']

/** One-shot celebratory burst, meant to mount alongside a "you did it" moment (e.g. workout complete). */
export function Confetti({ pieces = 24 }: { pieces?: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        id: i,
        x: `${Math.round(Math.random() * 100)}%`,
        delay: `${(Math.random() * 0.4).toFixed(2)}s`,
        color: COLORS[i % COLORS.length],
      })),
    [pieces],
  )

  return (
    <div className="confetti" aria-hidden="true">
      {items.map((item) => (
        <span
          key={item.id}
          className="confetti-piece"
          style={{ ['--x' as string]: item.x, ['--delay' as string]: item.delay, ['--color' as string]: item.color }}
        />
      ))}
    </div>
  )
}
