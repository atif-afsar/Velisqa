import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import WhatsAppCTA from "../WhatsApp/WhatsAppCTA";

const modules = import.meta.glob("../../assets/hero/*.webp", { eager: true });
const images = Object.keys(modules)
  .sort()
  .map((k) => modules[k].default);

const SLIDE_MS = 5500;

export default function Hero() {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();

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
        className="relative z-30 mx-auto max-w-4xl space-y-8"
        initial={reduceMotion ? false : { opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="type-hero mx-auto max-w-full text-reveal uppercase text-white luxury-text-shadow">
          Velisqa Jewellery
        </h1>
        <p className="type-label text-reveal-delay text-[#d4af37] drop-shadow-sm">Crafted to Captivate</p>
        <motion.div
          className="mx-auto flex flex-col items-center justify-center gap-4"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4"
            whileHover={reduceMotion ? undefined : "hover"}
            variants={{ hover: { transition: { staggerChildren: 0.04 } } }}
          >
            <WhatsAppCTA intent="consult" className="w-full px-5 py-4 text-sm sm:w-auto sm:px-8">
              Book Consultation
            </WhatsAppCTA>
            <Link
              to="/collections"
              className="tap-target inline-flex w-full items-center justify-center gap-3 rounded-full bg-white/95 px-6 py-4 type-button text-[#130006] shadow-lg transition-[background-color,transform,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-[#e9e1d6] hover:shadow-xl sm:w-auto sm:py-3"
            >
              Explore Collection
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
