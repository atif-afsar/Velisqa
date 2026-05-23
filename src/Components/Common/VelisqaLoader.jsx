import { motion } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";

const SUFFIX = "ELISQA";
const BRAND_PLUM_SOFT = "rgba(77, 49, 72, 0.12)";

/**
 * Minimal luxury loader — centred “V” smoothly expands into VELISQA.
 * GSAP is loaded on demand so it does not inflate the initial JS bundle.
 */
export default function VelisqaLoader({
  fullScreen = false,
  onComplete,
}) {
  const rootRef = useRef(null);
  const wordRef = useRef(null);
  const vRef = useRef(null);
  const suffixRef = useRef(null);
  const glowRef = useRef(null);
  const gsapCtx = useRef(null);

  const wrapperClass = useMemo(
    () =>
      [
        "flex items-center justify-center bg-[#ffffff]",
        fullScreen
          ? "fixed inset-0 z-[9999] min-h-svh w-full"
          : "relative min-h-[240px] w-full",
      ].join(" "),
    [fullScreen],
  );

  useEffect(() => {
    const root = rootRef.current;
    const word = wordRef.current;
    const vLetter = vRef.current;
    const suffix = suffixRef.current;
    const glow = glowRef.current;

    if (!root || !word || !vLetter || !suffix) return undefined;

    let cancelled = false;

    async function run() {
      const { gsap } = await import("gsap");
      if (cancelled) return;

      gsap.set(word, { letterSpacing: "0.06em", force3D: true });
      gsap.set(vLetter, {
        opacity: 0,
        scale: 0.88,
        transformOrigin: "right center",
        force3D: true,
      });
      gsap.set(suffix, {
        opacity: 0,
        scaleX: 0,
        transformOrigin: "left center",
        force3D: true,
      });
      if (glow) {
        gsap.set(glow, { opacity: 0, scale: 0.92, transformOrigin: "center center", force3D: true });
      }

      gsapCtx.current = gsap.context(() => {
        const tl = gsap.timeline({
          defaults: { ease: "power3.out" },
          onComplete: () => onComplete?.(),
        });

        tl.to(vLetter, {
          opacity: 1,
          scale: 1,
          duration: 0.65,
          ease: "power4.out",
        })
          .to(
            glow,
            { opacity: 1, scale: 1, duration: 0.8, ease: "sine.out" },
            0.12,
          )
          .to(
            suffix,
            {
              scaleX: 1,
              opacity: 1,
              duration: 0.85,
              ease: "power2.inOut",
            },
            0.22,
          )
          .to(
            word,
            {
              letterSpacing: "0.3em",
              duration: 0.85,
              ease: "power2.inOut",
            },
            0.22,
          )
          .to({}, { duration: 0.2 });
      }, root);
    }

    run();

    return () => {
      cancelled = true;
      gsapCtx.current?.revert();
      gsapCtx.current = null;
    };
  }, [onComplete]);

  return (
    <motion.div
      ref={rootRef}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading VELISQA"
      className={wrapperClass}
      exit={{ opacity: 0, transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] } }}
    >
      <motion.div
        ref={glowRef}
        aria-hidden
        className="pointer-events-none absolute h-40 w-64 rounded-full opacity-0 will-change-transform sm:h-48 sm:w-80"
        style={{
          background: `radial-gradient(ellipse at center, ${BRAND_PLUM_SOFT} 0%, transparent 70%)`,
        }}
      />

      <p
        ref={wordRef}
        className="relative z-10 flex items-baseline justify-center px-6 text-[clamp(2.5rem,10vw,4.5rem)] font-medium leading-none text-[#4d3148] will-change-[letter-spacing]"
        style={{
          fontFamily: '"Playfair Display", "Cormorant Garamond", var(--font-luxury-serif), serif',
        }}
      >
        <span ref={vRef} className="inline-block will-change-transform">
          V
        </span>
        <span
          ref={suffixRef}
          className="inline-block origin-left overflow-hidden whitespace-nowrap will-change-transform"
          aria-hidden="true"
        >
          {SUFFIX}
        </span>
        <span className="sr-only">VELISQA</span>
      </p>
    </motion.div>
  );
}
