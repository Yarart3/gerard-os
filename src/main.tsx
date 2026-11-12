import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { applyTheme, readStoredTheme } from './features/settings/theme'
import { initConnectivity } from './lib/offline/connectivity'
import './styles/global.css'

applyTheme(readStoredTheme())
initConnectivity()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
