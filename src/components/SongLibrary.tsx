import { useMemo, useRef, useState } from 'react'
import type { Song } from '../types'
import { parseMidiFile } from '../midi/parser'
import './SongLibrary.css'

interface SongLibraryProps {
  songs: Song[]
  currentSongId: string | undefined
  onSelect: (song: Song) => void
  bestStarsFor: (songId: string) => number
  isDueForReview: (songId: string) => boolean
}

/** Pulls the hymn number out of "Himnario y Cánticos — Himno 001"-style composer credits, if present. */
function hymnNumberOf(song: Song): string | null {
  const match = song.composer?.match(/Himno\s+(\d+)/i)
  return match ? match[1] : null
}

function matchesQuery(song: Song, query: string): boolean {
  if (!query) return true
  if (song.title.toLowerCase().includes(query)) return true
  const number = hymnNumberOf(song)
  if (!number) return false
  const normalizedNumber = number.replace(/^0+(?=\d)/, '')
  const normalizedQuery = query.replace(/^0+(?=\d)/, '')
  return number === normalizedQuery || normalizedNumber === normalizedQuery
}

export function SongLibrary({ songs, currentSongId, onSelect, bestStarsFor, isDueForReview }: SongLibraryProps) {
  const [uploaded, setUploaded] = useState<Song[]>([])
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const normalizedQuery = query.trim().toLowerCase()
  const filteredUploads = useMemo(
    () => uploaded.filter((s) => matchesQuery(s, normalizedQuery)),
    [uploaded, normalizedQuery],
  )
  const filteredSongs = useMemo(() => songs.filter((s) => matchesQuery(s, normalizedQuery)), [songs, normalizedQuery])

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
      <div className="song-search">
        <input
          type="search"
          className="song-search-input"
          placeholder="Search by name or hymn number…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search hymns by name or number"
        />
      </div>
      {error && <p className="song-library-error">{error}</p>}
      <ul className="song-list">
        {filteredUploads.length > 0 && <li className="song-list-group">Your uploads</li>}
        {filteredUploads.map((song) => (
          <SongRow
            key={song.id}
            song={song}
            active={song.id === currentSongId}
            bestStars={bestStarsFor(song.id)}
            dueForReview={isDueForReview(song.id)}
            onSelect={onSelect}
          />
        ))}

        {filteredSongs.length > 0 && <li className="song-list-group">Hymns</li>}
        {filteredSongs.map((song) => (
          <SongRow
            key={song.id}
            song={song}
            active={song.id === currentSongId}
            bestStars={bestStarsFor(song.id)}
            dueForReview={isDueForReview(song.id)}
            onSelect={onSelect}
          />
        ))}

        {filteredUploads.length === 0 && filteredSongs.length === 0 && (
          <li className="song-list-empty">No hymns match “{query}”.</li>
        )}
      </ul>
    </div>
  )
}

interface SongRowProps {
  song: Song
  active: boolean
  bestStars: number
  dueForReview: boolean
  onSelect: (s: Song) => void
}

function SongRow({ song, active, bestStars, dueForReview, onSelect }: SongRowProps) {
  const className = ['song-row', active ? 'song-row-active' : ''].filter(Boolean).join(' ')

  return (
    <li>
      <button type="button" className={className} onClick={() => onSelect(song)}>
        <span className="song-row-top">
          <span className="song-title">{song.title}</span>
          {dueForReview && (
            <span className="song-review-badge" title="It's been a few days — worth a replay">
              🔁
            </span>
          )}
        </span>
        {song.composer && <span className="song-composer">{song.composer}</span>}
        {bestStars > 0 && (
          <span className="song-stars" aria-hidden="true">
            {'★'.repeat(bestStars)}
            {'☆'.repeat(3 - bestStars)}
          </span>
        )}
      </button>
    </li>
  )
}
