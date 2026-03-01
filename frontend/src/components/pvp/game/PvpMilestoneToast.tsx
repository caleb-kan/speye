import { useEffect, useRef, useState } from 'react'
import { PVP_MILESTONE_TOAST_DISPLAY_MS } from '../../../constants/pvp'
import type { MilestoneType } from '../../../constants/pvp'

type Milestone = {
  id: string
  type: MilestoneType
}

const MILESTONE_LABELS: Record<MilestoneType, string> = {
  halfway: 'Opponent passed halfway!',
  started_quiz: 'Opponent started the quiz!',
  finished: 'Opponent finished!',
}

type PvpMilestoneToastProps = {
  milestones: Milestone[]
}

export function PvpMilestoneToast({ milestones }: PvpMilestoneToastProps) {
  const [visible, setVisible] = useState<Milestone[]>([])
  const prevLengthRef = useRef(milestones.length)
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    if (milestones.length === 0 || milestones.length <= prevLengthRef.current) {
      prevLengthRef.current = milestones.length
      return
    }

    const newMilestones = milestones.slice(prevLengthRef.current)
    prevLengthRef.current = milestones.length

    setVisible((prev) => [...prev, ...newMilestones])

    for (const milestone of newMilestones) {
      const timer = setTimeout(() => {
        setVisible((prev) => prev.filter((m) => m.id !== milestone.id))
        timersRef.current.delete(milestone.id)
      }, PVP_MILESTONE_TOAST_DISPLAY_MS)
      timersRef.current.set(milestone.id, timer)
    }
  }, [milestones])

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((t) => clearTimeout(t))
      timers.clear()
    }
  }, [])

  if (visible.length === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 right-4 z-50 space-y-2"
    >
      {visible.map((milestone) => (
        <div
          key={milestone.id}
          className="
            animate-in slide-in-from-right fade-in duration-300
            bg-bg-secondary/90 backdrop-blur-sm
            border border-text-secondary/10
            rounded-xl px-4 py-2.5
            text-sm text-text
            shadow-lg
          "
        >
          {MILESTONE_LABELS[milestone.type]}
        </div>
      ))}
    </div>
  )
}
