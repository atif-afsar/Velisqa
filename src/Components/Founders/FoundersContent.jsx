import { Link } from 'react-router-dom'
import Picture from '../UI/Picture'
import { ArrowRightIcon, PlusIcon } from '../UI/Icons'
import { FOUNDERS, FOUNDER_FAQS } from '../../data/founders'

const PRINCIPLES = [
  ['Elegant', 'in design — clean lines, considered proportions, nothing added for the sake of it.'],
  ['Honest', 'in communication — real prices, real reviews and clear policies.'],
  ['Thoughtful', 'in service — from the first click to the moment the box is opened.'],
  ['Modern', 'in approach — pieces made for how women dress and live today.'],
]

function FounderFeature({ founder, reverse }) {
  return (
    <article className="grid items-center gap-10 md:grid-cols-2 lg:gap-20" aria-labelledby={`${founder.id}-name`}>
      <div className={`relative aspect-[4/5] overflow-hidden bg-mist ${reverse ? 'md:order-2' : ''}`}>
        <Picture
          slot={founder.slot}
          alt={founder.alt}
          sizes="(min-width: 768px) 46vw, 100vw"
          className="absolute inset-0"
          objectPosition="50% 30%"
        />
      </div>
      <div className="max-w-xl">
        <p className="eyebrow text-muted">{founder.role}</p>
        <h2 id={`${founder.id}-name`} className="type-display mt-4 text-ink">
          {founder.name}
        </h2>
        <blockquote className="type-quote mt-8 border-l border-accent pl-6 text-ink">“{founder.quote}”</blockquote>
        <div className="mt-8 space-y-4 text-[0.95rem] leading-relaxed text-body">
          {founder.bio.map((p) => (
            <p key={p.slice(0, 20)}>{p}</p>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2">
          <a href={founder.linkedin} target="_blank" rel="noopener noreferrer" className="btn btn-link">
            LinkedIn
          </a>
          <a href={founder.portfolio} target="_blank" rel="noopener noreferrer" className="btn btn-link">
            Portfolio
          </a>
        </div>
      </div>
    </article>
  )
}

export default function FoundersContent() {
  return (
    <main className="page-offset-nav bg-paper text-ink">
      <header className="container-lux py-16 text-center lg:py-24">
        <p className="eyebrow text-muted">The founders</p>
        <h1 className="type-display mx-auto mt-5 max-w-3xl">The people behind Velisqa</h1>
        <p className="mx-auto mt-6 max-w-xl text-[0.95rem] leading-relaxed text-body">
          Velisqa was founded by Sameer Shameem and Atif Afsar with one idea: modern jewellery should feel considered,
          honest and personal — from the design of each piece to the way it reaches you.
        </p>
      </header>

      <div className="container-lux space-y-24 pb-24 lg:space-y-32 lg:pb-32">
        {FOUNDERS.map((f, i) => (
          <FounderFeature key={f.id} founder={f} reverse={i % 2 === 1} />
        ))}
      </div>

      <section aria-labelledby="principles-heading" className="border-y border-line bg-mist py-20 lg:py-28">
        <div className="container-lux">
          <div className="max-w-2xl">
            <p className="eyebrow text-muted">What we believe</p>
            <h2 id="principles-heading" className="type-section mt-3">
              A jewellery house built to last
            </h2>
          </div>
          <dl className="mt-12 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            {PRINCIPLES.map(([term, desc]) => (
              <div key={term} className="bg-mist p-8 lg:p-10">
                <dt className="font-serif text-3xl text-ink">{term}</dt>
                <dd className="mt-3 text-sm leading-relaxed text-body">{desc}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="founder-faq-heading" className="container-lux max-w-3xl py-20 lg:py-28">
        <h2 id="founder-faq-heading" className="type-section text-center">
          Questions about Velisqa
        </h2>
        <div className="mt-10 border-b border-line">
          {FOUNDER_FAQS.map(([q, a]) => (
            <details key={q} className="group border-t border-line">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 text-left text-ink [&::-webkit-details-marker]:hidden">
                <span className="font-serif text-xl">{q}</span>
                <PlusIcon size={16} className="shrink-0 transition-transform duration-300 group-open:rotate-45" />
              </summary>
              <p className="pb-6 text-sm leading-relaxed text-body">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="bg-ink py-20 text-center text-white lg:py-24">
        <div className="container-lux">
          <h2 className="type-section text-white">Discover the collection</h2>
          <p className="mx-auto mt-4 max-w-md text-white/80">Pieces designed to be worn every day and remembered every time.</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/collections" className="btn btn-light">
              Shop the collection
            </Link>
            <Link to="/about" className="btn border-white/40 text-white hover:border-white">
              Our story <ArrowRightIcon size={16} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
