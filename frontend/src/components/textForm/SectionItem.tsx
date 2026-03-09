import { Trash2, GripVertical } from 'lucide-react'
import type { SectionData } from '../../types/database'
import {
  MAX_TITLE_CHARACTERS,
  MAX_CONTENT_CHARACTERS,
} from '../../constants/textUpload'
import { ContentStats } from './ContentStats'

interface SectionItemProps {
  section: SectionData
  index: number
  isDragged: boolean
  isDraggedOver: boolean
  isOnlySection: boolean
  isSubmitting: boolean
  onUpdateSection: (
    index: number,
    field: keyof SectionData,
    value: string
  ) => void
  onRemoveSection: (index: number) => void
  onDragStart: (e: React.DragEvent, index: number) => void
  onDragOver: (e: React.DragEvent, index: number) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, index: number) => void
  onDragEnd: () => void
  isAnyDragActive: boolean
}

/**
 * Individual section editor with drag-and-drop support
 */
export function SectionItem({
  section,
  index,
  isDragged,
  isDraggedOver,
  isOnlySection,
  isSubmitting,
  onUpdateSection,
  onRemoveSection,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  isAnyDragActive,
}: SectionItemProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      aria-label={`Section ${index + 1}: ${section.title || 'Untitled section'}`}
      className={`border rounded-lg p-3 transition-all duration-200 ease-in-out cursor-move ${
        isDragged
          ? 'opacity-50 scale-95 shadow-lg'
          : 'shadow-sm hover:shadow-md'
      } ${
        isDraggedOver && !isDragged
          ? 'border-primary bg-primary/10 scale-105'
          : !isAnyDragActive
            ? 'border-text-secondary/20 hover:border-text-secondary/40'
            : 'border-text-secondary/20'
      }`}
    >
      <div className="mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-text-secondary bg-text-secondary/10 px-2 py-1 rounded">
              {index + 1}
            </span>
            <div
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-text-secondary/10 rounded transition-colors"
              draggable={false}
              aria-label={`Drag section ${index + 1} to reorder`}
              title="Drag to reorder"
            >
              <GripVertical className="w-4 h-4 text-text-secondary" />
            </div>
          </div>
          <input
            type="text"
            value={section.title}
            onChange={(e) => onUpdateSection(index, 'title', e.target.value)}
            placeholder={`Section ${index + 1} Title`}
            className="flex-1 text-sm p-2 bg-bg border border-text-secondary/20 rounded-lg text-text placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            maxLength={MAX_TITLE_CHARACTERS}
            disabled={isSubmitting}
          />
          {!isOnlySection && (
            <button
              type="button"
              onClick={() => onRemoveSection(index)}
              disabled={isSubmitting}
              className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <textarea
        value={section.content}
        onChange={(e) => onUpdateSection(index, 'content', e.target.value)}
        placeholder={`Section ${index + 1} Content...`}
        className="w-full text-sm h-32 p-2 bg-bg border border-text-secondary/20 rounded-lg text-text placeholder-text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        maxLength={MAX_CONTENT_CHARACTERS}
        disabled={isSubmitting}
        required={true}
      />
      <ContentStats content={section.content} className="mt-1" />
    </div>
  )
}
