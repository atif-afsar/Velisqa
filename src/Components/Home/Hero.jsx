import { useEffect, useMemo, useState } from "react";

/** Time between slide changes (ms) — lower = faster rotation */
const SLIDE_INTERVAL_MS = 2000;
/** Crossfade length (ms) — long + soft ease = smooth; keep under ~40% of interval */
const CROSSFADE_MS = 1100;
const CROSSFADE_EASE = "cubic-bezier(0.33, 0, 0.2, 1)";

/** LCP image — explicit import so only one hero asset blocks first paint */
import heroLcp from "../../assets/hero/image.webp";

const slideModules = import.meta.glob("../../assets/hero/*.webp");

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function Hero() {
  const [index, setIndex] = useState(0);
  const [slides, setSlides] = useState([heroLcp]);
  const [reduceMotion, setReduceMotion] = useState(prefersReducedMotion);
  const fadeMs = reduceMotion ? 0 : CROSSFADE_MS;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadRest = async () => {
      const keys = Object.keys(slideModules).sort();
      const urls = await Promise.all(
        keys.map((key) => slideModules[key]().then((mod) => mod.default)),
      );
      if (cancelled) return;
      setSlides([...new Set(urls)]);
    };

    const schedule =
      "requestIdleCallback" in window
        ? (cb) => requestIdleCallback(cb, { timeout: 5000 })
        : (cb) => window.setTimeout(cb, 1500);

    const id = schedule(() => {
      void loadRest();
    });

    return () => {
      cancelled = true;
      if (typeof id === "number" && !("requestIdleCallback" in window)) {
        window.clearTimeout(id);
      } else if (typeof cancelIdleCallback === "function") {
        cancelIdleCallback(id);
      }
    };
  }, []);

  const images = slides;
  const visibleSlideIndices = useMemo(() => {
    if (images.length <= 1) return [0];
    const prev = (index - 1 + images.length) % images.length;
    return [prev, index];
  }, [index, images.length]);

  useEffect(() => {
    if (images.length === 0) return undefined;
    const next = (index + 1) % images.length;
    const preload = new Image();
    preload.src = images[next];
    return undefined;
  }, [index, images]);

  useEffect(() => {
    if (reduceMotion || images.length < 2) return undefined;

    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, SLIDE_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [reduceMotion, images.length]);

  return (
    <section className="relative flex min-h-svh items-center justify-center overflow-hidden px-4 py-20 text-center text-white md:px-6 md:py-24">
      <div className="absolute inset-0 isolate overflow-hidden bg-[#130006]">
        {images.map((src, i) => {
          if (!visibleSlideIndices.includes(i)) return null;

          const isActive = i === index;
          const isLcp = src === heroLcp || i === 0;
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
              loading={isLcp ? "eager" : "lazy"}
              fetchPriority={isActive && isLcp ? "high" : "low"}
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

      <div
        className="hero-overlay-fade absolute inset-0 bg-[#130006]/40"
        aria-hidden
      />
      <div
        className="hero-gradient-fade absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(19,0,6,0.85), rgba(19,0,6,0.25) 35%, transparent 70%)",
        }}
        aria-hidden
      />
      <div className="relative z-30 mx-auto flex max-w-4xl flex-col items-center gap-3 px-2 sm:gap-4">
        <h1 className="type-hero hero-title-rise mx-auto max-w-full text-reveal uppercase text-white luxury-text-shadow">
          Velisqa Jewellery
        </h1>

        <div className="hero-tagline-divider hero-divider-rise" aria-hidden />

        <p className="type-label hero-tagline-rise bg-gradient-to-r from-[#e8c96a] via-[#d4af37] to-[#b8942e] bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(212,175,55,0.35)]">
          Crafted to Captivate
        </p>
      </div>
    </section>
  );
}
