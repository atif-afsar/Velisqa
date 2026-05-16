import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import WhatsAppCTA from "../WhatsApp/WhatsAppCTA";

// Dynamically import all hero images in the folder so new files render automatically
// Use the portable form supported by Vite: import.meta.glob with { eager: true }
const modules = import.meta.glob('../../assets/hero/*.png', { eager: true });
const images = Object.keys(modules)
  .sort()
  .map((k) => modules[k].default);

export default function Hero() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative flex min-h-[calc(100svh-68px)] items-center justify-center overflow-hidden px-4 py-20 text-center text-white md:min-h-[calc(100vh-84px)] md:px-6 md:py-24">
      <div className="absolute inset-0 h-full w-full">
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={i === index ? "Hero background" : ""}
            aria-hidden={i === index ? "false" : "true"}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-1000 sm:object-[center_45%] ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>

      <div className="absolute inset-0 bg-[#130006]/40" />
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to top, rgba(19,0,6,0.85), rgba(19,0,6,0.25) 35%, transparent 70%)',
        }}
      />
      <motion.div
        className="relative z-30 mx-auto max-w-4xl space-y-8"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9 }}
      >
        <h1 className="type-hero mx-auto max-w-full text-reveal uppercase text-white luxury-text-shadow">
          <span className="block">VELISQA</span>
          <span className="block">JEWELLERY</span>
        </h1>
        <p className="type-label text-reveal-delay text-[#d4af37] drop-shadow-sm">Crafted to Captivate</p>
        <div className="mx-auto flex flex-col items-center justify-center gap-4">
          <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4">
            <WhatsAppCTA intent="consult" className="w-full px-5 py-4 text-sm sm:w-auto sm:px-8">
              Book Consultation
            </WhatsAppCTA>
            <Link to="/collections" className="tap-target inline-flex w-full items-center justify-center gap-3 rounded-full bg-white/95 px-6 py-4 type-button text-[#130006] shadow-lg transition hover:bg-[#e9e1d6] sm:w-auto sm:py-3">
              Explore Collection
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
