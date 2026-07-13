import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import HomeFooter from "../Components/Home/HomeFooter";
import SEOHead from "../Components/SEO/SEOHead";
import { buildBreadcrumbSchema } from "../Components/SEO/schemaBuilders";
import { pageSeo } from "../Components/SEO/seoData";
import { legalNav } from "../Components/Legal/legalContent";
import WhatsAppCTA from "../Components/WhatsApp/WhatsAppCTA";
import {
  AREA_SERVED,
  BRAND_ORIGIN,
  CONTACT_CHANNELS,
  CONTACT_PAGE,
  LANGUAGES,
  PAYMENT_METHODS,
  SALON_ADDRESS_LINES,
  SALON_HOURS,
  SALON_NOTE,
  SOCIAL_LINKS,
} from "../data/contactDetails";

const fade = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
};

function ChannelLink({ channel }) {
  const className =
    "mt-1 inline-block text-sm font-semibold text-[#130006] transition hover:text-[#6f334a] sm:text-base";

  if (channel.internal) {
    return (
      <Link to={channel.href} className={className}>
        {channel.value}
      </Link>
    );
  }

  return (
    <a
      href={channel.href}
      className={className}
      target={channel.external ? "_blank" : undefined}
      rel={channel.external ? "noreferrer" : undefined}
    >
      {channel.value}
    </a>
  );
}

