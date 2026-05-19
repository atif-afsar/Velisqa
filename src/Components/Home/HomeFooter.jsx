import { Link } from "react-router-dom";

const collections = [
  ["High Jewellery", "/collections"],
  ["Sun-Kissed Series", "/collections"],
  ["Daily Icons", "/collections"],
  ["Bespoke Atelier", "/collections"],
  ["Bridal Edit", "/collections"],
];

const concierge = [
  { label: "Email", value: "velisqa.in@gmail.com", href: "mailto:velisqa.in@gmail.com" },
  { label: "Instagram", value: "@velisqa.in", href: "https://instagram.com/velisqa.in" },
  { label: "Salon Hours", value: "Mon – Sat, 11am – 8pm" },
];

const address = [
  "Palladium Mall, Level 2",
  "Senapati Bapat Marg",
  "Lower Parel, Mumbai — 400 013",
];

const legal = [
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
  { label: "Authenticity", to: "/authenticity" },
];

export default function HomeFooter() {
  return (
    <footer
      id="contact"
      className="relative overflow-hidden bg-[#4D3148] text-[#f5f0eb]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(212,175,55,0.07),transparent_70%)]"
      />
      <div
        aria-hidden
        className="h-px w-full bg-[linear-gradient(90deg,transparent,rgba(212,175,55,0.55)_50%,transparent)]"
      />

      <div className="container-stitch relative px-4 py-8 sm:px-6 sm:py-9 lg:py-10">
        <div className="grid grid-cols-1 gap-8 min-[480px]:grid-cols-2 md:gap-9 lg:grid-cols-12 lg:gap-8">
          {/* Brand */}
          <div className="min-[480px]:col-span-2 lg:col-span-4">
            <h2 className="font-serif text-lg font-bold tracking-[0.26em] text-[#d4af37] sm:text-xl">
              VELISQA
            </h2>
            <p className="mt-1.5 max-w-sm text-[11px] font-bold leading-relaxed tracking-wide text-white/55 sm:text-xs">
              A heritage of elegance, crafted for the modern visionary.
            </p>
            <address className="mt-4 not-italic border-l border-[#d4af37]/30 pl-3 sm:mt-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#d4af37] sm:text-[11px]">
                Flagship Salon
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {address.map((line) => (
                  <li
                    key={line}
                    className="text-[10px] font-bold leading-snug tracking-wide text-white/50 sm:text-[11px]"
                  >
                    {line}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] font-bold tracking-wide text-[#d4af37]/70 sm:text-[11px]">
                By Appointment
              </p>
            </address>
          </div>

          {/* Collections */}
          <nav className="lg:col-span-2" aria-label="Footer collections">
            <ColHeading>Collections</ColHeading>
            <ul className="grid grid-cols-1 gap-2 sm:gap-2.5">
              {collections.map(([label, to]) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="inline-block text-[11px] font-bold tracking-wide text-white/55 transition-colors hover:text-[#d4af37] sm:text-xs"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Concierge */}
          <div className="lg:col-span-3">
            <ColHeading>Concierge</ColHeading>
            <ul className="space-y-2.5 sm:space-y-3">
              {concierge.map(({ label, value, href }) => (
                <li key={label}>
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#d4af37]/75 sm:text-[10px]">
                    {label}
                  </p>
                  {href ? (
                    <a
                      href={href}
                      className="mt-0.5 inline-block text-[11px] font-bold tracking-wide text-white/60 transition-colors hover:text-[#d4af37] sm:text-xs"
                      target={href.startsWith("http") ? "_blank" : undefined}
                      rel={href.startsWith("http") ? "noreferrer" : undefined}
                    >
                      {value}
                    </a>
                  ) : (
                    <p className="mt-0.5 text-[11px] font-bold tracking-wide text-white/60 sm:text-xs">
                      {value}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="min-[480px]:col-span-2 lg:col-span-3">
            <ColHeading>The Inner Circle</ColHeading>
            <p className="mb-3 text-[11px] font-bold leading-relaxed tracking-wide text-white/45 sm:text-xs">
              Private previews and first access to new collections.
            </p>
            <label className="sr-only" htmlFor="footer-email">
              Email address
            </label>
            <input
              id="footer-email"
              type="email"
              autoComplete="email"
              placeholder="EMAIL ADDRESS"
              className="w-full max-w-md border-0 border-b border-[#d4af37]/35 bg-transparent py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#f5f0eb] outline-none placeholder:text-white/30 focus:border-[#d4af37] sm:text-[11px] lg:max-w-none"
            />
            <button
              type="button"
              className="tap-target mt-3 w-full max-w-md border border-[#d4af37]/45 px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.22em] text-[#d4af37] transition hover:border-[#d4af37] hover:bg-[#d4af37]/10 sm:mt-3.5 sm:text-[10px] lg:max-w-none"
            >
              Request Access
            </button>
          </div>
        </div>

        <p
          className="my-5 text-center text-[11px] font-bold tracking-[0.35em] text-[#d4af37]/40 sm:my-6"
          aria-hidden
        >
          — ✦ —
        </p>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-[#d4af37]/15 pt-4 sm:flex-row sm:items-center sm:pt-5">
          <p className="order-2 text-center text-[9px] font-bold uppercase tracking-[0.14em] text-white/30 sm:order-1 sm:text-left sm:text-[10px]">
            © 2026 Velisqa Jewellery. All rights reserved.
          </p>
          <nav
            aria-label="Legal"
            className="order-1 flex w-full flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:order-2 sm:w-auto sm:justify-end sm:gap-6"
          >
            {legal.map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                className="tap-target text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 transition-colors hover:text-[#d4af37] sm:text-[11px]"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

function ColHeading({ children }) {
  return (
    <h3 className="mb-3 text-[9px] font-bold uppercase tracking-[0.28em] text-[#d4af37] sm:mb-3.5 sm:text-[10px]">
      {children}
    </h3>
  );
}
