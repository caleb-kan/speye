import { useCallback } from 'react'

export const useNewTextWithReset = (
  resetPosition: () => void,
  onNewText: () => void
) => {
  return useCallback(() => {
    resetPosition()
    onNewText()
  }, [resetPosition, onNewText])
}
