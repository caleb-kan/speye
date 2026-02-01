import { Eye, EyeOff, AlertTriangle } from 'lucide-react'

type GazeStatusVariant = 'detailed' | 'minimal'

type GazeStatusIndicatorProps = {
  /** Whether eye tracking is reliable */
  isReliable: boolean
  /** Whether WebGazer is initialized and ready */
  webgazerReady?: boolean
  /** Confidence level (0-1) for detailed display */
  confidence?: number
  /** Whether gaze is in the end zone (for reading feedback) */
  isInEndZone?: boolean
  /** Whether a return sweep has been detected (about to advance) */
  isSweepDetected?: boolean
  /** Display variant */
  variant?: GazeStatusVariant
}

/**
 * Unified gaze status indicator component.
 * Replaces duplicated status displays across AdaptiveControls and SingleLineTextDisplay.
 */
export function GazeStatusIndicator({
  isReliable,
  webgazerReady = true,
  confidence = 0,
  isInEndZone = false,
  isSweepDetected = false,
  variant = 'detailed',
}: GazeStatusIndicatorProps) {
  // Minimal variant - colored dot with text
  if (variant === 'minimal') {
    if (isSweepDetected) {
      return <span className="text-success font-medium">● Advancing...</span>
    }
    if (isInEndZone) {
      return <span className="text-success">● End zone</span>
    }
    if (isReliable) {
      return <span className="text-primary">● Tracking</span>
    }
    return <span className="text-text-secondary/50">○ Not tracking</span>
  }

  // Detailed variant - icon + text with tooltip
  const Icon = isReliable ? Eye : webgazerReady ? EyeOff : AlertTriangle
  const iconClass = isReliable
    ? 'text-success'
    : webgazerReady
      ? 'text-warning'
      : 'text-error'
  const statusText = isReliable
    ? `${Math.round(confidence * 100)}%`
    : 'Low confidence'

  const tooltipText = isReliable
    ? 'Tracking quality is good. Keep your head still and face the camera.'
    : 'Tracking quality is low. Check lighting and face the camera directly.'

  return (
    <div className="flex items-center gap-2 text-sm" title={tooltipText}>
      <Icon className={`w-4 h-4 ${iconClass}`} />
      <span className="text-text-secondary">{statusText}</span>
    </div>
  )
}
