import SmoothScroll from './Components/SmoothScroll'
import { scrollToTop } from './lib/smoothScrollState'
import Navbar from './Components/Navbar'
import VelisqaLoader from './Components/Common/VelisqaLoader'
// import FloatingWhatsApp from './Components/WhatsApp/FloatingWhatsApp'
import { AnimatePresence } from 'framer-motion'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect, useState } from 'react'

const Home = lazy(() => import('./Pages/Home'))
const About = lazy(() => import('./Pages/About'))
const Collections = lazy(() => import('./Pages/Collections'))
const Contact = lazy(() => import('./Pages/Contact'))
const Models = lazy(() => import('./Pages/Models'))
const SEOLanding = lazy(() => import('./Pages/SEOLanding'))
const Privacy = lazy(() => import('./Pages/Privacy'))
const Terms = lazy(() => import('./Pages/Terms'))
const Authenticity = lazy(() => import('./Pages/Authenticity'))
const Shipping = lazy(() => import('./Pages/Shipping'))
const FAQ = lazy(() => import('./Pages/FAQ'))
const Order = lazy(() => import('./Pages/Order'))
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    scrollToTop({ immediate: true })
  }, [pathname])

  return null
}

function App() {
  const [showLoader, setShowLoader] = useState(true)

  useEffect(() => {
    if (showLoader) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
    document.body.style.overflow = ''
    return undefined
  }, [showLoader])

  return (
    <>
      <AnimatePresence mode="wait">
        {showLoader && (
          <VelisqaLoader fullScreen onComplete={() => setShowLoader(false)} />
        )}
      </AnimatePresence>
      <SmoothScroll />
      <ScrollToTop />
      <Navbar />
      <Suspense fallback={<div className="min-h-[60vh] bg-[#fdf9f4]" aria-label="Loading page" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/models" element={<Models />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/authenticity" element={<Authenticity />} />
          <Route path="/shipping-returns" element={<Shipping />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/order" element={<Order />} />
          <Route path="/:slug" element={<SEOLanding />} />
        </Routes>
      </Suspense>
      {/* <FloatingWhatsApp /> */}
    </>
  )
}

export default App
