import { motion } from "framer-motion";
import hero from "../../assets/collection-hero.png";

export default function CollectionsHero() {
  return (
    <section id="top" className="relative mb-20 flex min-h-[calc(100svh-68px)] flex-col items-center justify-center overflow-hidden px-4 py-20 text-center md:mb-32 md:min-h-[720px] md:px-20">
      <div className="absolute inset-0 z-0">
        <img className="h-full w-full object-cover object-center opacity-90" alt="Luxury diamond necklace displayed on a white marble pedestal" src={hero} decoding="async" />
      </div>
      <motion.div
        className="relative z-10 space-y-6"
        initial={{ opacity: 0, y: 36 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      >
        <span className="type-label text-[#1c1c19]">The 2026 Collection</span>
        <h1 className="mx-auto max-w-[22rem] type-display text-[#130006] sm:max-w-4xl">
          Architectural Opulence
        </h1>
        <div className="pt-8">
          <a href="#signature" className="tap-target inline-flex items-center justify-center bg-[#130006] px-8 py-4 type-button text-[#ffe088] transition-all duration-300 hover:bg-[#6f334a] sm:px-12">
            Explore High Jewellery
          </a>
        </div>
      </motion.div>
    </section>
  );
}
