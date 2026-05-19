import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import WhatsAppCTA from "../WhatsApp/WhatsAppCTA";
import Icon from "./Icon";

const bestSellerModules = import.meta.glob("../../assets/BestSeller/*.png", {
  eager: true,
});

const products = Object.entries(bestSellerModules)
  .sort(([a], [b]) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
  )
  .map(([path, module], index) => ({
    id: path,
    image: module.default,
    name: `Velisqa Signature ${index + 1}`,
    tag: index === 0 ? "Bestseller" : index < 3 ? "Most Loved" : "Signature Edit",
  }));

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] },
  }),
};

function ProductCard({ product, className = "", layout = "standard", index = 0 }) {
  const reduceMotion = useReducedMotion();
  const isFeatured = layout === "featured";

  return (
    <motion.article
      custom={index}
      variants={fadeUp}
      initial={reduceMotion ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      className={`group relative overflow-hidden ${className}`}
    >
      <div
        className={`relative h-full w-full overflow-hidden bg-[#f1ede8] ${
          isFeatured
            ? "rounded-[1.75rem] shadow-[0_28px_80px_rgba(19,0,6,0.14)]"
            : "rounded-[1.25rem] shadow-[0_18px_48px_rgba(19,0,6,0.10)]"
        } ring-1 ring-[#d4af37]/10 transition duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_26px_64px_rgba(61,10,33,0.18)] group-hover:ring-[#d4af37]/30`}
      >
        <img
          src={product.image}
          alt={`${product.name} — VELISQA best seller`}
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04] ${
            isFeatured ? "min-h-[320px] sm:min-h-[420px] lg:min-h-full" : "aspect-[4/5]"
          }`}
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#130006]/72 via-[#130006]/12 to-transparent opacity-80 transition duration-500 group-hover:opacity-95"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <span className="mb-2 inline-block rounded-full border border-[#d4af37]/35 bg-[#3d0a21]/55 px-2.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.22em] text-[#f7ead0] backdrop-blur-sm sm:text-[10px]">
            {product.tag}
          </span>
          <h3
            className={`font-serif leading-tight text-[#fdf9f4] ${
              isFeatured ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl"
            }`}
          >
            {product.name}
          </h3>
          <p className="mt-1 type-price text-[10px] text-[#d4af37]/90 sm:text-[11px]">Price on request</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 opacity-100 transition duration-300 sm:mt-4 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <WhatsAppCTA
              productName={product.name}
              className="px-3 py-1.5 text-[0.62rem] sm:px-4 sm:py-2 sm:text-[0.68rem]"
            >
              Enquire
            </WhatsAppCTA>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function BestSellers() {
  const reduceMotion = useReducedMotion();
  const [featured, ...rest] = products;

  if (!featured) return null;

  return (
    <section
      className="relative overflow-hidden bg-[#f9f5f0] py-16 md:py-24"
      aria-labelledby="best-sellers-heading"
    >
      <motion.div
        className="pointer-events-none absolute -left-24 top-8 h-56 w-56 rounded-full bg-[#afa0d1]/20 blur-3xl"
        aria-hidden
        animate={reduceMotion ? undefined : { opacity: [0.35, 0.55, 0.35], scale: [1, 1.08, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-[#d4af37]/12 blur-3xl"
        aria-hidden
        animate={reduceMotion ? undefined : { opacity: [0.25, 0.45, 0.25], x: [0, -12, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />

      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/35 to-transparent"
        aria-hidden
      />

      <div className="container-stitch relative">
        <motion.div
          className="mx-auto mb-10 max-w-2xl text-center md:mb-14"
          variants={fadeUp}
          initial={reduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true }}
        >
          <p className="mb-3 type-label text-[#847377]">Client Favourites</p>
          <h2 id="best-sellers-heading" className="type-section text-[#130006]">
            Best Sellers
          </h2>
          <p className="mx-auto mt-5 max-w-lg type-body-luxury text-[#514347]">
            The pieces our collectors return for — refined silhouettes, luminous stones, and the quiet confidence of true luxury.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:grid-cols-12 lg:grid-rows-[auto_auto_auto] lg:gap-5">
          <ProductCard
            product={featured}
            layout="featured"
            index={0}
            className="col-span-2 min-h-[340px] lg:col-span-6 lg:row-span-2 lg:min-h-[520px]"
          />

          {rest.slice(0, 2).map((product, i) => (
            <ProductCard
              key={product.id}
              product={product}
              index={i + 1}
              className="lg:col-span-3 lg:row-span-1"
            />
          ))}

          {rest.slice(2, 6).map((product, i) => (
            <ProductCard
              key={product.id}
              product={product}
              index={i + 3}
              className="lg:col-span-3"
            />
          ))}

          {rest.slice(6, 7).map((product, i) => (
            <ProductCard
              key={product.id}
              product={product}
              index={i + 7}
              className="col-span-2 lg:col-span-6"
            />
          ))}
        </div>

        <motion.div
          className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row md:mt-16"
          variants={fadeUp}
          initial={reduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true }}
        >
          <Link
            to="/collections"
            className="tap-target group inline-flex items-center justify-center gap-3 rounded-full bg-[#3d0a21] px-8 py-4 type-button text-[#f7ead0] shadow-[0_18px_42px_rgba(61,10,33,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#130006] sm:px-10"
          >
            View All Collections
            <Icon className="text-[18px] transition duration-300 group-hover:translate-x-1">arrow_forward</Icon>
          </Link>
          <WhatsAppCTA intent="consult" className="px-6 py-3 text-sm">
            Private Consultation
          </WhatsAppCTA>
        </motion.div>
      </div>
    </section>
  );
}
