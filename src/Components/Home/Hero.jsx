import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import Icon from "./Icon";
import { buildWhatsAppMessage, createWhatsAppLink } from "../WhatsApp/whatsapp";

const EASE = [0.16, 1, 0.3, 1];

const ctaStack = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.14, delayChildren: 0.52 },
  },
};

const ctaItem = {
  hidden: { opacity: 0, y: 22, scale: 0.94 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: EASE },
  },
};

const modules = import.meta.glob("../../assets/hero/*.webp", { eager: true });
const images = Object.keys(modules)
  .sort()
  .map((k) => modules[k].default);

const SLIDE_MS = 5500;

export default function Hero() {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const consultHref = useMemo(
    () => createWhatsAppLink(buildWhatsAppMessage({ intent: "consult" })),
    [],
  );

  useEffect(() => {
    if (reduceMotion || images.length < 2) return undefined;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, SLIDE_MS);
    return () => clearInterval(id);
  }, [reduceMotion]);

  return (
    <section className="relative flex min-h-svh items-center justify-center overflow-hidden px-4 py-20 text-center text-white md:px-6 md:py-24">
      <motion.div
        className="absolute inset-0 h-full w-full"
        initial={reduceMotion ? false : { scale: 1.03 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
      >
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
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover object-center will-change-[opacity,transform] transition-[opacity,transform] ease-[cubic-bezier(0.4,0,0.2,1)] sm:object-[center_45%] ${
              i === index
                ? "scale-100 opacity-100 duration-[1600ms]"
                : "scale-[1.04] opacity-0 duration-[1600ms]"
            }`}
          />
        ))}
      </motion.div>

      <motion.div
        className="absolute inset-0 bg-[#130006]/40"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(19,0,6,0.85), rgba(19,0,6,0.25) 35%, transparent 70%)",
        }}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="relative z-30 mx-auto max-w-4xl space-y-5 sm:space-y-8"
        initial={reduceMotion ? false : { opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="type-hero mx-auto max-w-full text-reveal uppercase text-white luxury-text-shadow">
          Velisqa Jewellery
        </h1>
        <p className="type-label text-reveal-delay text-[#d4af37] drop-shadow-sm">Crafted to Captivate</p>
        <motion.div
          className="mx-auto flex w-full flex-col items-center"
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
          variants={ctaStack}
        >
          <motion.a
            href={consultHref}
            target="_blank"
            rel="noreferrer"
            variants={ctaItem}
            whileHover={reduceMotion ? undefined : { y: -3, scale: 1.02 }}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            title="Book a private consultation"
            className="tap-target group relative flex !h-9 !min-h-0 w-full max-w-[14.5rem] items-center justify-center gap-2 overflow-hidden rounded-full border border-[#d4af37]/45 bg-gradient-to-b from-[#4a1528] via-[#3d0a21] to-[#2a0712] px-6 py-0 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[#f7ead0] shadow-[0_10px_28px_rgba(19,0,6,0.4)] ring-1 ring-[#d4af37]/20 transition-shadow duration-500 hover:shadow-[0_14px_36px_rgba(212,175,55,0.2)] sm:!h-10 sm:max-w-[16rem] sm:px-7 sm:text-[0.65rem]"
          >
            {!reduceMotion && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-[#d4af37]/20 to-transparent"
                initial={{ x: "-120%" }}
                animate={{ x: "120%" }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "linear", repeatDelay: 2.2 }}
              />
            )}
            <svg
              className="relative z-10 h-3 w-3 shrink-0 text-[#d4af37] transition-transform duration-500 group-hover:scale-110"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M17.5 14.5c-.4-.2-2.4-1.2-2.8-1.3-.4-.1-.6-.2-.8.2-.2.4-.8 1.3-1 1.6-.2.3-.4.3-.8.1-.4-.2-1.6-.6-3-1.9-1.1-1-1.8-2.3-2-2.7-.2-.4 0-.6.2-.8.2-.2.4-.6.6-1 .2-.4.1-.7 0-.9-.1-.2-.8-1.9-1.1-2.6-.3-.7-.6-.6-.8-.6-.2 0-.4 0-.7 0-.3 0-.9.1-1.3.6-.4.5-1.5 1.5-1.5 3.6 0 2.1 1.5 4.2 1.7 4.5.2.3 2.8 4.4 6.9 6.1 4.1 1.7 4.1 1.1 4.9 1 0 0 1.5-.6 2.1-1.4.6-.8 1.3-1.9 1.4-3.1.1-1.2-.8-1.8-1.2-2z"
                fill="currentColor"
              />
            </svg>
            <span className="relative z-10">Consultation</span>
          </motion.a>

          <motion.div variants={ctaItem} className="mt-2 w-full max-w-[14.5rem] sm:max-w-[16rem]">
            <motion.div
              whileHover={reduceMotion ? undefined : { y: -3, scale: 1.02 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            >
              <Link
                to="/collections"
                className="tap-target group relative flex !h-9 !min-h-0 w-full items-center justify-center gap-2 overflow-hidden rounded-full border border-white/35 bg-white/10 px-6 py-0 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-500 hover:border-white/55 hover:bg-white/18 hover:shadow-[0_12px_32px_rgba(255,255,255,0.1)] sm:!h-10 sm:px-7 sm:text-[0.65rem]"
              >
                <span>Explore</span>
                <Icon className="text-[14px] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5">
                  arrow_forward
                </Icon>
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
