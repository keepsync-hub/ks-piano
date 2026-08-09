import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useComputerKeyboard } from './useComputerKeyboard'

describe('useComputerKeyboard', () => {
  it('fires note on/off for mapped keys', () => {
    const onNoteOn = vi.fn()
    const onNoteOff = vi.fn()

    renderHook(() => useComputerKeyboard(onNoteOn, onNoteOff))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    expect(onNoteOn).toHaveBeenCalledWith(60)

    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }))
    expect(onNoteOff).toHaveBeenCalledWith(60)
  })

  it('ignores unmapped keys', () => {
    const onNoteOn = vi.fn()
    const onNoteOff = vi.fn()

    renderHook(() => useComputerKeyboard(onNoteOn, onNoteOff))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }))
    expect(onNoteOn).not.toHaveBeenCalled()
  })

  it('ignores repeated keydown events', () => {
    const onNoteOn = vi.fn()
    const onNoteOff = vi.fn()

    renderHook(() => useComputerKeyboard(onNoteOn, onNoteOff))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', repeat: true }))
    expect(onNoteOn).not.toHaveBeenCalled()
  })
})
