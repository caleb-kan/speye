import { useState } from 'react'
import { BellRing, ShieldAlert } from 'lucide-react'
import { NotificationCreator } from './NotificationCreator'
import { AdminPromotion } from './AdminPromotion'

export function AdminActionPanel() {
  const [activeTab, setActiveTab] = useState<'notify' | 'promote'>('notify')

  return (
    <div className="bg-bg-secondary/30 border border-white/5 rounded-2xl p-4 h-full flex flex-col overflow-hidden relative">
      {/* Tab Switcher */}
      <div className="flex p-1 bg-black/20 rounded-xl border border-white/5 mb-4 shrink-0">
        <button
          onClick={() => setActiveTab('notify')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
            activeTab === 'notify'
              ? 'bg-primary/20 text-primary border border-primary/20 shadow-sm'
              : 'text-text-secondary hover:text-text hover:bg-white/5 border border-transparent'
          }`}
        >
          <BellRing size={14} />
          Notify
        </button>
        <button
          onClick={() => setActiveTab('promote')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
            activeTab === 'promote'
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20 shadow-sm'
              : 'text-text-secondary hover:text-text hover:bg-white/5 border border-transparent'
          }`}
        >
          <ShieldAlert size={14} />
          Admins
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        <div className={activeTab === 'notify' ? 'block' : 'hidden'}>
          <NotificationCreator />
        </div>
        <div className={activeTab === 'promote' ? 'block' : 'hidden'}>
          <AdminPromotion />
        </div>
      </div>
    </div>
  )
}
