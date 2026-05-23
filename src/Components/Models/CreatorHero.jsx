import { motion, useReducedMotion } from "framer-motion";
import heroImage from "../../assets/creator-program-hero.png";

const EASE = [0.16, 1, 0.3, 1];

export default function CreatorHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative min-h-[480px] overflow-hidden md:min-h-[560px]">
      <motion.img
        src={heroImage}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-[center_35%] sm:object-center"
        initial={reduceMotion ? false : { scale: 1.04 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.4, ease: EASE }}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        draggable={false}
      />

      {/* Brand scrim — keeps illustration visible while anchoring text contrast */}
      <motion.div
        className="absolute inset-0 bg-[#130006]/45"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, ease: EASE }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(19,0,6,0.78) 0%, rgba(19,0,6,0.52) 42%, rgba(19,0,6,0.62) 100%)",
        }}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, ease: EASE }}
      />

      <motion.div
        className="container-stitch relative z-10 flex min-h-[480px] flex-col items-center justify-center py-20 text-center md:min-h-[560px] md:py-32"
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        <motion.div
          className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[#130006]/25 px-6 py-10 shadow-[0_24px_64px_rgba(19,0,6,0.28)] backdrop-blur-md sm:px-10 sm:py-12"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7, ease: EASE }}
        >
          <p className="mb-5 type-label text-[#d4af37] drop-shadow-[0_1px_8px_rgba(19,0,6,0.45)]">
            Creator Program
          </p>
          <h1 className="type-display text-white drop-shadow-[0_2px_20px_rgba(19,0,6,0.55)]">
            Create. Share.
            <span className="block italic text-[#f7ead0]">Get Rewarded.</span>
          </h1>
          <p className="body-stitch mx-auto mt-7 max-w-2xl text-white/90 drop-shadow-[0_1px_12px_rgba(19,0,6,0.5)]">
            Join the VELISQA creator community. Make stunning UGC videos showcasing our jewellery,
            earn exclusive freebies, discounts, and grow with a luxury brand that celebrates your craft.
          </p>
          <motion.div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <a
              href="#register"
              className="tap-target inline-flex min-h-[48px] w-full max-w-xs items-center justify-center rounded-full bg-[#d4af37] px-8 py-3.5 label-stitch text-[0.72rem] uppercase tracking-[0.16em] text-[#130006] shadow-[0_8px_24px_rgba(212,175,55,0.35)] transition hover:bg-[#e9c349] sm:w-auto"
            >
              Apply Now
            </a>
            <a
              href="#tiers"
              className="tap-target inline-flex min-h-[48px] w-full max-w-xs items-center justify-center rounded-full border border-white/40 bg-white/10 px-8 py-3.5 label-stitch text-[0.72rem] uppercase tracking-[0.16em] text-white backdrop-blur-sm transition hover:border-white/70 hover:bg-white/15 sm:w-auto"
            >
              View Tiers
            </a>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
