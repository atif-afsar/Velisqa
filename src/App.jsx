import SmoothScroll from './Components/SmoothScroll'
import Navbar from './Components/Navbar'
// import FloatingWhatsApp from './Components/WhatsApp/FloatingWhatsApp'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'

const Home = lazy(() => import('./Pages/Home'))
const About = lazy(() => import('./Pages/About'))
const Collections = lazy(() => import('./Pages/Collections'))
const Contact = lazy(() => import('./Pages/Contact'))
const Models = lazy(() => import('./Pages/Models'))
const SEOLanding = lazy(() => import('./Pages/SEOLanding'))
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  return null
}

function App() {
  return (
    <>
      <SmoothScroll />
      <ScrollToTop />
      <Navbar />
      <div className="pt-[68px] md:pt-[84px]">
        <Suspense fallback={<div className="min-h-[60vh] bg-[#fdf9f4]" aria-label="Loading page" />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/models" element={<Models />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/:slug" element={<SEOLanding />} />
          </Routes>
        </Suspense>
      </div>
      {/* <FloatingWhatsApp /> */}
    </>
  )
}

export default App
