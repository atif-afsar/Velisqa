import { Link } from 'react-router-dom'
import Picture from '../UI/Picture'

/**
 * Campaign hero: one art-directed image (portrait on mobile, diptych from 1024px),
 * then one headline and one CTA on white — never over faces, always legible.
 */
export default function Hero() {
  return (
    <section aria-labelledby="hero-heading">
      <div className="relative aspect-[4/5] max-h-[calc(100svh-var(--nav-height)-9rem)] w-full overflow-hidden bg-[#d9d9d6] sm:aspect-[16/11] lg:aspect-auto lg:h-[clamp(460px,64svh,720px)] lg:max-h-none">
        <Picture
          slot="campaign-hero-b"
          desktopSlot="campaign-hero-desktop"
          alt="Two models in a neutral studio wearing statement gold earrings"
          sizes="100vw"
          desktopSizes="100vw"
          priority
          className="absolute inset-0"
          objectPosition="50% 26%"
        />
      </div>

      <div className="container-lux py-10 text-center lg:py-14">
        <p className="eyebrow text-muted">The new season edit</p>
        <h1 id="hero-heading" className="type-hero mx-auto mt-4 max-w-4xl text-ink">
          Jewellery, quietly extraordinary
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[0.95rem] leading-relaxed text-body">
          Modern pieces in gold and silver tones — made to be worn every day and noticed every time.
        </p>
        <Link to="/collections" className="btn btn-primary mt-8">
          Shop the collection
        </Link>
      </div>
    </section>
  )
}
