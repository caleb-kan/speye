import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

registerSW({
  immediate: true,
  onNeedRefresh() {
    // registerType: 'prompt' means the new service worker enters the waiting
    // state rather than activating immediately. By not calling updateSW() here,
    // we intentionally defer the update — the SW will take over once all tabs
    // using the old version are closed and the app is reopened.
    console.info(
      '[PWA] New version available — will activate on next full reload.'
    )
  },
  onRegisterError(error) {
    console.error('[PWA] Service worker registration failed:', error)
  },
})

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