export default function Contact() {
  return (
    <>
      <SEOHead
        {...pageSeo.contact}
        schema={[
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Contact", path: "/contact" },
          ]),
        ]}
      />
      <main className="page-offset-nav bg-[#f9f5f0] text-[#130006]">
        <section className="relative overflow-hidden border-b border-[#d4af37]/15 bg-[#3d0a21] px-4 py-14 text-[#f7ead0] sm:px-6 sm:py-16 md:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_-20%,rgba(212,175,55,0.18),transparent_55%)]"
          />
          <div className="container-stitch relative">
            <motion.div initial="hidden" animate="visible" variants={fade}>
              <Link
                to="/"
                className="mb-6 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37]/80 transition hover:text-[#d4af37] sm:text-[11px]"
              >
                ← Back to Home
              </Link>
              <p className="type-label text-[#d4af37]">{CONTACT_PAGE.eyebrow}</p>
              <h1 className="mt-3 font-serif text-3xl font-bold tracking-wide text-[#fdf9f4] sm:text-4xl md:text-5xl">
                {CONTACT_PAGE.title}
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-white/70 sm:text-base">
                {CONTACT_PAGE.description}
              </p>
              <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 sm:text-[11px]">
                Last updated · {CONTACT_PAGE.updated}
              </p>
            </motion.div>
          </div>
        </section>

        <div className="container-stitch px-4 py-10 sm:px-6 sm:py-12 md:py-14">
          <motion.div
            className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[240px_minmax(0,1fr)]"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          >
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <nav
                aria-label="Help and policies"
                className="rounded-2xl border border-[#d4af37]/15 bg-white/60 p-4 shadow-[0_12px_40px_rgba(19,0,6,0.06)] backdrop-blur-sm sm:p-5"
              >
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#847377]">
                  Help & Policies
                </p>
                <ul className="flex flex-col gap-1">
                  {legalNav.map((item) => {
                    const active = item.path === CONTACT_PAGE.path;
                    return (
                      <li key={item.key}>
                        <Link
                          to={item.path}
                          className={`tap-target block rounded-lg px-3 py-2.5 text-xs font-bold tracking-wide transition ${
                            active
                              ? "bg-[#3d0a21] text-[#d4af37] shadow-sm"
                              : "text-[#514347] hover:bg-[#f1ede8] hover:text-[#130006]"
                          }`}
                          aria-current={active ? "page" : undefined}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </aside>

            <div className="min-w-0 space-y-8">
              <motion.section variants={fade} className="grid gap-4 sm:grid-cols-2">
                {CONTACT_CHANNELS.map((channel) => (
                  <article
                    key={channel.id}
                    className="rounded-2xl border border-[#847377]/10 bg-white/50 p-5 shadow-[0_8px_32px_rgba(19,0,6,0.04)] sm:p-6"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#847377]">
                      {channel.label}
                    </p>
                    <ChannelLink channel={channel} />
                    <p className="mt-3 text-sm font-semibold leading-relaxed text-[#514347]">
                      {channel.description}
                    </p>
                  </article>
                ))}
              </motion.section>

              <motion.section
                variants={fade}
                className="rounded-2xl border border-[#847377]/10 bg-white/50 p-5 shadow-[0_8px_32px_rgba(19,0,6,0.04)] sm:p-7 md:p-8"
              >
                <h2 className="font-serif text-xl font-bold text-[#130006] sm:text-2xl">
                  Flagship Salon — Mumbai
                </h2>
                <address className="mt-4 not-italic space-y-1 text-sm font-semibold leading-relaxed text-[#514347] sm:text-[0.95rem]">
                  {SALON_ADDRESS_LINES.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </address>
                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#847377]">
                      Hours
                    </dt>
                    <dd className="mt-1 font-semibold text-[#514347]">{SALON_HOURS}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#847377]">
                      Visits
                    </dt>
                    <dd className="mt-1 font-semibold text-[#514347]">{SALON_NOTE}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#847377]">
                      Brand origin
                    </dt>
                    <dd className="mt-1 font-semibold text-[#514347]">{BRAND_ORIGIN}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#847377]">
                      Service area
                    </dt>
                    <dd className="mt-1 font-semibold text-[#514347]">{AREA_SERVED}</dd>
                  </div>
                </dl>
              </motion.section>

              <motion.section
                variants={fade}
                className="rounded-2xl border border-[#847377]/10 bg-white/50 p-5 shadow-[0_8px_32px_rgba(19,0,6,0.04)] sm:p-7 md:p-8"
              >
                <h2 className="font-serif text-xl font-bold text-[#130006] sm:text-2xl">Social</h2>
                <ul className="mt-4 space-y-3">
                  {SOCIAL_LINKS.map((social) => (
                    <li key={social.id}>
                      <a
                        href={social.href}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex flex-wrap items-baseline justify-between gap-2"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#847377]">
                          {social.label}
                        </span>
                        <span className="text-sm font-semibold text-[#130006] transition group-hover:text-[#6f334a]">
                          {social.handle}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </motion.section>

              <motion.section
                variants={fade}
                className="rounded-2xl border border-[#847377]/10 bg-white/50 p-5 shadow-[0_8px_32px_rgba(19,0,6,0.04)] sm:p-7 md:p-8"
              >
                <h2 className="font-serif text-xl font-bold text-[#130006] sm:text-2xl">
                  Ordering & payments
                </h2>
                <ul className="mt-4 space-y-3 text-sm font-semibold leading-relaxed text-[#514347] sm:text-[0.95rem]">
                  <li>{PAYMENT_METHODS}.</li>
                  <li>Concierge languages: {LANGUAGES}.</li>
                  <li>
                    For shipping timelines see our{" "}
                    <Link to="/shipping-delivery" className="text-[#6f334a] underline-offset-2 hover:underline">
                      Shipping & Delivery Policy
                    </Link>
                    .
                  </li>
                  <li>
                    For returns and refunds see our{" "}
                    <Link to="/refund-cancellation" className="text-[#6f334a] underline-offset-2 hover:underline">
                      Refund & Cancellation Policy
                    </Link>
                    .
                  </li>
                </ul>
              </motion.section>

              <motion.div
                variants={fade}
                className="flex flex-col items-stretch justify-between gap-4 rounded-2xl border border-[#d4af37]/20 bg-gradient-to-br from-[#3d0a21] to-[#4c172f] p-6 text-[#f7ead0] sm:flex-row sm:items-center sm:p-8"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37]">
                    Fastest response
                  </p>
                  <p className="mt-2 font-serif text-lg font-bold sm:text-xl">
                    Message our WhatsApp concierge.
                  </p>
                </div>
                <WhatsAppCTA intent="consult" className="shrink-0 justify-center px-6 py-3 text-xs">
                  Chat on WhatsApp
                </WhatsAppCTA>
              </motion.div>
            </div>
          </motion.div>
        </div>

        <HomeFooter />
      </main>
    </>
  );
}
