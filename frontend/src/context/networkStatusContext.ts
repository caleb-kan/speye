import { createContext } from 'react'

export interface NetworkStatusContextType {
  isOnline: boolean
  forceOffline: boolean
  setForceOffline: (value: boolean) => void
  pendingOperations: number
  isSyncing: boolean
  isPrefetching: boolean
  syncNow: () => Promise<void>
}

export const NetworkStatusContext =
  createContext<NetworkStatusContextType | null>(null)
