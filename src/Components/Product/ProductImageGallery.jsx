import { useCallback, useRef, useState } from 'react'
import ProductImage from '../Common/ProductImage'
import { buildImageUrl } from '../../lib/imageCdn'

const SWIPE_THRESHOLD_PX = 48

export default function ProductImageGallery({ images, alt }) {
  const [index, setIndex] = useState(0)
  const touchStartX = useRef(null)

  const count = images.length
  const safeIndex = count ? Math.min(index, count - 1) : 0

  const goTo = useCallback(
    (nextIndex) => {
      if (count <= 1) return
      setIndex(((nextIndex % count) + count) % count)
    },
    [count],
  )

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }

  function handleTouchEnd(e) {
    if (touchStartX.current == null || count <= 1) return
    const endX = e.changedTouches[0]?.clientX
    if (endX == null) return
    const delta = endX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return
    if (delta < 0) goTo(safeIndex + 1)
    else goTo(safeIndex - 1)
  }

  if (!count) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center text-sm text-[#847377]">
        No image
      </div>
    )
  }

  const currentSrc = images[safeIndex]

  return (
    <div className="flex flex-col gap-2 sm:gap-3">
      <div
        className="relative overflow-hidden bg-[#f7f4ef]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <ProductImage
          key={currentSrc}
          src={currentSrc}
          alt={count > 1 ? `${alt} — image ${safeIndex + 1} of ${count}` : alt}
          width={900}
          responsiveWidths={[480, 720, 960]}
          sizes="(min-width: 1024px) 45vw, 100vw"
          quality={78}
          aspect="4 / 5"
          priority
          className="w-full select-none"
          draggable={false}
        />

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(safeIndex - 1)}
              className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-[#130006]/35 text-[#fdf9f4] backdrop-blur-sm transition hover:bg-[#130006]/55 sm:left-3"
              aria-label="Previous image"
            >
              <span className="text-lg leading-none" aria-hidden>
                ‹
              </span>
            </button>
            <button
              type="button"
              onClick={() => goTo(safeIndex + 1)}
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-[#130006]/35 text-[#fdf9f4] backdrop-blur-sm transition hover:bg-[#130006]/55 sm:right-3"
              aria-label="Next image"
            >
              <span className="text-lg leading-none" aria-hidden>
                ›
              </span>
            </button>
            <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[#130006]/45 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#fdf9f4] backdrop-blur-sm">
              {safeIndex + 1} / {count}
            </p>
          </>
        )}
      </div>

      {count > 1 && (
        <div
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin"
          role="tablist"
          aria-label="Product images"
        >
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              role="tab"
              aria-selected={i === safeIndex}
              aria-label={`Show image ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-16 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition sm:h-[4.5rem] sm:w-[3.25rem] ${
                i === safeIndex
                  ? 'border-[#3d0a21] ring-1 ring-[#d4af37]/40'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={buildImageUrl(src, { width: 140 })}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
