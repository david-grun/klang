import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AboutPage } from './pages/AboutPage'
import './styles/landing.css'
import './styles/about.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AboutPage />
  </StrictMode>,
)
