import { describe, expect, it, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useProfiles } from './useProfiles'

describe('useProfiles', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('starts with no profiles and no active profile', () => {
    const { result } = renderHook(() => useProfiles())
    expect(result.current.profiles).toEqual([])
    expect(result.current.activeProfile).toBeNull()
  })

  it('creates a profile and makes it active', () => {
    const { result } = renderHook(() => useProfiles())
    act(() => {
      result.current.createProfile('Alex', 'child')
    })
    expect(result.current.profiles).toHaveLength(1)
    expect(result.current.activeProfile?.name).toBe('Alex')
    expect(result.current.activeProfile?.type).toBe('child')
  })

  it('falls back to a default name when blank', () => {
    const { result } = renderHook(() => useProfiles())
    act(() => {
      result.current.createProfile('   ', 'adult')
    })
    expect(result.current.activeProfile?.name).toBe('Adult')
  })

  it('supports creating multiple profiles and switching between them', () => {
    const { result } = renderHook(() => useProfiles())
    act(() => {
      result.current.createProfile('Kid', 'child')
    })
    const kidId = result.current.activeProfile!.id

    act(() => {
      result.current.createProfile('Grown-up', 'adult')
    })
    expect(result.current.profiles).toHaveLength(2)
    expect(result.current.activeProfile?.name).toBe('Grown-up')

    act(() => {
      result.current.selectProfile(kidId)
    })
    expect(result.current.activeProfile?.name).toBe('Kid')
  })

  it('deletes a profile and clears it if it was active', () => {
    const { result } = renderHook(() => useProfiles())
    act(() => {
      result.current.createProfile('Solo', 'adult')
    })
    const id = result.current.activeProfile!.id

    act(() => {
      result.current.deleteProfile(id)
    })
    expect(result.current.profiles).toHaveLength(0)
    expect(result.current.activeProfile).toBeNull()
  })

  it('clearActiveProfile deselects without deleting', () => {
    const { result } = renderHook(() => useProfiles())
    act(() => {
      result.current.createProfile('Solo', 'adult')
    })
    act(() => {
      result.current.clearActiveProfile()
    })
    expect(result.current.activeProfile).toBeNull()
    expect(result.current.profiles).toHaveLength(1)
  })
})
