import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import SilkCorners from "./SilkCorners";

import heroMain from "../../assets/hero/image.png";
import hero0 from "../../assets/hero/image0.png";
import hero1 from "../../assets/hero/image1.png";
import hero2 from "../../assets/hero/image2.png";
import hero3 from "../../assets/hero/image3.png";
import hero4 from "../../assets/hero/image4.png";
import hero5 from "../../assets/hero/image5.png";

const images = [heroMain, hero0, hero1, hero2, hero3, hero4, hero5];

export default function Hero() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-12 text-center text-white">
      <div className="absolute inset-0 h-full w-full">
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={i === index ? "Hero background" : ""}
            aria-hidden={i === index ? "false" : "true"}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>

      <div className="absolute inset-0 bg-[#3d0a21]/10" />
      <SilkCorners />
      <motion.div
        className="relative z-10 mx-auto max-w-4xl space-y-8"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9 }}
      >
        <h1 className="font-serif text-5xl font-semibold uppercase leading-tight tracking-[-0.02em] text-[white] md:text-7xl">
          VELISQA JEWELLERY
        </h1>
        <p className="text-sm font-semibold uppercase tracking-[0.45em] text-[#d4af37]/80">Crafted to Captivate</p>
        <p className="mx-auto max-w-xl text-sm leading-7 text-white/90">
          Designed for modern femininity. Fine jewellery for those who need no introduction.
        </p>
        <Link to="/collections" className="inline-block bg-white px-10 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#3d0a21] shadow-xl transition hover:bg-[#d4af37] hover:text-white">
          View Collection
        </Link>
      </motion.div>
    </section>
  );
}
