import { useRef, useLayoutEffect } from 'react'

/**
 * Synchronize a ref with a value, updating before effects run.
 * Useful for accessing the latest prop values in callbacks without
 * triggering re-renders or effect re-runs.
 *
 * @param value - The value to sync to the ref
 * @returns A ref that always contains the latest value
 */
export function useRefSync<T>(value: T): React.MutableRefObject<T> {
  const ref = useRef(value)

  useLayoutEffect(() => {
    ref.current = value
  }, [value])

  return ref
}
