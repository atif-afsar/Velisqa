import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import HomeFooter from "../Home/HomeFooter";

/* ─── animation variants ──────────────────────────────────── */
const fade = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

/* ─── data ─────────────────────────────────────────────────── */
const FOUNDERS = [
  {
    id: "sameer",
    name: "Sameer Shameem",
    role: "Founding Leader",
    image: "/images/sameer-shameem.jpg",
    alt: "Sameer Shameem — founding leader of Velisqa Jewellery",
    philosophy:
      "Build a brand people remember, not simply a store people visit.",
    bio: "Sameer Shameem is one of the founding leaders behind Velisqa Jewellery, helping shape the brand's direction, identity, and long-term vision. His approach is rooted in building a jewellery brand that feels premium without feeling distant — one that understands modern customers and combines refined aesthetics with a strong sense of trust. From the way Velisqa presents its collections to the way customers experience the brand, Sameer's contribution is centered around creating a clear and memorable identity for Velisqa.",
    bioExtra:
      "At Velisqa, the goal is not only to offer jewellery. It is to create an experience around choosing, wearing, gifting, and remembering jewellery.",
    portfolio: "https://sameer-portfolio-dun.vercel.app/",
    linkedin: "https://www.linkedin.com/in/sameer-shameem-4309bb340",
  },
  {
    id: "atif",
    name: "Atif Afsar",
    role: "Founding Leader",
    image: "/images/atif-afsar.jpg",
    alt: "Atif Afsar — founding leader of Velisqa Jewellery",
    philosophy:
      "Make every interaction with the brand feel as considered as the jewellery itself.",
    bio: "Atif Afsar is one of the founding leaders behind Velisqa Jewellery, contributing to the brand's growth, execution, digital presence, and evolution. His perspective brings together creativity, technology, communication, and business thinking — helping transform ideas into experiences that customers can discover and engage with. Atif's role in the Velisqa journey is focused on building a modern jewellery brand that can compete in a digital-first world while retaining the trust, elegance, and personal connection associated with fine jewellery.",
    bioExtra:
      "For Atif, the future of jewellery is not only about what customers wear. It is also about how they discover the brand, understand its story, connect with its people, and experience it across every touchpoint.",
    portfolio: "https://portfolio-rgzt.vercel.app/",
    linkedin:
      "https://www.linkedin.com/in/atif-afsar-64903b33a?originalSubdomain=in",
  },
];

const PILLARS = [
  { label: "Elegant", desc: "in its design" },
  { label: "Honest", desc: "in its communication" },
  { label: "Thoughtful", desc: "in its customer experience" },
  { label: "Modern", desc: "in its approach" },
  { label: "Ambitious", desc: "in its vision" },
  { label: "Personal", desc: "in every interaction" },
];

const FAQS = [
  {
    q: "Who is the founder of Velisqa?",
    a: "Sameer Shameem and Atif Afsar are the founding leaders behind Velisqa Jewellery.",
  },
  {
    q: "Who founded Velisqa Jewellery?",
    a: "Velisqa Jewellery was founded by Sameer Shameem and Atif Afsar, who continue to shape the brand's vision and growth.",
  },
  {
    q: "Who are the founders of Velisqa?",
    a: "The founders and founding leaders of Velisqa are Sameer Shameem and Atif Afsar.",
  },
  {
    q: "Who is Sameer Shameem?",
    a: "Sameer Shameem is a founding leader behind Velisqa Jewellery and contributes to the brand's overall vision, identity, and direction.",
  },
  {
    q: "Who is Atif Afsar?",
    a: "Atif Afsar is a founding leader behind Velisqa Jewellery, contributing to the brand's growth, execution, digital presence, and development.",
  },
  {
    q: "What is Velisqa Jewellery?",
    a: "Velisqa Jewellery is a modern jewellery brand focused on creating an elegant and contemporary jewellery experience for today's customers.",
  },
];

/* ─── sub-components ───────────────────────────────────────── */

function GoldDivider() {
  return (
    <div
      aria-hidden
      className="mx-auto h-px w-full max-w-3xl bg-[linear-gradient(90deg,transparent,rgba(212,175,55,0.45)_50%,transparent)]"
    />
  );
}

