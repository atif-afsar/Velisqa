import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

const EASE = [0.16, 1, 0.3, 1];

/** Time between slide changes (ms) — lower = faster rotation */
const SLIDE_INTERVAL_MS = 2000;
/** Crossfade length (ms) — long + soft ease = smooth; keep under ~40% of interval */
const CROSSFADE_MS = 1100;
const CROSSFADE_EASE = "cubic-bezier(0.33, 0, 0.2, 1)";

const modules = import.meta.glob("../../assets/hero/*.webp", { eager: true });
const images = Object.keys(modules)
  .sort()
  .map((k) => modules[k].default);

export default function Hero() {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const fadeMs = reduceMotion ? 0 : CROSSFADE_MS;

  useEffect(() => {
    images.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    if (reduceMotion || images.length < 2) return undefined;

    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, SLIDE_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [reduceMotion, images.length, SLIDE_INTERVAL_MS]);

  return (
    <section className="relative flex min-h-svh items-center justify-center overflow-hidden px-4 py-20 text-center text-white md:px-6 md:py-24">
      <div className="absolute inset-0 isolate overflow-hidden bg-[#130006]">
        {images.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={
              i === index
                ? "Velisqa Jewellery — premium artificial necklaces, rings, bangles and earrings"
                : ""
            }
            aria-hidden={i !== index}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "low"}
            decoding="async"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover object-center [backface-visibility:hidden] [transform:translateZ(0)] sm:object-[center_45%]"
            style={{
              opacity: i === index ? 1 : 0,
              zIndex: i === index ? 2 : 1,
              willChange: fadeMs ? "opacity" : undefined,
              transition: fadeMs ? `opacity ${fadeMs}ms ${CROSSFADE_EASE}` : "none",
            }}
          />
        ))}
      </div>

      <motion.div
        className="absolute inset-0 bg-[#130006]/40"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: EASE }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(19,0,6,0.85), rgba(19,0,6,0.25) 35%, transparent 70%)",
        }}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, delay: 0.1, ease: EASE }}
      />
      <div className="relative z-30 mx-auto flex max-w-4xl flex-col items-center gap-3 px-2 sm:gap-4">
        <motion.h1
          className="type-hero mx-auto max-w-full text-reveal uppercase text-white luxury-text-shadow"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.2, ease: EASE }}
        >
          Velisqa Jewellery
        </motion.h1>

        <motion.div
          className="hero-tagline-divider"
          aria-hidden
          initial={reduceMotion ? false : { scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.45, ease: EASE }}
        />

        <motion.p
          className="type-label text-reveal-delay bg-gradient-to-r from-[#e8c96a] via-[#d4af37] to-[#b8942e] bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(212,175,55,0.35)]"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.55, ease: EASE }}
        >
          Crafted to Captivate
        </motion.p>
      </div>
    </section>
  );
}
