import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/limelight'
import './index.css'
import App from './App.tsx'

// Best-effort extra lock against WebKit storage eviction; the real
// protections are Home Screen install and JSON export (see docs/SPEC.md).
navigator.storage?.persist?.().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
