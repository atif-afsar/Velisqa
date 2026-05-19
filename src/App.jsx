import SmoothScroll from './Components/SmoothScroll'
import Navbar from './Components/Navbar'
import VelisqaLoader from './Components/Common/VelisqaLoader'
// import FloatingWhatsApp from './Components/WhatsApp/FloatingWhatsApp'
import { AnimatePresence } from 'framer-motion'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect, useState } from 'react'

const LOADER_DURATION_MS = 1800

const Home = lazy(() => import('./Pages/Home'))
const About = lazy(() => import('./Pages/About'))
const Collections = lazy(() => import('./Pages/Collections'))
const Contact = lazy(() => import('./Pages/Contact'))
const Models = lazy(() => import('./Pages/Models'))
const SEOLanding = lazy(() => import('./Pages/SEOLanding'))
const Privacy = lazy(() => import('./Pages/Privacy'))
const Terms = lazy(() => import('./Pages/Terms'))
const Authenticity = lazy(() => import('./Pages/Authenticity'))
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
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
          <VelisqaLoader
            fullScreen
            duration={LOADER_DURATION_MS}
            onComplete={() => setShowLoader(false)}
          />
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
          <Route path="/:slug" element={<SEOLanding />} />
        </Routes>
      </Suspense>
      {/* <FloatingWhatsApp /> */}
    </>
  )
}

export default App
