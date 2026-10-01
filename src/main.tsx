import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// GitHub Pages serves plain static files with no server-side rewrite, so a
// refresh or deep link on e.g. /joy-budget/stats would 404 under a normal
// BrowserRouter — HashRouter keeps the route entirely after the "#", which
// the server never sees, so it always just serves index.html.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
