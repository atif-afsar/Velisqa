import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'lenis/dist/lenis.css'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { CatalogProvider } from './context/CatalogContext.jsx'
import { CartProvider } from './context/CartContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CatalogProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </CatalogProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
