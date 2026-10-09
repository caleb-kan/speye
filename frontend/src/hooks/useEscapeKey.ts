import { useEffect } from 'react'
import { useRefSync } from './useRefSync'

const activeHandlers: object[] = []

export function useEscapeKey(onEscape: () => void, enabled = true) {
  const onEscapeRef = useRefSync(onEscape)
  useEffect(() => {
    if (!enabled) return
    const handler = {}
    activeHandlers.push(handler)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' &&
        !e.repeat &&
        !e.defaultPrevented &&
        activeHandlers.at(-1) === handler
      ) {
        e.preventDefault()
        e.stopImmediatePropagation()
        onEscapeRef.current()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      activeHandlers.splice(activeHandlers.indexOf(handler), 1)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onEscapeRef, enabled])
}