function FounderCard({ founder, reverse }) {
  return (
    <motion.section
      variants={fade}
      className="relative overflow-hidden"
      id={`founder-${founder.id}`}
    >
      <div
        className={`container-stitch grid items-center gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:gap-14 ${
          reverse ? "lg:[direction:rtl]" : ""
        }`}
      >
        {/* Portrait */}
        <motion.div
          variants={fade}
          className={`relative mx-auto w-full max-w-md lg:max-w-none ${
            reverse ? "lg:[direction:ltr]" : ""
          }`}
        >
          <div className="luxury-arch relative aspect-[3/4] overflow-hidden rounded-b-2xl shadow-[0_20px_60px_rgba(19,0,6,0.18)]">
            <img
              src={founder.image}
              alt={founder.alt}
              loading="lazy"
              width={600}
              height={800}
              className="h-full w-full object-cover"
            />
            {/* subtle gold border accent */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-b-2xl border border-[#d4af37]/15"
              style={{
                borderTopLeftRadius: "1000px",
                borderTopRightRadius: "1000px",
              }}
            />
          </div>
        </motion.div>

        {/* Info */}
        <div className={reverse ? "lg:[direction:ltr]" : ""}>
          <p className="type-label text-[#d4af37]">{founder.role}</p>
          <h2 className="mt-2 font-serif text-3xl font-bold tracking-wide text-[#130006] sm:text-4xl md:text-[2.75rem]">
            {founder.name}
          </h2>

          {/* Quote */}
          <blockquote className="mt-6 border-l-2 border-[#d4af37]/40 pl-5">
            <p className="type-quote text-lg italic text-[#3d0a21]/80 sm:text-xl md:text-2xl">
              &ldquo;{founder.philosophy}&rdquo;
            </p>
          </blockquote>

          <p className="type-body-luxury mt-6 text-[#514347]">{founder.bio}</p>
          <p className="type-body-luxury mt-4 text-[#514347]/80">
            {founder.bioExtra}
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={founder.portfolio}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border border-[#d4af37]/50 px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[#3d0a21] transition hover:border-[#d4af37] hover:bg-[#d4af37]/10"
            >
              View Portfolio
              <span aria-hidden>→</span>
            </a>
            <a
              href={founder.linkedin}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[#847377] transition hover:text-[#3d0a21]"
            >
              LinkedIn
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M7 17 17 7M7 7h10v10" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function FaqItem({ faq, isOpen, onToggle }) {
  return (
    <div className="border-b border-[#d4af37]/15">
      <button
        type="button"
        onClick={onToggle}
        className="tap-target flex w-full items-center justify-between gap-4 py-5 text-left"
        aria-expanded={isOpen}
      >
        <span className="font-serif text-base font-bold text-[#130006] sm:text-lg">
          {faq.q}
        </span>
        <span
          aria-hidden
          className={`shrink-0 text-[#d4af37] transition-transform duration-300 ${
            isOpen ? "rotate-45" : ""
          }`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <line x1="10" y1="4" x2="10" y2="16" />
            <line x1="4" y1="10" x2="16" y2="10" />
          </svg>
        </span>
      </button>
      <motion.div
        initial={false}
        animate={{
          height: isOpen ? "auto" : 0,
          opacity: isOpen ? 1 : 0,
        }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden"
      >
        <p className="pb-5 text-sm font-semibold leading-relaxed text-[#514347] sm:text-[0.95rem]">
          {faq.a}
        </p>
      </motion.div>
    </div>
  );
}

/* ─── main component ───────────────────────────────────────── */

export default function FoundersContent() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <main className="page-offset-nav bg-[#f9f5f0] text-[#130006]">
      {/* ══════════ 1. HERO ══════════ */}
      <section className="relative overflow-hidden border-b border-[#d4af37]/15 bg-[#3d0a21] px-4 py-20 text-[#f7ead0] sm:px-6 sm:py-24 md:py-32 lg:py-40">
        {/* radial glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_-20%,rgba(212,175,55,0.18),transparent_55%)]"
        />
        {/* secondary glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_100%,rgba(61,10,33,0.6),transparent_70%)]"
        />

        <motion.div
          className="container-stitch relative flex flex-col items-center text-center"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.p
            variants={fade}
            className="type-label text-[#d4af37]"
          >
            THE PEOPLE BEHIND VELISQA
          </motion.p>

          <motion.h1
            variants={fade}
            className="mt-5 font-serif text-4xl font-bold tracking-wide text-[#fdf9f4] sm:text-5xl md:text-6xl lg:text-7xl"
          >
            The Minds Behind Velisqa
          </motion.h1>

          <motion.div variants={fade} className="hero-tagline-divider mt-6" />

          <motion.p
            variants={fade}
            className="mt-5 max-w-2xl text-sm font-semibold leading-relaxed text-white/65 sm:text-base md:text-lg"
          >
            Two perspectives. One vision. A jewellery house built with purpose.
          </motion.p>
        </motion.div>
      </section>

      {/* ══════════ 2. INTRO ══════════ */}
      <motion.section
        className="responsive-section bg-[#f9f5f0]"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
      >
        <div className="container-stitch px-4 sm:px-6">
          <motion.div
            variants={fade}
            className="mx-auto max-w-3xl text-center"
          >
            <h2 className="font-serif text-2xl font-bold text-[#130006] sm:text-3xl md:text-4xl">
              Meet the Visionary Pillars&nbsp;of&nbsp;Velisqa
            </h2>
            <p className="type-body-luxury mx-auto mt-5 max-w-2xl text-[#514347]">
              Every jewellery house is built with more than precious metals and
              beautiful designs. Behind every collection is a point of view, a
              purpose, and people who believe in creating something worth
              remembering.
            </p>
            <p className="type-body-luxury mx-auto mt-4 max-w-2xl text-[#514347]">
              At Velisqa, that vision is carried forward by{" "}
              <strong className="text-[#130006]">
                Sameer Shameem and Atif Afsar
              </strong>{" "}
              — the founding leaders and defining pillars behind the brand.
            </p>

            <blockquote className="mx-auto mt-8 max-w-lg border-y border-[#d4af37]/20 py-6">
              <p className="type-quote text-lg text-[#3d0a21] sm:text-xl">
                Two minds. One vision.
                <br />A jewellery house built to last.
              </p>
            </blockquote>
          </motion.div>
        </div>
      </motion.section>

      <GoldDivider />

      {/* ══════════ 3. FOUNDER PROFILES ══════════ */}
      <motion.div
        className="responsive-section space-y-20 bg-[#f9f5f0] sm:space-y-28 lg:space-y-32"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={stagger}
      >
        {FOUNDERS.map((founder, i) => (
          <FounderCard key={founder.id} founder={founder} reverse={i === 1} />
        ))}
      </motion.div>

      <GoldDivider />

      {/* ══════════ 4. TWO PILLARS ONE VELISQA ══════════ */}
      <motion.section
        className="responsive-section bg-[#f9f5f0]"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
      >
        <div className="container-stitch px-4 sm:px-6">
          <motion.div variants={fade} className="text-center">
            <h2 className="font-serif text-2xl font-bold text-[#130006] sm:text-3xl md:text-4xl">
              Two Pillars. One Velisqa.
            </h2>
            <p className="type-body-luxury mx-auto mt-4 max-w-2xl text-[#514347]">
              Sameer Shameem and Atif Afsar bring different strengths to the same
              ambition. Where one helps shape the vision, the other helps turn
              that vision into movement. Together, they represent the thinking,
              energy, and direction behind Velisqa.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {PILLARS.map((p) => (
              <motion.div
                key={p.label}
                variants={fade}
                className="rounded-2xl border border-[#d4af37]/15 bg-white/50 p-6 text-center shadow-[0_8px_32px_rgba(19,0,6,0.04)] backdrop-blur-sm transition hover:border-[#d4af37]/30 hover:shadow-[0_12px_40px_rgba(19,0,6,0.08)]"
              >
                <p className="font-serif text-lg font-bold text-[#3d0a21]">
                  {p.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#847377]">
                  {p.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>

          <motion.p
            variants={fade}
            className="type-body-luxury mx-auto mt-10 max-w-2xl text-center text-[#514347]"
          >
            Velisqa is being built with the belief that jewellery is more than an
            accessory. It can carry memories, celebrate milestones, express
            individuality, and become part of a person&apos;s identity.
          </motion.p>
        </div>
      </motion.section>

      <GoldDivider />

      {/* ══════════ 5. THE VELISQA STORY ══════════ */}
      <motion.section
        className="responsive-section bg-[#3d0a21] text-[#f7ead0]"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(212,175,55,0.08),transparent_70%)]"
        />
        <div className="container-stitch relative px-4 sm:px-6">
          <motion.div
            variants={fade}
            className="mx-auto max-w-3xl text-center"
          >
            <p className="type-label text-[#d4af37]">OUR JOURNEY</p>
            <h2 className="mt-4 font-serif text-2xl font-bold text-[#fdf9f4] sm:text-3xl md:text-4xl">
              The Velisqa Story
            </h2>
            <h3 className="mt-2 text-base font-semibold text-white/50 sm:text-lg">
              From an Idea to a Jewellery Vision
            </h3>
            <p className="type-body-luxury mx-auto mt-6 max-w-2xl text-white/65">
              Velisqa was created with a vision to bring together the beauty of
              fine jewellery and the expectations of today&apos;s generation. The
              brand is built around a simple idea:{" "}
              <strong className="text-[#d4af37]">
                jewellery should feel timeless, personal, and relevant.
              </strong>
            </p>
            <p className="type-body-luxury mx-auto mt-4 max-w-2xl text-white/55">
              As Velisqa continues to grow, the founding team remains focused on
              creating collections and experiences that combine craftsmanship,
              contemporary design, trust, and accessibility. The story of Velisqa
              is still being written — one collection, one customer, and one
              meaningful moment at a time.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* ══════════ 6. MEET THE PEOPLE ══════════ */}
      <motion.section
        className="responsive-section bg-[#f9f5f0]"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
      >
        <div className="container-stitch px-4 sm:px-6">
          <motion.div variants={fade} className="text-center">
            <h2 className="font-serif text-2xl font-bold text-[#130006] sm:text-3xl md:text-4xl">
              Meet the People Behind the Jewellery
            </h2>
            <p className="type-body-luxury mx-auto mt-4 max-w-2xl text-[#514347]">
              A brand becomes meaningful when customers can connect with the
              people and ideas behind it. Explore the individual journeys of
              Sameer Shameem and Atif Afsar, learn about their work, and discover
              the thinking that continues to shape Velisqa.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2"
          >
            {FOUNDERS.map((f) => (
              <motion.div
                key={f.id}
                variants={fade}
                className="group rounded-2xl border border-[#d4af37]/15 bg-white/60 p-6 shadow-[0_8px_32px_rgba(19,0,6,0.04)] backdrop-blur-sm transition hover:border-[#d4af37]/30 hover:shadow-[0_16px_48px_rgba(19,0,6,0.1)] sm:p-8"
              >
                <div className="mx-auto mb-5 h-20 w-20 overflow-hidden rounded-full border-2 border-[#d4af37]/25">
                  <img
                    src={f.image}
                    alt={f.alt}
                    loading="lazy"
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                </div>
                <h3 className="text-center font-serif text-xl font-bold text-[#130006]">
                  {f.name}
                </h3>
                <p className="mt-1 text-center text-xs font-bold uppercase tracking-[0.16em] text-[#847377]">
                  {f.role} · Velisqa Jewellery
                </p>
                <div className="mt-5 flex flex-col items-center gap-2">
                  <a
                    href={f.portfolio}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-[#3d0a21] transition hover:text-[#d4af37]"
                  >
                    View Portfolio
                    <span aria-hidden>→</span>
                  </a>
                  <a
                    href={f.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold uppercase tracking-[0.12em] text-[#847377] transition hover:text-[#3d0a21]"
                  >
                    LinkedIn ↗
                  </a>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      <GoldDivider />

      {/* ══════════ 7. FAQ ══════════ */}
      <motion.section
        className="responsive-section bg-[#f9f5f0]"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={stagger}
      >
        <div className="container-stitch px-4 sm:px-6">
          <motion.div variants={fade} className="text-center">
            <p className="type-label text-[#d4af37]">FREQUENTLY ASKED</p>
            <h2 className="mt-3 font-serif text-2xl font-bold text-[#130006] sm:text-3xl md:text-4xl">
              Questions About Our Founders
            </h2>
          </motion.div>

          <motion.div
            variants={fade}
            className="mx-auto mt-10 max-w-2xl rounded-2xl border border-[#d4af37]/15 bg-white/50 px-6 py-2 shadow-[0_8px_32px_rgba(19,0,6,0.04)] backdrop-blur-sm sm:px-8"
          >
            {FAQS.map((faq, i) => (
              <FaqItem
                key={i}
                faq={faq}
                isOpen={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </motion.div>
        </div>
      </motion.section>

      <GoldDivider />

      {/* ══════════ 8. FINAL CTA ══════════ */}
      <section className="relative overflow-hidden bg-[#3d0a21] px-4 py-20 text-[#f7ead0] sm:px-6 sm:py-24 md:py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_-20%,rgba(212,175,55,0.14),transparent_55%)]"
        />
        <motion.div
          className="container-stitch relative flex flex-col items-center text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
        >
          <motion.p variants={fade} className="type-label text-[#d4af37]">
            VELISQA JEWELLERY
          </motion.p>
          <motion.h2
            variants={fade}
            className="mt-4 font-serif text-2xl font-bold text-[#fdf9f4] sm:text-3xl md:text-4xl lg:text-5xl"
          >
            Discover the Vision.
            <br />
            Wear the Story.
          </motion.h2>
          <motion.p
            variants={fade}
            className="mx-auto mt-5 max-w-xl text-sm font-semibold leading-relaxed text-white/55 sm:text-base"
          >
            Behind every Velisqa creation is a belief in beauty that lasts beyond
            the moment. Meet the people shaping that belief, explore the world of
            Velisqa, and discover jewellery created for stories worth keeping.
          </motion.p>
          <motion.div
            variants={fade}
            className="mt-8 flex flex-wrap justify-center gap-4"
          >
            <Link
              to="/collections"
              className="inline-flex items-center gap-2 border border-[#d4af37] bg-[#d4af37]/10 px-8 py-3.5 text-xs font-bold uppercase tracking-[0.18em] text-[#d4af37] transition hover:bg-[#d4af37]/20"
            >
              Explore Collections
              <span aria-hidden>→</span>
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 border border-white/20 px-8 py-3.5 text-xs font-bold uppercase tracking-[0.18em] text-white/60 transition hover:border-white/40 hover:text-white/80"
            >
              About Velisqa
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <HomeFooter />
    </main>
  );
}
