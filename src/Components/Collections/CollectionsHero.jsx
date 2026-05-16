import { motion } from "framer-motion";
import hero from "../../assets/collection-hero.png";

export default function CollectionsHero() {
  return (
    <section id="top" className="relative mb-32 flex h-[819px] flex-col items-center justify-center overflow-hidden px-6 text-center md:px-20">
      <div className="absolute inset-0 z-0">
        <img className="h-full w-full object-cover opacity-90" alt="Luxury diamond necklace displayed on a white marble pedestal" src={hero} />
      </div>
      <motion.div
        className="relative z-10 space-y-6"
        initial={{ opacity: 0, y: 36 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      >
        <span className="type-label text-[#1c1c19]">The 2026 Collection</span>
        <h1 className="mx-auto max-w-4xl type-display text-[#130006]">
          Architectural Opulence
        </h1>
        <div className="pt-8">
          <a href="#signature" className="inline-block bg-[#130006] px-12 py-4 type-button text-[#ffe088] transition-all duration-300 hover:bg-[#6f334a]">
            Explore High Jewellery
          </a>
        </div>
      </motion.div>
    </section>
  );
}
