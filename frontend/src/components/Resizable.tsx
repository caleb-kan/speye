import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  MIN_WIDTH_PERCENT,
  MAX_WIDTH_PERCENT,
  DEFAULT_WIDTH_PERCENT,
  KEYBOARD_STEP_PERCENT,
} from '../constants/resize'

type ResizableProps = {
  children: ReactNode
  minWidthPercent?: number
  maxWidthPercent?: number
  defaultWidthPercent?: number
}

export function Resizable({
  children,
  minWidthPercent = MIN_WIDTH_PERCENT,
  maxWidthPercent = MAX_WIDTH_PERCENT,
  defaultWidthPercent = DEFAULT_WIDTH_PERCENT,
}: ResizableProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [widthPercent, setWidthPercent] = useState(defaultWidthPercent)

  // Store current props in ref for use in event handlers
  const propsRef = useRef({ minWidthPercent, maxWidthPercent })
  useEffect(() => {
    propsRef.current = { minWidthPercent, maxWidthPercent }
  }, [minWidthPercent, maxWidthPercent])

  // Setup pointer event handlers
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let isDragging = false

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return
      e.preventDefault()

      const parent = container.parentElement
      if (!parent) return

      const { minWidthPercent: min, maxWidthPercent: max } = propsRef.current
      const parentWidth = parent.offsetWidth
      const containerLeft = container.getBoundingClientRect().left
      const newWidth = e.clientX - containerLeft
      const newPercent = Math.min(Math.max(min, newWidth / parentWidth), max)

      setWidthPercent(newPercent)
    }

    const handlePointerUp = () => {
      isDragging = false
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    const handlePointerDown = (e: PointerEvent) => {
      e.preventDefault()
      isDragging = true
      document.addEventListener('pointermove', handlePointerMove)
      document.addEventListener('pointerup', handlePointerUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    // Find the separator element (the handle)
    const separator = container.querySelector('[role="separator"]')
    if (separator) {
      separator.addEventListener(
        'pointerdown',
        handlePointerDown as EventListener
      )
    }

    return () => {
      if (separator) {
        separator.removeEventListener(
          'pointerdown',
          handlePointerDown as EventListener
        )
      }
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [])

  // Handle keyboard navigation for accessibility
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      let newPercent: number | null = null

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        newPercent = Math.max(
          minWidthPercent,
          widthPercent - KEYBOARD_STEP_PERCENT
        )
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        newPercent = Math.min(
          maxWidthPercent,
          widthPercent + KEYBOARD_STEP_PERCENT
        )
      }

      if (newPercent !== null) {
        setWidthPercent(newPercent)
      }
    },
    [widthPercent, minWidthPercent, maxWidthPercent]
  )

  const displayPercent = Math.round(widthPercent * 100)

  return (
    <div
      ref={containerRef}
      className="flex"
      style={{ width: `${displayPercent}%` }}
    >
      <div className="flex-1 min-w-0">{children}</div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize text width"
        aria-valuemin={Math.round(minWidthPercent * 100)}
        aria-valuemax={Math.round(maxWidthPercent * 100)}
        aria-valuenow={displayPercent}
        aria-valuetext={`${displayPercent}% width`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="ml-8 w-1 shrink-0 rounded bg-primary opacity-20 cursor-col-resize hover:opacity-40 active:opacity-40 focus:opacity-40 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg transition-opacity touch-none"
      />
    </div>
  )
}
