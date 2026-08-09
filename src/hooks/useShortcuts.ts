import { useEffect } from 'react'

export interface ShortcutHandlers {
  onTogglePlay: () => void
  onRestart: () => void
  onSeekBy: (deltaSeconds: number) => void
  onToggleMetronome: () => void
  onSetLoopStart: () => void
  onSetLoopEnd: () => void
  onClearLoop: () => void
}

/**
 * Transport shortcuts. Deliberately avoids the letters the on-screen piano
 * uses for typing notes (a,w,s,e,d,f,t,g,y,h,u,j,k,o,l,p,;).
 */
export function useShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      const el = target as HTMLElement | null
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          handlers.onTogglePlay()
          return
        case 'ArrowLeft':
          e.preventDefault()
          handlers.onSeekBy(e.shiftKey ? -1 : -5)
          return
        case 'ArrowRight':
          e.preventDefault()
          handlers.onSeekBy(e.shiftKey ? 1 : 5)
          return
        case 'Home':
          e.preventDefault()
          handlers.onRestart()
          return
      }

      switch (e.key.toLowerCase()) {
        case 'r':
          e.preventDefault()
          handlers.onRestart()
          break
        case 'm':
          e.preventDefault()
          handlers.onToggleMetronome()
          break
        case '[':
          e.preventDefault()
          handlers.onSetLoopStart()
          break
        case ']':
          e.preventDefault()
          handlers.onSetLoopEnd()
          break
        case 'x':
          e.preventDefault()
          handlers.onClearLoop()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlers])
}
