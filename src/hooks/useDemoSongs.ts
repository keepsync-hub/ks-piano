import { useEffect, useState } from 'react'
import type { Song } from '../types'
import { ADULT_PIANO_ADVENTURES_BOOK1_SONGS } from '../midi/adultPianoAdventuresBook1'

/**
 * The Himnario Grande set is ~250 hymns' worth of note data (several MB of
 * generated source) — bundling it eagerly with the rest of the app blows up
 * the main chunk and delays first paint/interactivity, especially on a slow
 * connection or device. It's fetched as a separate chunk instead, so the
 * small Adult Piano Adventures set (already enough for a profile's first
 * song) is available immediately and the hymnal songs pop in once loaded.
 */
export function useDemoSongs(): Song[] {
  const [songs, setSongs] = useState<Song[]>(ADULT_PIANO_ADVENTURES_BOOK1_SONGS)

  useEffect(() => {
    let cancelled = false
    import('../midi/himnarioGrande').then((m) => {
      if (!cancelled) setSongs([...ADULT_PIANO_ADVENTURES_BOOK1_SONGS, ...m.HIMNARIO_GRANDE_SONGS])
    })
    return () => {
      cancelled = true
    }
  }, [])

  return songs
}
