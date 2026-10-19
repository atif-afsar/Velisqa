import { useState } from 'react'
import { buildImageUrl, buildImageSrcSet } from '../../lib/imageCdn'

/**
 * Product image with an optional second image revealed on hover (desktop).
 * - Priority (above-the-fold) images render visible immediately — no fade on the LCP.
 * - Falls back to the original URL if the CDN transform fails.
 * - The hover image only downloads after the first hover.
 */
export default function ProductImage({
  src,
  hoverSrc = null,
  alt,
  width,
  aspect = '4 / 5',
  priority = false,
  sizes,
  responsiveWidths,
  quality = 72,
  className = '',
  imgClassName = '',
  ...rest
}) {
  const [loaded, setLoaded] = useState(priority)
  const [failedTransform, setFailedTransform] = useState(false)
  const [hoverWanted, setHoverWanted] = useState(false)
  const [hoverReady, setHoverReady] = useState(false)
  const [hoverFailed, setHoverFailed] = useState(false)
  const [hovered, setHovered] = useState(false)

  if (!src) {
    return (
      <span className={`flex items-center justify-center bg-mist text-xs text-muted ${className}`} style={{ aspectRatio: aspect }}>
        No image
      </span>
    )
  }

  const hasHover = typeof hoverSrc === 'string' && hoverSrc.trim() !== '' && hoverSrc !== src && !hoverFailed
  const deliveredSrc = failedTransform ? src : buildImageUrl(src, { width, quality })
  const srcSet = failedTransform || !responsiveWidths ? undefined : buildImageSrcSet(src, responsiveWidths, { quality }) || undefined
  const hoverSet = hasHover && responsiveWidths ? buildImageSrcSet(hoverSrc, responsiveWidths, { quality }) || undefined : undefined
  const showHover = hasHover && hovered && hoverReady

  return (
    <span
      className={`relative block overflow-hidden bg-mist select-none ${className}`}
      style={{ aspectRatio: aspect }}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse' || !hasHover) return
        setHoverWanted(true)
        setHovered(true)
      }}
      onPointerLeave={() => setHovered(false)}
    >
      <img
        src={deliveredSrc}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding={priority ? 'sync' : 'async'}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!failedTransform && deliveredSrc !== src) setFailedTransform(true)
        }}
        className={`h-full w-full object-cover transition-opacity duration-500 ease-out ${loaded && !showHover ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
        {...rest}
      />
      {hasHover && hoverWanted && (
        <img
          src={buildImageUrl(hoverSrc, { width, quality })}
          srcSet={hoverSet}
          sizes={hoverSet ? sizes : undefined}
          alt=""
          aria-hidden="true"
          decoding="async"
          onLoad={() => setHoverReady(true)}
          onError={() => setHoverFailed(true)}
          className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-out ${showHover ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
        />
      )}
    </span>
  )
}
