import { useState, useEffect } from 'react'
import { buildImageUrl, buildImageSrcSet } from '../../lib/imageCdn'

/**
 * Smart product image with desktop hover & mobile touch image swap capabilities.
 * - Displays primary image (src) by default.
 * - Displays secondary image (hoverSrc) on mouse hover (desktop) or tap/touch toggle (mobile).
 * - Smooth opacity transition without layout shift or broken image glitches.
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
  const [loaded, setLoaded] = useState(false)
  const [hoverLoaded, setHoverLoaded] = useState(false)
  const [failedTransform, setFailedTransform] = useState(false)
  const [failedHoverTransform, setFailedHoverTransform] = useState(false)

  const [isHovered, setIsHovered] = useState(false)
  const [isTouchActive, setIsTouchActive] = useState(false)
  const [hoverFailed, setHoverFailed] = useState(false)

  // Reset hover state when hoverSrc changes
  useEffect(() => {
    setHoverFailed(false)
    setHoverLoaded(false)
  }, [hoverSrc])

  if (!src) {
    return (
      <span
        className={`flex items-center justify-center bg-[#f1ede8] text-xs text-[#847377] ${className}`}
        style={{ aspectRatio: aspect }}
      >
        No image
      </span>
    )
  }

  const hasHoverImage = Boolean(
    hoverSrc &&
    typeof hoverSrc === 'string' &&
    hoverSrc.trim() &&
    hoverSrc !== src &&
    !hoverFailed
  )

  const deliveredSrc = failedTransform ? src : buildImageUrl(src, { width, quality })
  const srcSet =
    failedTransform || !responsiveWidths ? undefined : buildImageSrcSet(src, responsiveWidths, { quality }) || undefined

  const deliveredHoverSrc = hasHoverImage
    ? (failedHoverTransform ? hoverSrc : buildImageUrl(hoverSrc, { width, quality }))
    : null
  const hoverSrcSet =
    hasHoverImage && (!failedHoverTransform && responsiveWidths)
      ? buildImageSrcSet(hoverSrc, responsiveWidths, { quality }) || undefined
      : undefined

  const showHoverState = hasHoverImage && (isHovered || isTouchActive)

  return (
    <span
      className={`relative block overflow-hidden bg-[#f1ede8] select-none ${className}`}
      style={{ aspectRatio: aspect }}
      onMouseEnter={() => hasHoverImage && setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setIsTouchActive(false)
      }}
    >
      {!loaded && (
        <span
          aria-hidden
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#f1ede8] via-[#e7e1d9] to-[#f1ede8]"
        />
      )}

      {/* Primary Cover Image */}
      <img
        src={deliveredSrc}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!failedTransform && deliveredSrc !== src) {
            setFailedTransform(true)
          }
        }}
        className={`h-full w-full object-cover transition-all duration-500 ease-out ${
          loaded ? 'opacity-100' : 'opacity-0'
        } ${showHoverState ? 'opacity-0 scale-105' : 'opacity-100'} ${imgClassName}`}
        {...rest}
      />

      {/* Secondary Hover Image Overlay */}
      {hasHoverImage && (
        <img
          src={deliveredHoverSrc}
          srcSet={hoverSrcSet}
          sizes={hoverSrcSet ? sizes : undefined}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onLoad={() => setHoverLoaded(true)}
          onError={() => {
            if (!failedHoverTransform && deliveredHoverSrc !== hoverSrc) {
              setFailedHoverTransform(true)
            } else {
              setHoverFailed(true)
            }
          }}
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 ease-out pointer-events-none ${
            showHoverState && hoverLoaded ? 'opacity-100 scale-105' : 'opacity-0 scale-100'
          } ${imgClassName}`}
        />
      )}
    </span>
  )
}
