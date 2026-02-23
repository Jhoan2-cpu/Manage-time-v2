import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initUiSfx } from './lib/audio/uiSfx'
import './index.css'

initUiSfx()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
