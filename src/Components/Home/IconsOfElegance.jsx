import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import Icon from "./Icon";
import { icons } from "./homeData";

const EASE = [0.16, 1, 0.3, 1];

const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: EASE },
  },
};

export default function IconsOfElegance() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-[#f9f5f0] py-16 md:py-24">
      <motion.div
        className="container-stitch"
        initial={reduceMotion ? false : "hidden"}
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={container}
      >
        <motion.div variants={item} className="mx-auto mb-10 max-w-3xl text-center sm:mb-12">
          <p className="mb-3 type-label text-[#847377]">Curated Selection</p>
          <h2 className="type-section text-[#130006]">Icons of Elegance</h2>
        </motion.div>
        <motion.div
          className="mx-auto grid max-w-[560px] grid-cols-2 gap-4 sm:max-w-none sm:gap-7 lg:grid-cols-4 lg:gap-6 xl:gap-8"
          variants={container}
        >
          {icons.map(([name, type, image]) => (
            <motion.article key={name} variants={item} className="group text-center">
              <Link
                to={`/collections?category=${type.toLowerCase()}#signature`}
                aria-label={`View ${name} in collections`}
                className="mb-6 block aspect-[4/5] overflow-hidden rounded-[1.4rem] bg-[#eee8df] shadow-[0_18px_48px_rgba(19,0,6,0.10)] transition-[transform,box-shadow] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover:-translate-y-1.5 group-hover:shadow-[0_28px_72px_rgba(19,0,6,0.16)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f9f5f0]"
              >
                <img
                  src={image}
                  alt={`${name} — Velisqa ${type.toLowerCase()} jewellery`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-[transform] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover:scale-[1.06]"
                />
              </Link>
              <h3 className="font-serif text-[clamp(1.55rem,3.8vw,2.1rem)] leading-tight text-[#130006]">
                {name}
              </h3>
              <p className="mt-1 type-label text-[#847377]">{type}</p>
            </motion.article>
          ))}
        </motion.div>
        <motion.div variants={item} className="mt-12 flex justify-center md:mt-14">
          <Link
            to="/collections"
            className="tap-target group inline-flex items-center justify-center gap-3 rounded-full bg-[#3d0a21] px-7 py-4 type-button text-[#f7ead0] shadow-[0_18px_42px_rgba(61,10,33,0.22)] transition-[transform,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-[#130006] hover:shadow-[0_24px_58px_rgba(61,10,33,0.32)] sm:px-9"
          >
            Explore Collections
            <Icon className="text-[18px] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1">
              arrow_forward
            </Icon>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
