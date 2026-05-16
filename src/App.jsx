import SmoothScroll from './Components/SmoothScroll'
import Navbar from './Components/Navbar'
import Home from './Pages/Home'
import About from './Pages/About'
import Collections from './Pages/Collections'
import Contact from './Pages/Contact'
import Models from './Pages/Models'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

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
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/models" element={<Models />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </>
  )
}

export default App
