import { motion, useReducedMotion } from "framer-motion";

const STEPS = [
  {
    step: "01",
    title: "Apply",
    description: "Fill in your details, social handles, and follower count. We review every application within 48 hours.",
  },
  {
    step: "02",
    title: "Receive Your Kit",
    description: "Approved creators receive complimentary jewellery pieces matched to their tier — yours to style and keep.",
  },
  {
    step: "03",
    title: "Create UGC",
    description: "Film authentic content featuring VELISQA pieces. We provide creative briefs, not rigid scripts.",
  },
  {
    step: "04",
    title: "Earn & Grow",
    description: "Unlock tier discounts, exclusive codes for your audience, and paid campaigns as you level up.",
  },
];

const PERKS = [
  { icon: "🎁", label: "Free Jewellery", detail: "Complimentary pieces at every tier" },
  { icon: "💎", label: "Creator Discounts", detail: "Up to 30% off all collections" },
  { icon: "📱", label: "UGC Campaigns", detail: "Flexible briefs, your creative voice" },
  { icon: "🚀", label: "Audience Codes", detail: "Share exclusive offers with followers" },
];

const EASE = [0.16, 1, 0.3, 1];

export default function CreatorPerks() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-[#3d0a21] py-20 text-white md:py-28">
      <motion.div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 20% 50%, rgba(212,175,55,0.15), transparent), radial-gradient(ellipse 50% 40% at 80% 20%, rgba(175,160,209,0.1), transparent)",
        }}
      />

      <motion.div
        className="container-stitch relative z-10"
        initial={reduceMotion ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <motion.div
          className="mx-auto mb-16 max-w-2xl text-center"
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <p className="mb-4 type-label text-[#d4af37]">How It Works</p>
          <h2 className="type-section text-white">Your Path to Partnership</h2>
          <p className="body-stitch mt-5 text-white/70">
            From application to your first campaign — a seamless journey designed for creators who
            love luxury aesthetics.
          </p>
        </motion.div>

        <div className="mb-16 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
          {PERKS.map((perk, i) => (
            <motion.div
              key={perk.label}
              className="rounded-xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-sm sm:p-6"
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: EASE }}
            >
              <span className="text-2xl sm:text-3xl" aria-hidden="true">
                {perk.icon}
              </span>
              <p className="mt-3 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[#f7ead0]">
                {perk.label}
              </p>
              <p className="mt-1.5 text-[0.78rem] leading-snug text-white/60">{perk.detail}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((item, i) => (
            <motion.div
              key={item.step}
              className="relative rounded-2xl border border-white/10 bg-[#2a0718]/60 p-6 backdrop-blur-sm"
              initial={reduceMotion ? false : { opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.55, ease: EASE }}
            >
              <span className="text-[2.5rem] font-light leading-none text-[#d4af37]/30">{item.step}</span>
              <h3 className="mt-3 text-lg font-medium text-[#f7ead0]">{item.title}</h3>
              <p className="mt-2 text-[0.84rem] leading-relaxed text-white/65">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
