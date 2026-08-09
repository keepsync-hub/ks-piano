import { useState, type FormEvent } from 'react'
import type { Profile, ProfileType } from '../types'
import './ProfileGate.css'

interface ProfileGateProps {
  profiles: Profile[]
  onSelect: (id: string) => void
  onCreate: (name: string, type: ProfileType) => void
}

/**
 * Full-screen picker shown before any practice UI: choose an existing
 * profile or create a new one. Every profile keeps its own progress, songs
 * shown and daily goal, so one household piano can serve a child and an
 * adult without mixing up their streaks.
 */
export function ProfileGate({ profiles, onSelect, onCreate }: ProfileGateProps) {
  const [creating, setCreating] = useState(profiles.length === 0)
  const [name, setName] = useState('')
  const [type, setType] = useState<ProfileType>('child')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onCreate(name, type)
  }

  if (!creating) {
    return (
      <div className="profile-gate">
        <div className="profile-gate-card">
          <h1>Who's playing?</h1>
          <ul className="profile-list">
            {profiles.map((p) => (
              <li key={p.id}>
                <button type="button" className="profile-item" onClick={() => onSelect(p.id)}>
                  <span className="profile-avatar">{p.avatar}</span>
                  <span className="profile-name">{p.name}</span>
                  <span className="profile-type">{p.type === 'child' ? 'Kid' : 'Adult'}</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="profile-add-btn" onClick={() => setCreating(true)}>
            + Add a profile
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-gate">
      <form className="profile-gate-card" onSubmit={handleSubmit}>
        <h1>{profiles.length === 0 ? 'Welcome to ks-piano' : 'New profile'}</h1>
        <p className="profile-gate-subtitle">
          Tell us who's practising so we can pick the right songs and track your own streak.
        </p>

        <label className="profile-field">
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex"
            autoFocus
            maxLength={30}
          />
        </label>

        <div className="profile-type-choice" role="radiogroup" aria-label="Profile type">
          <button
            type="button"
            className={type === 'child' ? 'profile-type-btn profile-type-btn-active' : 'profile-type-btn'}
            onClick={() => setType('child')}
            aria-pressed={type === 'child'}
          >
            <span className="profile-type-emoji">🧒</span>
            <span className="profile-type-name">Kid</span>
            <span className="profile-type-desc">Starts with simple, short songs and a gentler daily goal.</span>
          </button>
          <button
            type="button"
            className={type === 'adult' ? 'profile-type-btn profile-type-btn-active' : 'profile-type-btn'}
            onClick={() => setType('adult')}
            aria-pressed={type === 'adult'}
          >
            <span className="profile-type-emoji">🧑</span>
            <span className="profile-type-name">Adult</span>
            <span className="profile-type-desc">Full song library, up to advanced pieces, from the start.</span>
          </button>
        </div>

        <div className="profile-gate-actions">
          {profiles.length > 0 && (
            <button type="button" className="profile-cancel-btn" onClick={() => setCreating(false)}>
              Cancel
            </button>
          )}
          <button type="submit" className="profile-submit-btn">
            Start playing
          </button>
        </div>
      </form>
    </div>
  )
}
