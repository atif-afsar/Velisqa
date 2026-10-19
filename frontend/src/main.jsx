import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { CatalogProvider } from './context/CatalogContext.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { WishlistProvider } from './context/WishlistContext.jsx'
import { deferAnalytics } from './lib/deferAnalytics.js'
import { preloadRouteFor } from './pages.js'
import { API_BASE_URL } from './lib/apiClient.js'

/** Warm up the API connection so the catalogue and session load sooner. */
function preconnectApi() {
  if (typeof document === 'undefined') return
  try {
    const { origin } = new URL(API_BASE_URL, window.location.origin)
    if (origin === window.location.origin) return
    for (const rel of ['preconnect', 'dns-prefetch']) {
      const link = document.createElement('link')
      link.rel = rel
      link.href = origin
      // API requests are credentialed (session cookie), so the warmed connection must be too.
      if (rel === 'preconnect') link.crossOrigin = 'use-credentials'
      document.head.appendChild(link)
    }
  } catch {
    /* ignore malformed URL */
  }
}

preconnectApi()
deferAnalytics()

// Prerendered pages already show their content; load the route's chunk first so React's
// first render replaces it with identical markup instead of a loading fallback.
await preloadRouteFor(window.location.pathname).catch(() => {})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CatalogProvider>
          <WishlistProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </WishlistProvider>
        </CatalogProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
