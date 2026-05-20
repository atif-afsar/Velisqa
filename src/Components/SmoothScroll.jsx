import { useEffect } from "react";
import {
  cleanupLenisDom,
  COARSE_POINTER_MQ,
  isTouchViewport,
  prefersNativeScroll,
  setLenis,
  TOUCH_VIEW_MQ,
} from "../lib/smoothScrollState";

/** Premium ease — soft deceleration, no harsh stop */
const LUXURY_EASE = (t) => 1 - (1 - t) ** 4;

function dispatchVelisqaScroll() {
  window.dispatchEvent(new CustomEvent("velisqa:scroll"));
}

function buildLenisOptions() {
  const touchView = isTouchViewport();

  const anchors = {
    offset: 88,
    duration: touchView ? 1.05 : 1.35,
    easing: LUXURY_EASE,
  };

  if (touchView) {
    return {
      lerp: 0.095,
      smoothWheel: true,
      syncTouch: true,
      syncTouchLerp: 0.11,
      touchMultiplier: 1.05,
      touchInertiaExponent: 1.8,
      autoRaf: true,
      anchors,
    };
  }

  return {
    lerp: 0.075,
    smoothWheel: true,
    wheelMultiplier: 0.88,
    syncTouch: false,
    autoRaf: true,
    anchors,
  };
}

export default function SmoothScroll() {
  useEffect(() => {
    const reducedMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const touchViewMq = window.matchMedia(TOUCH_VIEW_MQ);

    let lenis = null;
    let rafId = 0;
    let cancelled = false;

    const emitScroll = () => dispatchVelisqaScroll();

    const enableNativeScroll = () => {
      window.removeEventListener("scroll", emitScroll);

      if (lenis) {
        lenis.off("scroll", emitScroll);
        lenis.destroy();
        lenis = null;
        setLenis(null);
      }

      cleanupLenisDom();
      window.addEventListener("scroll", emitScroll, { passive: true });
      emitScroll();
    };

    const enableLenis = async () => {
      window.removeEventListener("scroll", emitScroll);

      if (lenis) {
        lenis.off("scroll", emitScroll);
        lenis.destroy();
        lenis = null;
        setLenis(null);
      }

      cleanupLenisDom();

      const { default: Lenis } = await import("lenis");
      if (cancelled || prefersNativeScroll()) return;

      lenis = new Lenis(buildLenisOptions());

      setLenis(lenis);
      lenis.on("scroll", emitScroll);
      emitScroll();
    };

    const syncMode = () => {
      if (prefersNativeScroll()) {
        enableNativeScroll();
      } else {
        enableLenis();
      }
    };

    const onMqChange = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(syncMode);
    };

    syncMode();
    reducedMotionMq.addEventListener("change", onMqChange);
    touchViewMq.addEventListener("change", onMqChange);
    const coarsePointerMq = window.matchMedia(COARSE_POINTER_MQ);
    coarsePointerMq.addEventListener("change", onMqChange);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      reducedMotionMq.removeEventListener("change", onMqChange);
      touchViewMq.removeEventListener("change", onMqChange);
      coarsePointerMq.removeEventListener("change", onMqChange);
      window.removeEventListener("scroll", emitScroll);
      if (lenis) {
        lenis.off("scroll", emitScroll);
        lenis.destroy();
        setLenis(null);
      }
      cleanupLenisDom();
    };
  }, []);

  return null;
}
