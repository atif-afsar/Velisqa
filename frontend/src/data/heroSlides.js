/** Homepage hero banner slider — shared by Components/Home/Hero.jsx and the build-time prerender. */
export const HERO_INTERVAL_MS = 5000

/** Portrait banners below this width, wide banners from it up. */
export const HERO_BANNER_MEDIA = '(min-width: 768px)'

/**
 * Image-only banners (no text over the photography), each linking to a collection.
 * - `mobile`: portrait photo (media/hero-model-*.jpg), `focus` = object-position for the 4:5 crop.
 * - `banner`: 3:1 composition (media/hero-banner-*.jpg, built by scripts/compose-hero-banners.mjs).
 * Credits in REDESIGN.md.
 */
export const HERO_SLIDES = [
  {
    mobile: 'hero-model-amara',
    banner: 'hero-banner-amara',
    focus: '50% 30%',
    to: '/collections/earrings',
    label: 'Shop earrings',
    alt: 'Model in a warm studio wearing sculpted gold earrings',
  },
  {
    mobile: 'hero-model-elena',
    banner: 'hero-banner-elena',
    focus: '55% 38%',
    to: '/collections/necklaces',
    label: 'Shop necklaces',
    alt: 'Model with hands in her hair wearing gold knot earrings and a fine gold necklace',
  },
  {
    mobile: 'hero-model-mei',
    banner: 'hero-banner-mei',
    focus: '45% 22%',
    to: '/collections?sort=newest',
    label: 'Shop new arrivals',
    alt: 'Model in a red velvet dress wearing pearl earrings and a pearl necklace',
  },
]
