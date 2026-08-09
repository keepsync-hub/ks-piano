import type { Hand } from '../types'

/**
 * Single source of truth for note colouring, shared by the falling-notes
 * canvas, the sheet-music overlay and the keyboard, so a note reads the same
 * everywhere.
 */
export const HAND_COLORS: Record<Hand, { base: string; light: string; dark: string }> = {
  left: { base: '#4a90d9', light: '#7fb6ea', dark: '#2f6fb5' },
  right: { base: '#8bc34a', light: '#b0dd7a', dark: '#649a2c' },
}

/** Notes the user is currently pressing. */
export const INPUT_COLOR = { base: '#ff5fa8', light: '#ffa3cd', dark: '#c93b7c' }

/** Notes practice mode is waiting for. */
export const REQUIRED_COLOR = { base: '#ffb84d', light: '#ffd695', dark: '#c98a24' }

export const STAGE_BG = '#3c3f43'
export const OCTAVE_LINE = 'rgba(255, 255, 255, 0.16)'
export const HIT_LINE = '#d94a4a'
