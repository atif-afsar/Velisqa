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

/** Warm up the Supabase storage connection so product images start loading sooner. */
function preconnectSupabase() {
  const url = import.meta.env.VITE_SUPABASE_URL
  if (!url || typeof document === 'undefined') return
  try {
    const { origin } = new URL(url)
    for (const rel of ['preconnect', 'dns-prefetch']) {
      const link = document.createElement('link')
      link.rel = rel
      link.href = origin
      if (rel === 'preconnect') link.crossOrigin = 'anonymous'
      document.head.appendChild(link)
    }
  } catch {
    /* ignore malformed URL */
  }
}

preconnectSupabase()
deferAnalytics()

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
