import { Link } from 'react-router-dom'
import Picture from '../UI/Picture'
import { ArrowRightIcon } from '../UI/Icons'
import { FOUNDERS } from '../../data/founders'

const CRAFT = [
  ['01', 'Design', 'Clean lines and considered proportions — pieces that look as right in five years as they do today.'],
  ['02', 'Materials', 'Premium alloy bases, gold- and silver-tone plating and precision-set AD stones and crystal accents.'],
  ['03', 'Finish', 'Every piece is checked before it ships and packed gift-ready, so it arrives the way it should.'],
]

const VALUES = [
  ['Timeless', 'Designed to outlast trends.'],
  ['Accessible', 'Beautiful design without a premium-only price.'],
  ['Honest', 'Real prices, real reviews, clear policies.'],
  ['Personal', 'Every order handled with care.'],
]

/** "Our story" — the About page. */
export default function AboutContent() {
  return (
    <main className="page-offset-nav bg-paper text-ink">
      <header className="container-lux py-16 text-center lg:py-24">
        <p className="eyebrow text-muted">Our story</p>
        <h1 className="type-display mx-auto mt-5 max-w-3xl">Modern jewellery, made personal</h1>
        <p className="mx-auto mt-6 max-w-xl text-[0.95rem] leading-relaxed text-body">
          Velisqa is a jewellery brand from India creating pieces that feel timeless, personal and relevant — for
          every moment, every milestone, every story.
        </p>
      </header>

      <div className="container-lux">
        <div className="relative aspect-[4/3] overflow-hidden bg-mist sm:aspect-[16/8]">
          <Picture slot="about-hero" alt="Gold rings and fine chains arranged on white marble" sizes="(min-width: 1440px) 1440px, 100vw" priority className="absolute inset-0" />
        </div>
      </div>

      {/* Who we are */}
      <section aria-labelledby="who-heading" className="container-lux grid items-center gap-10 py-20 md:grid-cols-2 lg:gap-20 lg:py-28">
        <div className="max-w-xl">
          <p className="eyebrow text-muted">Who we are</p>
          <h2 id="who-heading" className="type-section mt-3">
            Born in Aligarh, made for today
          </h2>
          <div className="mt-6 space-y-4 text-[0.95rem] leading-relaxed text-body">
            <p>
              Velisqa was born from a simple belief: premium fashion jewellery should be elegant, accessible and deeply
              personal. Founded in Aligarh, Uttar Pradesh, we set out to build a brand that speaks to today’s generation
              without losing the timeless charm that makes jewellery special.
            </p>
            <p>
              From statement necklaces for a wedding reception to minimal everyday rings, Velisqa is designed for women
              who want jewellery that moves with their life.
            </p>
          </div>
          <p className="eyebrow mt-8 text-muted">Established 2026 · Aligarh, India</p>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden bg-mist">
          <Picture slot="about-story" alt="Gold bracelet resting on soft white fabric" sizes="(min-width: 768px) 46vw, 100vw" className="absolute inset-0" />
        </div>
      </section>

      {/* Craft */}
      <section aria-labelledby="craft-heading" className="border-y border-line bg-mist py-20 lg:py-28">
        <div className="container-lux">
          <p className="eyebrow text-muted">How we make it</p>
          <h2 id="craft-heading" className="type-section mt-3 max-w-2xl">
            Considered at every step
          </h2>
          <ol className="mt-12 grid gap-px bg-line md:grid-cols-3">
            {CRAFT.map(([num, title, text]) => (
              <li key={num} className="bg-mist p-8 lg:p-10">
                <span className="text-xs text-accent-ink">{num}</span>
                <h3 className="mt-4 font-serif text-3xl text-ink">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-body">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Mission */}
      <section aria-labelledby="mission-heading" className="container-lux grid items-center gap-10 py-20 md:grid-cols-2 lg:gap-20 lg:py-28">
        <div className="relative aspect-[4/5] overflow-hidden bg-mist md:order-1">
          <Picture slot="about-mission" alt="Jewellery and tools laid out on a bright studio desk" sizes="(min-width: 768px) 46vw, 100vw" className="absolute inset-0" />
        </div>
        <div className="max-w-xl md:order-2">
          <p className="eyebrow text-muted">Our mission</p>
          <h2 id="mission-heading" className="type-section mt-3">
            Premium jewellery, without compromise
          </h2>
          <p className="mt-6 text-[0.95rem] leading-relaxed text-body">
            You shouldn’t have to choose between quality and affordability. We want every woman to own jewellery that
            makes her feel special — contemporary design, quality finishing and genuine care, at a fair price.
          </p>
          <blockquote className="type-quote mt-8 border-l border-accent pl-6 text-ink">
            “To become India’s most loved modern jewellery brand.”
          </blockquote>
          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6">
            {VALUES.map(([term, desc]) => (
              <div key={term}>
                <dt className="eyebrow text-ink">{term}</dt>
                <dd className="mt-1.5 text-sm text-body">{desc}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Founders teaser */}
      <section aria-labelledby="founders-heading" className="border-t border-line py-20 lg:py-28">
        <div className="container-lux">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow text-muted">The people behind Velisqa</p>
              <h2 id="founders-heading" className="type-section mt-3">
                Meet the founders
              </h2>
            </div>
            <Link to="/founders" className="btn btn-link">
              Read their story
            </Link>
          </div>
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:gap-10">
            {FOUNDERS.map((f) => (
              <li key={f.id}>
                <Link to="/founders" className="group block">
                  <span className="relative block aspect-[4/5] overflow-hidden bg-mist">
                    <Picture slot={f.slot} alt={f.alt} sizes="(min-width: 640px) 46vw, 100vw" className="absolute inset-0" imgClassName="img-zoom" objectPosition="50% 30%" />
                  </span>
                  <span className="mt-5 flex items-center justify-between">
                    <span>
                      <span className="block font-serif text-2xl text-ink">{f.name}</span>
                      <span className="mt-1 block text-sm text-muted">{f.role}</span>
                    </span>
                    <ArrowRightIcon size={18} className="text-muted transition-transform group-hover:translate-x-1 group-hover:text-accent-ink" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-ink py-20 text-center text-white lg:py-24">
        <div className="container-lux">
          <h2 className="type-section text-white">Find your signature piece</h2>
          <p className="mx-auto mt-4 max-w-md text-white/80">Necklaces, earrings, rings, bracelets and bangles — free shipping on prepaid orders.</p>
          <Link to="/collections" className="btn btn-light mt-10">
            Shop the collection
          </Link>
        </div>
      </section>
    </main>
  )
}
