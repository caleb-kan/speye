import { useLayoutEffect, useRef, type RefObject } from 'react'

type ResizeCallback = (rect: DOMRect) => void

type UseResizeObserverOptions = {
  /** Whether the observer is active (default: true) */
  enabled?: boolean
  /** Whether to trigger callback immediately on mount (default: true) */
  immediate?: boolean
}

/**
 * Creates a ResizeObserver that calls the callback with getBoundingClientRect()
 * on resize. Internal helper to reduce duplication between hooks.
 */
function createResizeObserver(
  element: HTMLElement,
  callbackRef: RefObject<ResizeCallback>,
  immediate: boolean
): ResizeObserver {
  const observer = new ResizeObserver(() => {
    // Always use getBoundingClientRect() for accurate viewport-relative positions
    // contentRect from ResizeObserver is relative to padding edge, not viewport
    callbackRef.current(element.getBoundingClientRect())
  })

  if (immediate) {
    callbackRef.current(element.getBoundingClientRect())
  }

  observer.observe(element)
  return observer
}

/**
 * Hook for observing element resize events with automatic cleanup.
 *
 * @param callback - Called with the element's DOMRect when size changes
 * @param options - Configuration options
 * @returns Ref to attach to the element to observe
 *
 * @example
 * ```tsx
 * const handleResize = useCallback((rect) => {
 *   console.log('New size:', rect.width, rect.height)
 * }, [])
 *
 * const ref = useResizeObserver(handleResize)
 *
 * return <div ref={ref}>Content</div>
 * ```
 */
export function useResizeObserver<T extends HTMLElement = HTMLElement>(
  callback: ResizeCallback,
  options: UseResizeObserverOptions = {}
): RefObject<T | null> {
  const { enabled = true, immediate = true } = options

  const ref = useRef<T | null>(null)
  const callbackRef = useRef(callback)

  useLayoutEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useLayoutEffect(() => {
    const element = ref.current
    if (!element || !enabled) return

    const observer = createResizeObserver(element, callbackRef, immediate)
    return () => observer.disconnect()
  }, [enabled, immediate])

  return ref
}

/**
 * Hook for observing resize with external ref management.
 * Use when you need to manage the ref yourself.
 *
 * @param ref - External ref to the element to observe
 * @param callback - Called with the element's DOMRect when size changes
 * @param options - Configuration options
 */
export function useResizeObserverWithRef<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  callback: ResizeCallback,
  options: UseResizeObserverOptions = {}
): void {
  const { enabled = true, immediate = true } = options

  const callbackRef = useRef(callback)

  useLayoutEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useLayoutEffect(() => {
    const element = ref.current
    if (!element || !enabled) return

    const observer = createResizeObserver(element, callbackRef, immediate)
    return () => observer.disconnect()
  }, [enabled, immediate, ref])
}
