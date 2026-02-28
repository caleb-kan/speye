import { useContext } from 'react'
import {
  NetworkStatusContext,
  type NetworkStatusContextType,
} from '../context/networkStatusContext'

export function useNetworkStatus(): NetworkStatusContextType {
  const context = useContext(NetworkStatusContext)
  if (!context) {
    throw new Error(
      'useNetworkStatus must be used within a NetworkStatusProvider'
    )
  }
  return context
}
