import { useState, useCallback } from 'react'
import type { SectionData } from '../types/database'

/**
 * Hook to manage drag-and-drop functionality for section reordering
 */
export function useSectionDragDrop(
  sections: SectionData[],
  setSections: (sections: SectionData[]) => void
) {
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(
    null
  )
  const [dragOverSectionIndex, setDragOverSectionIndex] = useState<
    number | null
  >(null)

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedSectionIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverSectionIndex(index)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverSectionIndex(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault()
      setDragOverSectionIndex(null)

      if (draggedSectionIndex === null || draggedSectionIndex === dropIndex) {
        return
      }

      const newSections = [...sections]
      const draggedSection = newSections[draggedSectionIndex]

      newSections.splice(draggedSectionIndex, 1)

      const adjustedDropIndex =
        draggedSectionIndex < dropIndex ? dropIndex - 1 : dropIndex
      newSections.splice(adjustedDropIndex, 0, draggedSection)

      setSections(newSections)
      setDraggedSectionIndex(null)
    },
    [sections, draggedSectionIndex, setSections]
  )

  const handleDragEnd = useCallback(() => {
    setDraggedSectionIndex(null)
    setDragOverSectionIndex(null)
  }, [])

  return {
    draggedSectionIndex,
    dragOverSectionIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  }
}
