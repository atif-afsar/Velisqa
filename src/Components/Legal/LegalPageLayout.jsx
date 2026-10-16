import { Link, useLocation } from "react-router-dom";
import { motion } from "../../lib/motion";
import { legalNav } from "./legalContent";

const fade = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
};

export default function LegalPageLayout({ page }) {
  const { pathname } = useLocation();

  return (
    <main className="page-offset-nav bg-mist text-ink">
      <section className="relative overflow-hidden border-b border-line bg-ink px-4 py-14 text-white sm:px-6 sm:py-16 md:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_-20%,rgba(17, 17, 17,0.18),transparent_55%)]"
        />
        <div className="container-stitch relative">
          <motion.div initial="hidden" animate="visible" variants={fade}>
            <Link
              to="/"
              className="mb-6 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted transition hover:text-accent-ink sm:text-[11px]"
            >
              ← Back to Home
            </Link>
            <p className="type-label text-muted">{page.eyebrow}</p>
            <h1 className="mt-3 font-serif text-3xl font-bold tracking-wide text-white sm:text-4xl md:text-5xl">
              {page.title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-white/70 sm:text-base">
              {page.description}
            </p>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 sm:text-[11px]">
              Last updated · {page.updated}
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
            <nav aria-label="Legal pages" className="rounded-2xl border border-line bg-white/60 p-4 shadow-[0_12px_40px_rgba(17, 17, 17,0.06)] backdrop-blur-sm sm:p-5">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
                Legal
              </p>
              <ul className="flex flex-col gap-1">
                {legalNav.map((item) => {
                  const active = pathname === item.path;
                  return (
                    <li key={item.key}>
                      <Link
                        to={item.path}
                        className={`tap-target block rounded-lg px-3 py-2.5 text-xs font-bold tracking-wide transition ${
                          active
                            ? "bg-ink text-white shadow-sm"
                            : "text-body hover:bg-mist hover:text-ink"
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

          <article className="min-w-0">
            <div className="space-y-8 sm:space-y-10">
              {page.sections.map((section, index) => (
                <motion.section
                  key={section.id}
                  id={section.id}
                  variants={fade}
                  className="scroll-mt-28 rounded-2xl border border-muted/10 bg-white/50 p-5 shadow-[0_8px_32px_rgba(17, 17, 17,0.04)] sm:p-7 md:p-8"
                >
                  <motion.div className="mb-4 flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h2 className="font-serif text-xl font-bold text-ink sm:text-2xl">
                      {section.title}
                    </h2>
                  </motion.div>
                  <div className="space-y-3 border-t border-line pt-4">
                    {section.body.map((paragraph) => (
                      <p
                        key={paragraph.slice(0, 40)}
                        className="type-body-luxury text-sm font-semibold leading-relaxed text-body sm:text-[0.95rem]"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </motion.section>
              ))}
            </div>

            <motion.div
              variants={fade}
              className="mt-10 flex flex-col items-stretch justify-between gap-4 rounded-2xl border border-line bg-gradient-to-br from-ink to-[#4c172f] p-6 text-white sm:flex-row sm:items-center sm:p-8"
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                  Need assistance?
                </p>
                <p className="mt-2 font-serif text-lg font-bold sm:text-xl">
                  Our concierge is at your service.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/order"
                  className="tap-target inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-transparent px-6 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted transition hover:bg-ink hover:text-ink sm:text-xs"
                >
                  Order on WhatsApp
                </Link>
                <Link
                  to="/contact"
                  className="tap-target inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-transparent px-6 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-white/85 transition hover:border-line hover:text-accent-ink sm:text-xs"
                >
                  All contact details
                </Link>
              </div>
            </motion.div>
          </article>
        </motion.div>
      </div>

    </main>
  );
}
