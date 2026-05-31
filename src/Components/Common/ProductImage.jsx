import { useState } from 'react'
import { buildImageUrl, buildImageSrcSet } from '../../lib/imageCdn'

/**
 * Smart product image: reserves space (no layout shift), shows a soft shimmer
 * until the image decodes, then fades it in — so images feel instant instead of
 * popping in. Requests a right-sized image when Supabase transforms are enabled,
 * and falls back to the original URL if a transformed request fails.
 *
 * `width` is the intended on-screen render width (CSS px) and is used only as a
 * delivery hint for the CDN; layout is controlled by the parent + `aspect`.
 */
export default function ProductImage({
  src,
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
  const [failedTransform, setFailedTransform] = useState(false)

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

  const deliveredSrc = failedTransform ? src : buildImageUrl(src, { width, quality })
  const srcSet =
    failedTransform || !responsiveWidths ? undefined : buildImageSrcSet(src, responsiveWidths, { quality }) || undefined

  return (
    <span className={`relative block overflow-hidden bg-[#f1ede8] ${className}`} style={{ aspectRatio: aspect }}>
      {!loaded && (
        <span
          aria-hidden
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#f1ede8] via-[#e7e1d9] to-[#f1ede8]"
        />
      )}
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
        className={`h-full w-full object-cover transition-[opacity,transform] duration-500 ease-out ${
          loaded ? 'opacity-100' : 'opacity-0'
        } ${imgClassName}`}
        {...rest}
      />
    </span>
  )
}
