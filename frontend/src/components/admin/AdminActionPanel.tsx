import { useState } from 'react'
import { BellRing, ShieldAlert } from 'lucide-react'
import { NotificationCreator } from './NotificationCreator'
import { AdminPromotion } from './AdminPromotion'

export function AdminActionPanel() {
  const [activeTab, setActiveTab] = useState<'notify' | 'promote'>('notify')

  return (
    <div className="bg-bg-secondary/30 border border-text-secondary/10 rounded-2xl p-4 h-full flex flex-col overflow-hidden relative">
      <div className="flex p-1 bg-bg/30 rounded-xl border border-text-secondary/10 mb-4 shrink-0">
        <button
          onClick={() => setActiveTab('notify')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${activeTab === 'notify' ? 'bg-primary/20 text-primary border border-primary/20 shadow-sm' : 'text-text-secondary hover:text-text hover:bg-text-secondary/10 border border-transparent'}`}
        >
          <BellRing size={14} /> Notify
        </button>
        <button
          onClick={() => setActiveTab('promote')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${activeTab === 'promote' ? 'bg-primary/20 text-primary border border-primary/20 shadow-sm' : 'text-text-secondary hover:text-text hover:bg-text-secondary/10 border border-transparent'}`}
        >
          <ShieldAlert size={14} /> Admins
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        {activeTab === 'notify' && <NotificationCreator />}
        {activeTab === 'promote' && <AdminPromotion />}
      </div>
    </div>
  )
}
