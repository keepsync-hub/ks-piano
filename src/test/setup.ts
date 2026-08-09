import { vi } from 'vitest'

// Polyfill for environments without requestAnimationFrame (jsdom does not provide it).
globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
  return window.setTimeout(() => cb(performance.now()), 16) as unknown as number
})

globalThis.cancelAnimationFrame = vi.fn((id: number) => {
  window.clearTimeout(id as unknown as ReturnType<typeof setTimeout>)
})
