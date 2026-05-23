import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

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

  const visibleSlideIndices = useMemo(() => {
    if (images.length <= 1) return [0];
    const prev = (index - 1 + images.length) % images.length;
    return [prev, index];
  }, [index]);

  useEffect(() => {
    if (images.length === 0) return undefined;
    const next = (index + 1) % images.length;
    const preload = new Image();
    preload.src = images[next];
    return undefined;
  }, [index]);

  useEffect(() => {
    if (reduceMotion || images.length < 2) return undefined;

    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, SLIDE_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [reduceMotion]);

  return (
    <section className="relative flex min-h-svh items-center justify-center overflow-hidden px-4 py-20 text-center text-white md:px-6 md:py-24">
      <div className="absolute inset-0 isolate overflow-hidden bg-[#130006]">
        {images.map((src, i) => {
          if (!visibleSlideIndices.includes(i)) return null;

          const isActive = i === index;
          return (
            <img
              key={src}
              src={src}
              alt={
                isActive
                  ? "Velisqa Jewellery — premium artificial necklaces, rings, bangles and earrings"
                  : ""
              }
              aria-hidden={!isActive}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={isActive && i === 0 ? "high" : "low"}
              decoding="async"
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover object-center [backface-visibility:hidden] [transform:translateZ(0)] sm:object-[center_45%]"
              style={{
                opacity: isActive ? 1 : 0,
                zIndex: isActive ? 2 : 1,
                transition: fadeMs ? `opacity ${fadeMs}ms ${CROSSFADE_EASE}` : "none",
              }}
            />
          );
        })}
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
