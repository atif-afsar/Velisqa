import { motion } from "framer-motion";
import { gsap } from "gsap";
import { useEffect, useMemo, useRef } from "react";

const SUFFIX = "ELISQA";
const BRAND_PLUM_SOFT = "rgba(77, 49, 72, 0.12)";

/**
 * Minimal luxury loader — centred “V” expands into VELISQA.
 *
 * @example
 * <VelisqaLoader fullScreen duration={1800} onComplete={() => setLoading(false)} />
 */
export default function VelisqaLoader({
  fullScreen = false,
  duration,
  onComplete,
}) {
  const rootRef = useRef(null);
  const wordRef = useRef(null);
  const vRef = useRef(null);
  const glowRef = useRef(null);
  const suffixLetterRefs = useRef([]);
  const gsapCtx = useRef(null);
  const completeTimeoutRef = useRef(null);

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
    const glow = glowRef.current;
    const letters = suffixLetterRefs.current.filter(Boolean);

    if (!root || !word || !vLetter || letters.length === 0) return undefined;

    const totalMs = duration ?? 1800;
    const revealSec = 0.55;
    const holdSec = 0.12;
    const fadeSec = 0.22;

    gsap.set(word, { letterSpacing: "0.12em", force3D: true });
    gsap.set(vLetter, { opacity: 0, scale: 0.9, force3D: true });
    gsap.set(letters, { opacity: 0, x: -10, force3D: true });
    if (glow) gsap.set(glow, { opacity: 0, scale: 0.95 });

    gsapCtx.current = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "power2.out" },
        onComplete: () => {
          if (duration == null && onComplete) onComplete();
        },
      });

      tl.to(vLetter, { opacity: 1, scale: 1, duration: revealSec * 0.45 })
        .to(
          glow,
          { opacity: 1, scale: 1, duration: revealSec * 0.4, ease: "sine.out" },
          0,
        )
        .to(
          letters,
          {
            opacity: 1,
            x: 0,
            duration: revealSec * 0.35,
            stagger: 0.04,
          },
          `-=${revealSec * 0.2}`,
        )
        .to(
          word,
          { letterSpacing: "0.32em", duration: revealSec * 0.35, ease: "power2.inOut" },
          `-=${revealSec * 0.15}`,
        )
        .to({}, { duration: holdSec })
        .to(root, { opacity: 0, duration: fadeSec, ease: "power2.in" });
    }, root);

    if (onComplete) {
      completeTimeoutRef.current = window.setTimeout(onComplete, totalMs);
    }

    return () => {
      gsapCtx.current?.revert();
      gsapCtx.current = null;
      if (completeTimeoutRef.current) {
        clearTimeout(completeTimeoutRef.current);
        completeTimeoutRef.current = null;
      }
    };
  }, [duration, onComplete]);

  return (
    <motion.div
      ref={rootRef}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading VELISQA"
      className={wrapperClass}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        ref={glowRef}
        aria-hidden
        className="pointer-events-none absolute h-40 w-64 rounded-full opacity-0 sm:h-48 sm:w-80"
        style={{
          background: `radial-gradient(ellipse at center, ${BRAND_PLUM_SOFT} 0%, transparent 70%)`,
        }}
      />

      <p
        ref={wordRef}
        className="relative z-10 flex items-baseline justify-center px-6 text-[clamp(2.5rem,10vw,4.5rem)] font-medium leading-none text-[#4d3148]"
        style={{
          fontFamily: '"Playfair Display", "Cormorant Garamond", var(--font-luxury-serif), serif',
        }}
      >
        <span ref={vRef} className="inline-block" aria-hidden="false">
          V
        </span>
        <span className="inline-flex overflow-visible" aria-hidden="true">
          {SUFFIX.split("").map((char, index) => (
            <span
              key={`${char}-${index}`}
              ref={(el) => {
                suffixLetterRefs.current[index] = el;
              }}
              className="inline-block"
            >
              {char}
            </span>
          ))}
        </span>
        <span className="sr-only">VELISQA</span>
      </p>
    </motion.div>
  );
}
