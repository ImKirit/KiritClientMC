import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App'

// Disable browser context menu (right-click) for native app feel
document.addEventListener('contextmenu', (e) => e.preventDefault())

// Disable browser shortcuts that break native app feel
document.addEventListener('keydown', (e) => {
  // Allow DevTools in dev mode
  if (e.key === 'F12') return
  if (e.ctrlKey && e.shiftKey && e.key === 'I') return

  // Block: Ctrl+F (find), Ctrl+P (print), Ctrl+G (find next), Ctrl+U (view source)
  if (e.ctrlKey && ['f', 'p', 'g', 'u'].includes(e.key.toLowerCase())) {
    e.preventDefault()
  }
  // Block: F5 / Ctrl+R (reload), F7 (caret browsing)
  if (['F5', 'F7'].includes(e.key)) {
    e.preventDefault()
  }
  if (e.ctrlKey && e.key.toLowerCase() === 'r') {
    e.preventDefault()
  }
})

// Disable drag on images and links
document.addEventListener('dragstart', (e) => e.preventDefault())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
