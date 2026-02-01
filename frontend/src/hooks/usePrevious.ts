import { useRef, useEffect } from 'react'

/**
 * Hook to track the previous value of a variable.
 *
 * Returns undefined on first render, then the previous value on subsequent renders.
 *
 * @param value - The value to track
 * @returns The previous value (undefined on first render)
 *
 * @example
 * ```tsx
 * function MyComponent({ text }) {
 *   const prevText = usePrevious(text)
 *
 *   useEffect(() => {
 *     if (prevText !== undefined && prevText !== text) {
 *       console.log('Text changed from', prevText, 'to', text)
 *     }
 *   }, [text, prevText])
 *
 *   return <div>{text}</div>
 * }
 * ```
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)

  useEffect(() => {
    ref.current = value
  }, [value])

  // eslint-disable-next-line react-hooks/refs -- usePrevious pattern intentionally reads ref during render
  return ref.current
}
