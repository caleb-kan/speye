import { Plus } from 'lucide-react'
import type { SectionData } from '../../types/database'
import { SectionItem } from './SectionItem'
import { useSectionDragDrop } from '../../hooks/useSectionDragDrop'
import {
  MAX_SECTIONS,
  MAX_CONTENT_CHARACTERS,
  SECTION_WARNING_THRESHOLD,
} from '../../constants/textUpload'
import { formatNumberWithCommas } from '../../utils/textUtils'
import { getTotalSectionCharacterCount } from '../../utils/textFormValidation'

interface SectionEditorProps {
  sections: SectionData[]
  setSections: (sections: SectionData[]) => void
  isSubmitting: boolean
  onUpdateSection: (
    index: number,
    field: keyof SectionData,
    value: string
  ) => void
  onAddSection: () => void
  onRemoveSection: (index: number) => void
}

/**
 * Editor for sectional text content with drag-and-drop reordering
 */
export function SectionEditor({
  sections,
  setSections,
  isSubmitting,
  onUpdateSection,
  onAddSection,
  onRemoveSection,
}: SectionEditorProps) {
  const {
    draggedSectionIndex,
    dragOverSectionIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  } = useSectionDragDrop(sections, setSections)

  const totalCharacterCount = getTotalSectionCharacterCount(sections)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <label className="text-sm font-medium text-text ml-1">Sections</label>
          <p className="text-xs text-text-secondary ml-1">
            Drag sections to reorder them
          </p>
        </div>
        <button
          type="button"
          onClick={onAddSection}
          disabled={isSubmitting || sections.length >= MAX_SECTIONS}
          className="flex items-center space-x-1 px-3 py-1 text-sm bg-primary text-bg rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          <span>Add Section</span>
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {sections.map((section, index) => (
          <SectionItem
            key={index}
            section={section}
            index={index}
            isDragged={draggedSectionIndex === index}
            isDraggedOver={dragOverSectionIndex === index}
            isOnlySection={sections.length === 1}
            isSubmitting={isSubmitting}
            onUpdateSection={onUpdateSection}
            onRemoveSection={onRemoveSection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            isAnyDragActive={draggedSectionIndex !== null}
          />
        ))}
      </div>

      <div className="mt-2 text-xs text-text-secondary ml-1 flex justify-between">
        <div
          className={
            sections.length / MAX_SECTIONS > SECTION_WARNING_THRESHOLD
              ? 'text-error'
              : 'text-text-secondary'
          }
        >
          {sections.length}/{MAX_SECTIONS} sections max
        </div>
        <div
          className={
            totalCharacterCount > MAX_CONTENT_CHARACTERS
              ? 'text-error'
              : 'text-text-secondary'
          }
        >
          Total: {totalCharacterCount}/
          {formatNumberWithCommas(MAX_CONTENT_CHARACTERS)} characters
        </div>
      </div>
    </div>
  )
}
