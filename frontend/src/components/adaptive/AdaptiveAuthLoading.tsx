import { Loader2 } from 'lucide-react'

export function AdaptiveAuthLoading() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  )
}
