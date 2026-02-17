import { UserCheck } from 'lucide-react'

interface SelectionCardProps {
  selectedUsername: string | null
  onGrantClick: () => void
}

export function SelectionCard({
  selectedUsername,
  onGrantClick,
}: SelectionCardProps) {
  return (
    <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-purple-500/20 rounded-full text-purple-400">
          <UserCheck size={16} />
        </div>
        <div>
          <div className="text-[10px] text-purple-300 uppercase font-bold">
            Selected User
          </div>
          <div className="text-xs font-mono text-text truncate max-w-[180px]">
            {selectedUsername || 'Unknown user'}
          </div>
        </div>
      </div>
      <button
        onClick={onGrantClick}
        className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold uppercase tracking-wider rounded transition-colors"
      >
        Grant Admin Access
      </button>
    </div>
  )
}
