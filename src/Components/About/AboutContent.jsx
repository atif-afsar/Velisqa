import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import HomeFooter from "../Home/HomeFooter";

/* ─── animation ──────────────────────────────────────────── */
const fade = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ─── data ───────────────────────────────────────────────── */
const VALUES = [
  {
    title: "Timeless Elegance",
    desc: "Designed to transcend trends — jewellery that looks just as stunning years from now as it does today.",
  },
  {
    title: "Uncompromising Quality",
    desc: "Premium alloy bases, gold-tone plating, and precision-set AD stones — finished to a standard that speaks for itself.",
  },
  {
    title: "Accessible Luxury",
    desc: "Beautiful design and superior craft, without the premium-only price tag. Jewellery for every woman.",
  },
  {
    title: "Personal Connection",
    desc: "From WhatsApp concierge to handwritten notes — every interaction feels personal, not transactional.",
  },
];

/* ─── component ──────────────────────────────────────────── */
export default function AboutContent() {
  return (
    <main className="page-offset-nav bg-[#fdf9f4] text-[#130006]">
      {/* ══════════ 1. HERO — light, text-based, minimal ══════════ */}
      <motion.section
        className="px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 md:pb-24 md:pt-20"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        <div className="container-stitch">
          <motion.div variants={fade} className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#d4af37]">
              Our Story
            </p>
            <h1 className="mt-4 font-serif text-4xl font-bold text-[#130006] sm:text-5xl md:text-6xl">
              About Velisqa
            </h1>
            <div className="mx-auto mt-6 h-px w-16 bg-[#d4af37]/40" />
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[#514347]">
              A modern jewellery brand from India, crafting premium fashion
              jewellery that feels timeless, personal, and relevant.
            </p>
          </motion.div>

          {/* Hero image — light, airy */}
          <motion.div
            variants={fade}
            className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-2xl"
          >
            <img
              src="/images/about-hero.jpg"
              alt="Velisqa minimal jewellery collection — necklace, rings and earrings on marble"
              width="1920"
              height="1080"
              loading="eager"
              fetchPriority="high"
              className="w-full object-cover"
              decoding="async"
            />
          </motion.div>
        </div>
      </motion.section>

      {/* ══════════ 2. WHO WE ARE — text + image side by side ══════════ */}
      <motion.section
        className="px-4 py-16 sm:px-6 sm:py-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
      >
        <div className="container-stitch grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <motion.div variants={fade}>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#d4af37]">
              Who We Are
            </p>
            <h2 className="mt-3 font-serif text-2xl font-bold text-[#130006] sm:text-3xl">
              A Modern Jewellery Brand from India
            </h2>
            <p className="mt-5 text-[15px] leading-[1.8] text-[#514347]">
              Velisqa was born from a simple belief — that premium fashion
              jewellery should be elegant, accessible, and deeply personal.
              Founded in Aligarh, Uttar Pradesh, we set out to create a brand
              that speaks to today&apos;s generation without losing the timeless
              charm that makes jewellery special.
            </p>
            <p className="mt-4 text-[15px] leading-[1.8] text-[#514347]">
              Every piece is crafted with precision — from hand-selected AD
              stones and crystal accents to polished gold-tone plating that
              catches the light beautifully. We create pieces that feel right
              for every moment, every milestone, every story.
            </p>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#847377]">
              Established 2026 · Aligarh, India
            </p>
          </motion.div>

          <motion.div variants={fade} className="overflow-hidden rounded-2xl">
            <img
              src="/images/about-story.jpg"
              alt="Velisqa pendant necklace on linen — minimal jewellery"
              loading="lazy"
              width="800"
              height="600"
              className="w-full object-cover"
              decoding="async"
            />
          </motion.div>
        </div>
      </motion.section>

      {/* thin divider */}
      <div className="container-stitch">
        <div className="h-px w-full bg-[#130006]/6" />
      </div>

      {/* ══════════ 3. OUR MISSION — image + text reversed ══════════ */}
      <motion.section
        className="px-4 py-16 sm:px-6 sm:py-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
      >
        <div className="container-stitch grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <motion.div
            variants={fade}
            className="order-2 overflow-hidden rounded-2xl lg:order-1"
          >
            <img
              src="/images/about-mission.jpg"
              alt="Jewellery craft workspace with gold chains and tools"
              loading="lazy"
              width="800"
              height="600"
              className="w-full object-cover"
              decoding="async"
            />
          </motion.div>

          <motion.div variants={fade} className="order-1 lg:order-2">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#d4af37]">
              Our Mission
            </p>
            <h2 className="mt-3 font-serif text-2xl font-bold text-[#130006] sm:text-3xl">
              Making Premium Jewellery Accessible
            </h2>
            <p className="mt-5 text-[15px] leading-[1.8] text-[#514347]">
              We believe you shouldn&apos;t have to choose between quality and
              affordability. From statement necklaces for your wedding reception
              to minimal everyday rings — Velisqa is designed for women who want
              jewellery that moves with their life.
            </p>
            <blockquote className="mt-5 border-l-2 border-[#d4af37]/30 pl-5">
              <p className="text-[15px] italic leading-relaxed text-[#3d0a21]/70">
                &ldquo;Jewellery that feels timeless, personal, and
                relevant.&rdquo;
              </p>
            </blockquote>
          </motion.div>
        </div>
      </motion.section>

      {/* thin divider */}
      <div className="container-stitch">
        <div className="h-px w-full bg-[#130006]/6" />
      </div>

      {/* ══════════ 4. OUR VISION — soft bg, centered ══════════ */}
      <motion.section
        className="bg-[#f5f0ea] px-4 py-16 sm:px-6 sm:py-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
      >
        <motion.div
          variants={fade}
          className="container-stitch mx-auto max-w-2xl text-center"
        >
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#d4af37]">
            Our Vision
          </p>
          <h2 className="mt-3 font-serif text-2xl font-bold text-[#130006] sm:text-3xl">
            To Become India&apos;s Most Loved Modern Jewellery Brand
          </h2>
          <p className="mt-5 text-[15px] leading-[1.8] text-[#514347]">
            We envision a world where every woman can own jewellery that makes
            her feel special — without compromise. Contemporary design,
            artisanal quality, and genuine care defining the jewellery experience
            in India.
          </p>
        </motion.div>
      </motion.section>

      {/* ══════════ 5. VALUES — clean cards ══════════ */}
      <motion.section
        className="px-4 py-16 sm:px-6 sm:py-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={stagger}
      >
        <div className="container-stitch">
          <motion.div variants={fade} className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#d4af37]">
              What We Stand For
            </p>
            <h2 className="mt-3 font-serif text-2xl font-bold text-[#130006] sm:text-3xl">
              Our Values
            </h2>
          </motion.div>

          <motion.div
            variants={stagger}
            className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2"
          >
            {VALUES.map((v) => (
              <motion.article
                key={v.title}
                variants={fade}
                className="rounded-xl border border-[#130006]/6 bg-white/60 p-6 transition hover:border-[#d4af37]/20 hover:shadow-[0_4px_20px_rgba(19,0,6,0.04)] sm:p-7"
              >
                <h3 className="font-serif text-lg font-bold text-[#130006]">
                  {v.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#514347]">
                  {v.desc}
                </p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* thin divider */}
      <div className="container-stitch">
        <div className="h-px w-full bg-[#130006]/6" />
      </div>

      {/* ══════════ 6. FOUNDERS — minimal cards ══════════ */}
      <motion.section
        className="px-4 py-16 sm:px-6 sm:py-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
      >
        <div className="container-stitch">
          <motion.div variants={fade} className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#d4af37]">
              The People Behind Velisqa
            </p>
            <h2 className="mt-3 font-serif text-2xl font-bold text-[#130006] sm:text-3xl">
              Meet Our Founders
            </h2>
            <p className="mt-4 text-[15px] leading-[1.8] text-[#514347]">
              Velisqa was founded by{" "}
              <strong className="text-[#130006]">Sameer Shameem</strong> and{" "}
              <strong className="text-[#130006]">Atif Afsar</strong> — two
              people with a shared vision of building a modern jewellery brand
              that combines timeless elegance with contemporary expression.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            className="mx-auto mt-10 grid max-w-xl gap-4 sm:grid-cols-2"
          >
            {[
              {
                name: "Sameer Shameem",
                portfolio: "https://sameer-portfolio-dun.vercel.app/",
                linkedin:
                  "https://www.linkedin.com/in/sameer-shameem-4309bb340",
              },
              {
                name: "Atif Afsar",
                portfolio: "https://portfolio-rgzt.vercel.app/",
                linkedin:
                  "https://www.linkedin.com/in/atif-afsar-64903b33a?originalSubdomain=in",
              },
            ].map((f) => (
              <motion.div
                key={f.name}
                variants={fade}
                className="rounded-xl border border-[#130006]/6 bg-white/60 p-6 text-center transition hover:border-[#d4af37]/20"
              >
                <h3 className="font-serif text-lg font-bold text-[#130006]">
                  {f.name}
                </h3>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#847377]">
                  Founding Leader
                </p>
                <div className="mt-4 flex items-center justify-center gap-4">
                  <a
                    href={f.portfolio}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-[#130006] transition hover:text-[#d4af37]"
                  >
                    Portfolio →
                  </a>
                  <a
                    href={f.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-[#847377] transition hover:text-[#130006]"
                  >
                    LinkedIn ↗
                  </a>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div variants={fade} className="mt-6 text-center">
            <Link
              to="/founders"
              className="text-sm font-semibold text-[#130006] transition hover:text-[#d4af37]"
            >
              Learn more about our founders →
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* ══════════ 7. WHAT MAKES US DIFFERENT — numbered ══════════ */}
      <motion.section
        className="bg-[#f5f0ea] px-4 py-16 sm:px-6 sm:py-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
      >
        <div className="container-stitch">
          <motion.div variants={fade} className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#d4af37]">
              Why Velisqa
            </p>
            <h2 className="mt-3 font-serif text-2xl font-bold text-[#130006] sm:text-3xl">
              What Makes Us Different
            </h2>
          </motion.div>

          <motion.div
            variants={stagger}
            className="mx-auto mt-10 grid max-w-3xl gap-8 sm:grid-cols-3"
          >
            {[
              {
                num: "01",
                title: "Curated Collections",
                desc: "Limited batches so your piece feels as unique as you are.",
              },
              {
                num: "02",
                title: "WhatsApp Concierge",
                desc: "Styling advice, order tracking, and personal assistance in one chat.",
              },
              {
                num: "03",
                title: "Crafted in India",
                desc: "Designed and crafted locally, supporting artisans and fair-wage manufacturing.",
              },
            ].map((item) => (
              <motion.div key={item.num} variants={fade} className="text-center">
                <span className="font-serif text-3xl text-[#d4af37]/25">
                  {item.num}
                </span>
                <h3 className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#130006]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#514347]">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* ══════════ 8. CTA — clean, light ══════════ */}
      <motion.section
        className="px-4 py-16 sm:px-6 sm:py-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={stagger}
      >
        <motion.div
          variants={fade}
          className="container-stitch mx-auto max-w-2xl text-center"
        >
          <h2 className="font-serif text-2xl font-bold text-[#130006] sm:text-3xl">
            Ready to Discover Velisqa?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#514347]">
            Explore our collections and find the piece that tells your story.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/collections"
              className="inline-flex items-center gap-2 bg-[#130006] px-7 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#3d0a21]"
            >
              Explore Collections →
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 border border-[#130006]/15 px-7 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[#130006] transition hover:border-[#130006]/30"
            >
              Contact Us
            </Link>
          </div>
        </motion.div>
      </motion.section>

      {/* ══════════ FOOTER ══════════ */}
      <HomeFooter />
    </main>
  );
}
