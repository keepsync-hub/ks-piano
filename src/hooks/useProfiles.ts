import { useCallback, useMemo } from 'react'
import type { Profile, ProfileType } from '../types'
import { useLocalStorage } from './useLocalStorage'

const CHILD_AVATARS = ['🦁', '🐸', '🐼', '🦊', '🐻', '🐨']
const ADULT_AVATARS = ['🎹', '🎵', '🎶', '🎼', '🎻', '🎺']

function randomAvatar(type: ProfileType): string {
  const pool = type === 'child' ? CHILD_AVATARS : ADULT_AVATARS
  return pool[Math.floor(Math.random() * pool.length)]
}

function createId(): string {
  return `profile-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

/**
 * Manages the list of local profiles (one household piano, several players)
 * and which one is currently active. Persists to localStorage.
 */
export function useProfiles() {
  const [profiles, setProfiles] = useLocalStorage<Profile[]>('ks-piano-profiles', [])
  const [activeProfileId, setActiveProfileId] = useLocalStorage<string | null>('ks-piano-active-profile', null)

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) ?? null,
    [profiles, activeProfileId],
  )

  const createProfile = useCallback(
    (name: string, type: ProfileType): Profile => {
      const profile: Profile = {
        id: createId(),
        name: name.trim() || (type === 'child' ? 'Player' : 'Adult'),
        type,
        avatar: randomAvatar(type),
        createdAt: Date.now(),
      }
      setProfiles((prev) => [...prev, profile])
      setActiveProfileId(profile.id)
      return profile
    },
    [setProfiles, setActiveProfileId],
  )

  const selectProfile = useCallback(
    (id: string) => {
      setActiveProfileId(id)
    },
    [setActiveProfileId],
  )

  const deleteProfile = useCallback(
    (id: string) => {
      setProfiles((prev) => prev.filter((p) => p.id !== id))
      setActiveProfileId((prev) => (prev === id ? null : prev))
    },
    [setProfiles, setActiveProfileId],
  )

  const clearActiveProfile = useCallback(() => {
    setActiveProfileId(null)
  }, [setActiveProfileId])

  return {
    profiles,
    activeProfile,
    createProfile,
    selectProfile,
    deleteProfile,
    clearActiveProfile,
  }
}
