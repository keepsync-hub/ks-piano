import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { MicInputHandlers, MicSession } from '../audio/micInput'

const { connectMicInput, captured, session } = vi.hoisted(() => {
  const captured: { handlers?: MicInputHandlers } = {}
  const session: MicSession = { stop: vi.fn(), update: vi.fn(), reset: vi.fn(), calibrate: vi.fn() }
  return {
    captured,
    session,
    connectMicInput: vi.fn(async (handlers: MicInputHandlers) => {
      captured.handlers = handlers
      return session
    }),
  }
})

vi.mock('../audio/micInput', () => ({ connectMicInput }))

const { DEFAULT_MIC_SETTINGS, useMicrophoneInput } = await import('./useMicrophoneInput')

function setup(overrides: Partial<Parameters<typeof useMicrophoneInput>[0]> = {}) {
  const props = {
    enabled: true,
    settings: DEFAULT_MIC_SETTINGS,
    onNoteOn: vi.fn(),
    onNoteOff: vi.fn(),
    soundingNotes: new Set<number>(),
    requiredNotes: new Set<number>(),
    advanceKey: null as number | null,
    ...overrides,
  }
  const view = renderHook((p: typeof props) => useMicrophoneInput(p), { initialProps: props })
  return { ...view, props }
}

describe('useMicrophoneInput', () => {
  it('reads a note heard an octave off as the note practice is waiting for', async () => {
    setup({ requiredNotes: new Set([60]) })
    await waitFor(() => expect(captured.handlers).toBeDefined())

    expect(captured.handlers?.correct?.(48)).toBe(60)
    expect(captured.handlers?.correct?.(72)).toBe(60)
    // A note that is simply wrong stays wrong.
    expect(captured.handlers?.correct?.(62)).toBe(62)
  })

  it('leaves the pitch alone when octave tolerance is off', async () => {
    setup({
      requiredNotes: new Set([60]),
      settings: { ...DEFAULT_MIC_SETTINGS, octaveTolerance: false },
    })
    await waitFor(() => expect(captured.handlers).toBeDefined())

    expect(captured.handlers?.correct?.(48)).toBe(48)
  })

  it('ignores a note the app is sounding itself', async () => {
    const { rerender, props } = setup()
    await waitFor(() => expect(captured.handlers).toBeDefined())

    expect(captured.handlers?.shouldIgnore?.(64)).toBe(false)

    rerender({ ...props, soundingNotes: new Set([64]) })
    expect(captured.handlers?.shouldIgnore?.(64)).toBe(true)
  })

  it('re-arms the detector when practice mode moves on', async () => {
    const { rerender, props } = setup({ advanceKey: 1 })
    await waitFor(() => expect(captured.handlers).toBeDefined())
    vi.mocked(session.reset).mockClear()

    rerender({ ...props, advanceKey: 2 })
    expect(session.reset).toHaveBeenCalled()
  })

  it('does not open the microphone while disabled', async () => {
    connectMicInput.mockClear()
    setup({ enabled: false })

    expect(connectMicInput).not.toHaveBeenCalled()
  })
})
