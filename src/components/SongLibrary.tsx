import { useMemo, useRef, useState } from 'react'
import type { ProfileType, Song } from '../types'
import { DEMO_SONGS } from '../midi/demoSongs'
import { parseMidiFile } from '../midi/parser'
import { buildSkillPath } from '../piano/skillPath'
import './SongLibrary.css'

interface SongLibraryProps {
  currentSongId: string | undefined
  onSelect: (song: Song) => void
  profileType: ProfileType
  bestStarsFor: (songId: string) => number
  isDueForReview: (songId: string) => boolean
}

export function SongLibrary({ currentSongId, onSelect, profileType, bestStarsFor, isDueForReview }: SongLibraryProps) {
  const [uploaded, setUploaded] = useState<Song[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const tiers = useMemo(
    () => buildSkillPath(DEMO_SONGS, bestStarsFor, profileType),
    [bestStarsFor, profileType],
  )

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    try {
      const song = await parseMidiFile(files[0])
      if (song.notes.length === 0) {
        setError('No playable notes found in that file (only 88-key piano range is supported).')
        return
      }
      setUploaded((prev) => [song, ...prev.filter((s) => s.title !== song.title)])
      onSelect(song)
    } catch {
      setError('Could not read that file as a MIDI file.')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="song-library">
      <div className="song-library-header">
        <h2>Songs</h2>
        <button type="button" className="upload-btn" onClick={() => fileInputRef.current?.click()}>
          + Upload MIDI
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".mid,.midi,audio/midi"
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && <p className="song-library-error">{error}</p>}
      <ul className="song-list">
        {uploaded.length > 0 && <li className="song-list-group">Your uploads</li>}
        {uploaded.map((song) => (
          <SongRow
            key={song.id}
            song={song}
            active={song.id === currentSongId}
            locked={false}
            bestStars={bestStarsFor(song.id)}
            dueForReview={isDueForReview(song.id)}
            onSelect={onSelect}
          />
        ))}

        {tiers.map((tier) => (
          <li key={tier.tier} className="song-tier">
            <div className="song-list-group song-tier-header">
              <span>
                Tier {tier.tier} · {tier.label}
              </span>
              {!tier.unlocked && <span className="song-tier-lock" title="Master the previous tier to unlock">🔒</span>}
            </div>
            <ul className="song-tier-songs">
              {tier.songs.map((song) => (
                <SongRow
                  key={song.id}
                  song={song}
                  active={song.id === currentSongId}
                  locked={!tier.unlocked}
                  bestStars={bestStarsFor(song.id)}
                  dueForReview={isDueForReview(song.id)}
                  onSelect={onSelect}
                />
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface SongRowProps {
  song: Song
  active: boolean
  locked: boolean
  bestStars: number
  dueForReview: boolean
  onSelect: (s: Song) => void
}

function SongRow({ song, active, locked, bestStars, dueForReview, onSelect }: SongRowProps) {
  const className = [
    'song-row',
    active ? 'song-row-active' : '',
    locked ? 'song-row-locked' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li>
      <button
        type="button"
        className={className}
        onClick={() => !locked && onSelect(song)}
        disabled={locked}
        title={locked ? 'Locked — practise the previous tier first' : undefined}
      >
        <span className="song-row-top">
          <span className="song-title">{song.title}</span>
          {locked && <span className="song-lock-icon">🔒</span>}
          {!locked && dueForReview && (
            <span className="song-review-badge" title="It's been a few days — worth a replay">
              🔁
            </span>
          )}
        </span>
        {song.composer && <span className="song-composer">{song.composer}</span>}
        {!locked && bestStars > 0 && (
          <span className="song-stars" aria-hidden="true">
            {'★'.repeat(bestStars)}
            {'☆'.repeat(3 - bestStars)}
          </span>
        )}
      </button>
    </li>
  )
}
