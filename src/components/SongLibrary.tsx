import { useRef, useState } from 'react'
import type { Song } from '../types'
import { DEMO_SONGS } from '../midi/demoSongs'
import { parseMidiFile } from '../midi/parser'
import './SongLibrary.css'

interface SongLibraryProps {
  currentSongId: string | undefined
  onSelect: (song: Song) => void
}

export function SongLibrary({ currentSongId, onSelect }: SongLibraryProps) {
  const [uploaded, setUploaded] = useState<Song[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
          <SongRow key={song.id} song={song} active={song.id === currentSongId} onSelect={onSelect} />
        ))}
        <li className="song-list-group">Demo songs</li>
        {DEMO_SONGS.map((song) => (
          <SongRow key={song.id} song={song} active={song.id === currentSongId} onSelect={onSelect} />
        ))}
      </ul>
    </div>
  )
}

function SongRow({ song, active, onSelect }: { song: Song; active: boolean; onSelect: (s: Song) => void }) {
  return (
    <li>
      <button type="button" className={`song-row ${active ? 'song-row-active' : ''}`} onClick={() => onSelect(song)}>
        <span className="song-title">{song.title}</span>
        {song.composer && <span className="song-composer">{song.composer}</span>}
      </button>
    </li>
  )
}
