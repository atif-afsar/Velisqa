import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import Icon from "./Icon";
import { icons } from "./homeData";
import { getCategoryParamSlug } from "../../lib/productCategories";

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

function formatInr(amount) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

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
          className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:gap-x-10 sm:gap-y-10 sm:overflow-visible sm:px-0 lg:gap-x-14 [&::-webkit-scrollbar]:hidden"
          variants={container}
        >
          {icons.map(({ name, type, image, startingAt }) => (
            <motion.article
              key={name}
              variants={item}
              className="group flex w-[8.5rem] shrink-0 snap-center flex-col items-center text-center sm:w-44 lg:w-48"
            >
              <Link
                to={{
                  pathname: "/",
                  search: `?category=${getCategoryParamSlug(type)}`,
                  hash: "#home-shop",
                }}
                aria-label={`${type} starting at ${formatInr(startingAt)} — view ${name} in collections`}
                className="block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f9f5f0]"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-full bg-[#130006]/8 shadow-[0_18px_44px_rgba(19,0,6,0.16)] ring-1 ring-[#130006]/10 transition-[transform,box-shadow] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover:-translate-y-1.5 group-hover:shadow-[0_28px_64px_rgba(19,0,6,0.26)]">
                  <img
                    src={image}
                    alt={`${name} — Velisqa ${type.toLowerCase()} jewellery`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover:scale-[1.08]"
                  />
                  <div
                    className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/10"
                    aria-hidden
                  />
                </div>
              </Link>
              <h3 className="mt-4 font-serif text-[clamp(1.15rem,4vw,1.45rem)] leading-tight text-[#130006] sm:mt-5">
                {type}
              </h3>
              <p className="mt-1 type-price text-[10px] font-medium tracking-[0.14em] text-[#847377] sm:text-[11px]">
                Starting at {formatInr(startingAt)}
              </p>
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
