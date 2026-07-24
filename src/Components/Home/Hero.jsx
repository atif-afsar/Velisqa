import { useCallback, useEffect, useMemo, useState } from "react";

const SLIDE_INTERVAL_MS = 3000;
const CROSSFADE_MS = 1100;
const CROSSFADE_EASE = "cubic-bezier(0.33, 0, 0.2, 1)";

import heroPrimary from "../../assets/hero/image.webp";
import heroSecondary from "../../assets/hero/image2.webp";
import heroTertiary from "../../assets/hero/image3.webp";
import heroQuaternary from "../../assets/hero/image4.webp";
import heroQuinary from "../../assets/hero/image5.webp";

const HERO_SLIDES = [
  {
    src: heroPrimary,
    alt: "Velisqa Jewellery — gold knot cuff bracelet with pavé accents on velvet",
  },
  {
    src: heroSecondary,
    alt: "Velisqa Jewellery — polished silver hoop earrings on a ceramic tray",
  },
  {
    src: heroTertiary,
    alt: "Velisqa Jewellery — gold diamond pendant necklace and matching stud earrings",
  },
  {
    src: heroQuaternary,
    alt: "Velisqa Jewellery — silver necklace with rose quartz pendant on silk",
  },
  {
    src: heroQuinary,
    alt: "Velisqa Jewellery — emerald-cut solitaire ring in rose gold on velvet",
  },
];

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function HeroArrow({ direction, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="absolute top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#130006] shadow-[0_2px_12px_rgba(0,0,0,0.12)] transition hover:bg-white md:grid"
      style={direction === "prev" ? { left: "clamp(0.75rem, 2vw, 1.5rem)" } : { right: "clamp(0.75rem, 2vw, 1.5rem)" }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d={direction === "prev" ? "m14 6-6 6 6 6" : "m10 6 6 6-6 6"}
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export default function Hero() {
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(prefersReducedMotion);
  const fadeMs = reduceMotion ? 0 : CROSSFADE_MS;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const visibleSlideIndices = useMemo(() => {
    if (HERO_SLIDES.length <= 1) return [0];
    const prev = (index - 1 + HERO_SLIDES.length) % HERO_SLIDES.length;
    return [prev, index];
  }, [index]);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % HERO_SLIDES.length);
  }, []);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, []);

  useEffect(() => {
    HERO_SLIDES.forEach((slide) => {
      const preload = new Image();
      preload.src = slide.src;
    });
  }, []);

  useEffect(() => {
    if (reduceMotion || HERO_SLIDES.length < 2) return undefined;

    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, SLIDE_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const activeSlide = HERO_SLIDES[index] ?? HERO_SLIDES[0];
  const slideClassName =
    "absolute left-0 top-0 block h-auto w-full max-w-none [backface-visibility:hidden] [transform:translateZ(0)]";

  return (
    <section
      className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 overflow-hidden leading-[0]"
      style={{ marginTop: "calc(var(--nav-height) + env(safe-area-inset-top, 0px))" }}
      aria-label="Featured jewellery"
    >
      <h1 className="sr-only">Velisqa Jewellery — Crafted to Captivate</h1>

      <div className="relative w-full">
        {/* Reserves exact banner height from the active slide’s native aspect ratio. */}
        <img
          src={activeSlide.src}
          alt=""
          aria-hidden
          width={1024}
          height={406}
          draggable={false}
          className="pointer-events-none block h-auto w-full max-w-none select-none opacity-0"
        />

        <div className="absolute inset-0">
          {HERO_SLIDES.map((slide, i) => {
            if (!visibleSlideIndices.includes(i)) return null;

            const isActive = i === index;
            const isLcp = i === 0;
            return (
              <img
                key={slide.src}
                src={slide.src}
                alt={isActive ? slide.alt : ""}
                aria-hidden={!isActive}
                width={1024}
                height={406}
                loading={isLcp ? "eager" : "lazy"}
                fetchPriority={isActive && isLcp ? "high" : "low"}
                decoding="async"
                draggable={false}
                sizes="100vw"
                className={slideClassName}
                style={{
                  opacity: isActive ? 1 : 0,
                  zIndex: isActive ? 2 : 1,
                  transition: fadeMs ? `opacity ${fadeMs}ms ${CROSSFADE_EASE}` : "none",
                }}
              />
            );
          })}

          {HERO_SLIDES.length > 1 && (
            <>
              <HeroArrow direction="prev" onClick={goPrev} label="Previous hero slide" />
              <HeroArrow direction="next" onClick={goNext} label="Next hero slide" />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
