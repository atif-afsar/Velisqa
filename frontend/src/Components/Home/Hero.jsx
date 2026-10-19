import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Picture from '../UI/Picture'
import { ChevronLeftIcon, ChevronRightIcon } from '../UI/Icons'
import { HERO_BANNER_MEDIA, HERO_INTERVAL_MS, HERO_SLIDES } from '../../data/heroSlides'
import { useHeroSlides } from '../../hooks/useHeroSlides'

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return reduced
}

/** True once the page has finished loading — later slides wait for it so they never compete with the LCP image. */
function usePageLoaded() {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    let idle = 0
    const go = () => {
      idle = (window.requestIdleCallback ?? window.setTimeout)(() => setLoaded(true), { timeout: 1500 })
    }
    if (document.readyState === 'complete') go()
    else window.addEventListener('load', go, { once: true })
    return () => {
      window.removeEventListener('load', go)
      ;(window.cancelIdleCallback ?? window.clearTimeout)(idle)
    }
  }, [])
  return loaded
}

/**
 * Homepage hero: a full-width, image-only banner slider (Palmonas-style).
 * Portrait 4:5 banners on phones, wide 3:1 banners from 768px; each banner links to a
 * collection. Finger-follow swipe on touch, arrows on desktop. Autoplay pauses on hover,
 * focus, touch and hidden tabs, and is off for reduced motion.
 */
export default function Hero() {
  const [index, setIndex] = useState(0)
  const [drag, setDrag] = useState(0)
  const [touching, setTouching] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(false)
  const reduced = usePrefersReducedMotion()
  const loaded = usePageLoaded()
  const touch = useRef(null)
  const swiped = useRef(false)
  // Banners set in /admin/hero replace the built-in ones; the built-ins are the fallback.
  const hero = useHeroSlides()
  // Until we know whether the admin set banners, show an empty frame — never the old built-ins first.
  const slides = !hero.ready ? [] : hero.slides.length ? hero.slides : HERO_SLIDES
  const intervalMs = hero.slides.length ? hero.intervalSeconds * 1000 : HERO_INTERVAL_MS
  const count = slides.length
  // The list can shrink when admin banners load; never point past the last slide.
  if (count && index >= count) setIndex(0)
  const playing = count > 1 && loaded && !reduced && !hovered && !focused && !hidden && !touching

  const go = useCallback((next) => setIndex((next + count) % count), [count])

  useEffect(() => {
    const onVis = () => setHidden(document.visibilityState !== 'visible')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  useEffect(() => {
    if (!playing) return undefined
    const t = window.setTimeout(() => go(index + 1), intervalMs)
    return () => window.clearTimeout(t)
  }, [playing, index, go, intervalMs])

  function onTouchStart(e) {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, axis: null }
    swiped.current = false
    setTouching(true)
  }
  function onTouchMove(e) {
    const t = touch.current
    if (!t || !loaded) return
    const dx = e.touches[0].clientX - t.x
    const dy = e.touches[0].clientY - t.y
    if (!t.axis && Math.abs(dx) + Math.abs(dy) > 8) t.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    if (t.axis === 'x') {
      swiped.current = true
      setDrag(dx)
    }
  }
  function onTouchEnd() {
    touch.current = null
    if (Math.abs(drag) > Math.min(60, window.innerWidth * 0.15)) go(index + (drag < 0 ? 1 : -1))
    setDrag(0)
    setTouching(false)
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-labelledby="hero-heading"
      className="relative bg-paper"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setFocused(false)}
    >
      <h1 id="hero-heading" className="sr-only">
        Velisqa — modern jewellery for women: necklaces, earrings, rings, bracelets and bangles
      </h1>

      <div className="group relative overflow-hidden" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}>
        <div
          className={`flex ${drag ? '' : 'transition-transform duration-700 ease-[var(--ease-lux)]'}`}
          style={{ transform: `translate3d(calc(${-index * 100}% + ${drag}px), 0, 0)` }}
        >
          {count === 0 && <div aria-hidden="true" className="aspect-[4/5] w-full shrink-0 bg-mist md:aspect-[3/1] md:max-h-[760px]" />}
          {slides.map((s, i) => {
            const active = i === index
            return (
              <div
                key={s.banner || `${s.desktopUrl}-${i}`}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}`}
                aria-hidden={!active}
                className="w-full shrink-0"
              >
                <Link
                  to={s.to}
                  aria-label={s.label}
                  tabIndex={active ? 0 : -1}
                  draggable={false}
                  onClick={(e) => swiped.current && e.preventDefault()}
                  className="relative block aspect-[4/5] w-full overflow-hidden bg-mist md:aspect-[3/1] md:max-h-[760px]"
                >
                  {(i === 0 || loaded) && s.desktopUrl && (
                    // Any upload fits: object-cover crops to this frame around the admin-chosen focus point.
                    <picture className="absolute inset-0">
                      {s.mobileUrl ? <source media={HERO_BANNER_MEDIA} srcSet={s.desktopUrl} /> : null}
                      <img
                        src={s.mobileUrl || s.desktopUrl}
                        alt={s.alt}
                        loading={i === 0 ? 'eager' : 'lazy'}
                        fetchPriority={i === 0 ? 'high' : undefined}
                        decoding="async"
                        draggable={false}
                        className="block h-full w-full select-none object-cover"
                        style={{ objectPosition: s.focus || '50% 50%' }}
                      />
                    </picture>
                  )}
                  {(i === 0 || loaded) && !s.desktopUrl && (
                    <Picture
                      slot={s.mobile}
                      desktopSlot={s.banner}
                      desktopMedia={HERO_BANNER_MEDIA}
                      alt={s.alt}
                      sizes="100vw"
                      priority={i === 0}
                      className="absolute inset-0"
                      imgClassName="select-none"
                      objectPosition={s.focus}
                    />
                  )}
                </Link>
              </div>
            )
          })}
        </div>

        {/* Desktop arrows */}
        {count > 1 && (<>
        <button
          type="button"
          onClick={() => go(index - 1)}
          aria-label="Previous banner"
          className="absolute left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-paper/90 text-ink opacity-0 shadow-sm transition-opacity hover:bg-paper focus-visible:opacity-100 group-hover:opacity-100 md:grid"
        >
          <ChevronLeftIcon size={20} />
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          aria-label="Next banner"
          className="absolute right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-paper/90 text-ink opacity-0 shadow-sm transition-opacity hover:bg-paper focus-visible:opacity-100 group-hover:opacity-100 md:grid"
        >
          <ChevronRightIcon size={20} />
        </button>
        </>)}
      </div>

      {/* Dots */}
      <div className="flex h-9 items-center justify-center gap-1.5 md:h-10">
        {count > 1 && slides.map((s, i) => (
          <button
            key={s.banner || `${s.desktopUrl}-${i}`}
            type="button"
            onClick={() => go(i)}
            aria-label={`Show banner ${i + 1}: ${s.label}`}
            aria-current={i === index ? 'true' : undefined}
            className="grid h-8 w-6 place-items-center"
          >
            <span className={`block h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-5 bg-ink' : 'w-1.5 bg-line-strong'}`} />
          </button>
        ))}
      </div>
    </section>
  )
}
