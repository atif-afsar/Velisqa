import media from '../../data/media.json'

const DESKTOP_QUERY = '(min-width: 1024px)'

function srcSetFor(slot, ext) {
  const entry = media[slot]
  return entry ? entry.widths.map((w) => `/media/${slot}-${w}.${ext} ${w}w`).join(', ') : undefined
}

/**
 * Responsive editorial image from the build-time media pipeline (scripts/build-media.mjs).
 * Emits AVIF + WebP srcsets with intrinsic width/height so the browser reserves space (no CLS).
 * `desktopSlot` art-directs a different crop/composition from `desktopMedia` up (one <img>, one LCP).
 */
export default function Picture({
  slot,
  desktopSlot,
  alt,
  sizes = '100vw',
  desktopSizes = '100vw',
  desktopMedia = DESKTOP_QUERY,
  priority = false,
  className = '',
  imgClassName = '',
  objectPosition,
}) {
  const entry = media[slot]
  if (!entry) {
    if (import.meta.env.DEV) console.warn(`[Picture] unknown media slot "${slot}" — add media/${slot}.jpg`)
    return <div className={`bg-mist ${className}`} aria-hidden="true" />
  }
  const hasDesktop = Boolean(desktopSlot && media[desktopSlot])
  const fallbackWidth = entry.widths.find((w) => w >= 1080) ?? entry.widths[entry.widths.length - 1]

  return (
    <picture className={className}>
      {hasDesktop && (
        <>
          <source media={desktopMedia} type="image/avif" srcSet={srcSetFor(desktopSlot, 'avif')} sizes={desktopSizes} />
          <source media={desktopMedia} type="image/webp" srcSet={srcSetFor(desktopSlot, 'webp')} sizes={desktopSizes} />
        </>
      )}
      <source type="image/avif" srcSet={srcSetFor(slot, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcSetFor(slot, 'webp')} sizes={sizes} />
      <img
        src={`/media/${slot}-${fallbackWidth}.webp`}
        alt={alt}
        width={entry.width}
        height={entry.height}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding={priority ? 'sync' : 'async'}
        className={`block h-full w-full object-cover ${imgClassName}`}
        style={{
          objectPosition,
          backgroundImage: priority ? undefined : `url(${entry.placeholder})`,
          backgroundSize: 'cover',
        }}
      />
    </picture>
  )
}
