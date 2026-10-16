import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { buildImageSrcSet, buildImageUrl } from '../../lib/imageCdn'
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, ZoomIcon } from '../UI/Icons'

const WIDTHS = [480, 720, 960, 1280, 1600]

function GalleryImage({ src, alt, priority, sizes, className = '' }) {
  const srcSet = buildImageSrcSet(src, WIDTHS) || undefined
  return (
    <img
      src={buildImageUrl(src, { width: 1080 })}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width="1080"
      height="1350"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding={priority ? 'sync' : 'async'}
      className={`h-full w-full object-cover ${className}`}
    />
  )
}

/** Full-screen viewer: arrows / swipe to browse, click or tap to zoom 2.2x and pan. */
function Lightbox({ images, alt, start, onClose }) {
  const [index, setIndex] = useState(start)
  const [zoomed, setZoomed] = useState(false)
  const [origin, setOrigin] = useState('50% 50%')
  const touchX = useRef(null)
  const closeRef = useRef(null)
  const count = images.length

  const go = useCallback(
    (delta) => {
      setZoomed(false)
      setIndex((i) => (i + delta + count) % count)
    },
    [count],
  )

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [go, onClose])

  function track(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    setOrigin(`${((e.clientX - rect.left) / rect.width) * 100}% ${((e.clientY - rect.top) / rect.height) * 100}%`)
  }

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${alt} — image ${index + 1} of ${count}`} className="fixed inset-0 z-[220] flex flex-col bg-paper fade-in">
      <div className="flex h-16 shrink-0 items-center justify-between px-4 sm:px-6">
        <p className="text-xs text-muted" aria-live="polite">
          {index + 1} / {count}
        </p>
        <button ref={closeRef} type="button" onClick={onClose} className="grid h-11 w-11 place-items-center text-ink" aria-label="Close image viewer">
          <CloseIcon size={22} />
        </button>
      </div>
      <div
        className={`relative min-h-0 flex-1 overflow-hidden ${zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
        onClick={(e) => {
          track(e)
          setZoomed((z) => !z)
        }}
        onMouseMove={zoomed ? track : undefined}
        onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          if (zoomed || touchX.current == null) return
          const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current
          touchX.current = null
          if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1)
        }}
      >
        <img
          key={images[index]}
          src={buildImageUrl(images[index], { width: 2000 })}
          alt={`${alt} — image ${index + 1}`}
          className="h-full w-full object-contain transition-transform duration-300"
          style={{ transform: zoomed ? 'scale(2.2)' : 'scale(1)', transformOrigin: origin }}
          draggable="false"
        />
      </div>
      {count > 1 && (
        <div className="flex h-20 shrink-0 items-center justify-center gap-6">
          <button type="button" onClick={() => go(-1)} className="grid h-11 w-11 place-items-center border border-line text-ink hover:border-ink" aria-label="Previous image">
            <ChevronLeftIcon size={18} />
          </button>
          <button type="button" onClick={() => go(1)} className="grid h-11 w-11 place-items-center border border-line text-ink hover:border-ink" aria-label="Next image">
            <ChevronRightIcon size={18} />
          </button>
        </div>
      )}
    </div>,
    document.body,
  )
}

/**
 * Product gallery.
 * - Mobile: native swipe carousel (scroll-snap) with position dots.
 * - Desktop: editorial two-column image grid.
 * - Any image opens a full-screen zoom viewer.
 */
// Only the visible layout's first image is high priority; the hidden one stays lazy (not downloaded).
const isDesktopViewport = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches

export default function ProductGallery({ images, alt, badges }) {
  const [desktop] = useState(isDesktopViewport)
  const [active, setActive] = useState(0)
  const [viewer, setViewer] = useState(null)
  const trackRef = useRef(null)
  const count = images.length

  function onScroll() {
    const el = trackRef.current
    if (!el) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i !== active) setActive(i)
  }

  if (!count) {
    return <div className="flex aspect-[4/5] items-center justify-center bg-mist text-sm text-muted">Image coming soon</div>
  }

  return (
    <div className="relative">
      {badges && <div className="pointer-events-none absolute left-3 top-3 z-10 flex gap-2">{badges}</div>}

      {/* Mobile carousel */}
      <div className="lg:hidden">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="scrollbar-none -mx-4 flex snap-x snap-mandatory overflow-x-auto sm:mx-0"
          aria-roledescription="carousel"
          aria-label={`${alt} images`}
        >
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setViewer(i)}
              className="relative aspect-[4/5] w-full shrink-0 snap-center bg-mist"
              aria-label={`Open image ${i + 1} of ${count} full screen`}
            >
              <GalleryImage src={src} alt={i === 0 ? alt : ''} priority={i === 0 && !desktop} sizes="100vw" />
            </button>
          ))}
        </div>
        {count > 1 && (
          <div className="mt-4 flex justify-center gap-2" aria-hidden="true">
            {images.map((src, i) => (
              <span key={src} className={`h-[3px] w-6 transition-colors ${i === active ? 'bg-ink' : 'bg-line'}`} />
            ))}
          </div>
        )}
      </div>

      {/* Desktop grid */}
      <div className={`hidden gap-3 lg:grid ${count > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setViewer(i)}
            className="group relative aspect-[4/5] cursor-zoom-in overflow-hidden bg-mist"
            aria-label={`Zoom image ${i + 1} of ${count}`}
          >
            <GalleryImage
              src={src}
              alt={i === 0 ? alt : ''}
              priority={i === 0 && desktop}
              sizes={count > 1 ? '(min-width: 1024px) 28vw, 100vw' : '(min-width: 1024px) 55vw, 100vw'}
              className="img-zoom"
            />
            <span className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center bg-paper/90 text-ink opacity-0 transition-opacity group-hover:opacity-100">
              <ZoomIcon size={18} />
            </span>
          </button>
        ))}
      </div>

      {viewer != null && <Lightbox images={images} alt={alt} start={viewer} onClose={() => setViewer(null)} />}
    </div>
  )
}
