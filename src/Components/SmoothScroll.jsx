import Lenis from "lenis";
import { useEffect } from "react";
import { setLenis } from "../lib/smoothScrollState";

/** Premium ease — soft deceleration, no harsh stop */
const LUXURY_EASE = (t) => 1 - (1 - t) ** 4;

export default function SmoothScroll() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return undefined;

    const lenis = new Lenis({
      lerp: 0.055,
      smoothWheel: true,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.05,
      syncTouch: true,
      syncTouchLerp: 0.07,
      autoRaf: true,
      anchors: {
        offset: 88,
        duration: 1.35,
        easing: LUXURY_EASE,
      },
    });

    setLenis(lenis);

    const onScroll = () => {
      window.dispatchEvent(new CustomEvent("velisqa:scroll"));
    };
    lenis.on("scroll", onScroll);

    return () => {
      lenis.off("scroll", onScroll);
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  return null;
}
