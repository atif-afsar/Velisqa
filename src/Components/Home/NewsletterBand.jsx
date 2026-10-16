import NewsletterForm from '../Common/NewsletterForm'

/** Homepage email capture. */
export default function NewsletterBand() {
  return (
    <section aria-labelledby="newsletter-heading" className="bg-ink text-white">
      <div className="container-lux grid items-center gap-8 py-16 md:grid-cols-2 md:gap-16 lg:py-20">
        <div>
          <p className="eyebrow text-white/70">The inner circle</p>
          <h2 id="newsletter-heading" className="type-section mt-3 text-white">
            First access, private previews
          </h2>
          <p className="mt-4 max-w-md text-[0.95rem] leading-relaxed text-white/80">
            New collections, restocks and styling notes — a few times a month, never more.
          </p>
        </div>
        <NewsletterForm source="homepage" tone="dark" />
      </div>
    </section>
  )
}
