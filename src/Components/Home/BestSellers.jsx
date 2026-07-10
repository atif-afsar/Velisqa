import { Link } from "react-router-dom";
import BuyNowButton from "../WhatsApp/BuyNowButton";
import WhatsAppCTA from "../WhatsApp/WhatsAppCTA";
import Icon from "./Icon";

const bestSellerModules = import.meta.glob("../../assets/BestSeller/*.webp", {
  eager: true,
});

/** Toggle off when these edits are back in stock for immediate purchase */
const BEST_SELLERS_SOLD_OUT = true;

/** Names match each asset filename (see `src/assets/BestSeller/*.webp`). */
const BEST_SELLER_NAMES = {
  "image1.webp": "Velisqa Eternal Knot Cuff",
  "image2.webp": "Velisqa Blush Crystal Pendant",
  "image3.webp": "Velisqa Centre Stone Necklace & Stud Set",
  "image4.webp": "Velisqa Gold-Tone Bangle Trio",
  "image5.webp": "Velisqa Split-Shank Centre Stone Ring",
  "image6.webp": "Velisqa Classic Silver Hoops",
  "image7.webp": "Velisqa Dewdrop Teardrop Necklace",
  "image8.webp": "Velisqa Five-Stack Bangle Edit",
};

function fileNameFromGlobPath(path) {
  const normalized = path.replace(/\\/g, "/");
  return normalized.split("/").pop() ?? path;
}

const products = Object.entries(bestSellerModules)
  .sort(([a], [b]) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
  )
  .map(([path, module], index) => {
    const file = fileNameFromGlobPath(path);
    const name =
      BEST_SELLER_NAMES[file] ?? `Velisqa signature piece ${index + 1}`;

    return {
      id: path,
      image: module.default,
      name,
      tag: index === 0 ? "Bestseller" : index < 3 ? "Most Loved" : "Signature Edit",
      soldOut: BEST_SELLERS_SOLD_OUT,
    };
  });

function ProductCard({ product, className = "", layout = "standard" }) {
  const isFeatured = layout === "featured";

  return (
    <article className={`group relative isolate h-full min-h-0 ${className}`}>
      <div
        className={`relative w-full max-sm:flex max-sm:flex-col max-sm:min-h-0 overflow-hidden rounded-lg max-sm:bg-[#e8e3dc] sm:bg-transparent sm:rounded-xl ${
          isFeatured
            ? "sm:min-h-[420px] md:min-h-[480px] lg:h-full lg:min-h-[520px]"
            : "sm:aspect-[4/5] sm:w-full"
        }`}
      >
        {/* Mobile: padded frame + cover (unchanged). Desktop: full-bleed cover — no cream letterboxing. */}
        <div
          className={`relative w-full shrink-0 overflow-hidden sm:absolute sm:inset-0 ${
            isFeatured
              ? "aspect-[5/6] max-h-[min(70vh,520px)] sm:max-h-none sm:aspect-auto"
              : "aspect-[4/5] sm:aspect-auto"
          }`}
        >
          <div className="max-sm:flex max-sm:h-full max-sm:min-h-0 max-sm:w-full max-sm:items-center max-sm:justify-center max-sm:p-1 sm:contents">
            <img
              src={product.image}
              alt={`${product.name} — Velisqa Jewellery best seller`}
              width={800}
              height={1000}
              loading="lazy"
              decoding="async"
              className="max-h-full max-w-full object-cover object-center max-sm:h-full max-sm:w-full sm:absolute sm:inset-0 sm:h-full sm:w-full sm:max-h-none sm:max-w-none sm:object-cover sm:object-center"
            />
          </div>
          {/* Lighter gradient only on lower third so product stays visible */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[min(40%,16rem)] bg-gradient-to-t from-[#130006]/75 to-transparent sm:block"
            aria-hidden
          />
        </div>

        <div className="relative z-20 flex flex-col gap-1 max-sm:border-t max-sm:border-[#130006]/10 max-sm:bg-[#fbf7f1] max-sm:p-3 sm:pointer-events-none sm:absolute sm:inset-x-0 sm:bottom-0 sm:border-0 sm:bg-gradient-to-t sm:from-[#130006]/92 sm:via-[#130006]/55 sm:via-50% sm:to-transparent sm:p-4 sm:pb-4 sm:pt-14 md:pt-16 [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
          <span className="mb-0.5 inline-block w-fit rounded-full border border-[#d4af37]/40 bg-[#3d0a21]/12 px-2.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.22em] text-[#3d0a21] backdrop-blur-[2px] sm:mb-1 sm:border-[#d4af37]/35 sm:bg-[#3d0a21]/60 sm:text-[#f7ead0] sm:text-[10px]">
            {product.tag}
          </span>
          <h3
            className={`font-serif leading-snug text-[#130006] sm:text-[#fdf9f4] sm:drop-shadow-[0_2px_14px_rgba(19,0,6,0.75)] ${
              isFeatured ? "text-lg sm:text-2xl md:text-3xl" : "text-base sm:text-lg md:text-xl"
            }`}
          >
            {product.name}
          </h3>
          <p className="type-price text-[10px] text-[#514347] sm:mt-0.5 sm:text-[#f0e6d2] sm:text-[11px] sm:drop-shadow-[0_1px_8px_rgba(19,0,6,0.7)]">
            Price on request
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 opacity-100 max-sm:mt-2 sm:mt-2">
            <BuyNowButton
              productName={product.name}
              productImage={product.image}
              soldOut={product.soldOut}
              className="px-3 py-1.5 text-[0.62rem] sm:px-4 sm:py-2 sm:text-[0.68rem]"
            >
              Buy Now
            </BuyNowButton>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function BestSellers() {
  const [featured, ...rest] = products;

  if (!featured) return null;

  return (
    <section
      className="relative overflow-hidden bg-[#f9f5f0] py-16 md:py-24"
      aria-labelledby="best-sellers-heading"
    >
      {/* Static accents — no continuous animation (saves main-thread + composite cost while scrolling) */}
      <div
        className="pointer-events-none absolute -left-24 top-8 h-56 w-56 rounded-full bg-[#afa0d1]/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-[#d4af37]/10 blur-3xl"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent"
        aria-hidden
      />

      <div className="container-stitch relative">
        <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
          <p className="mb-3 type-label text-[#847377]">Client Favourites</p>
          <h2 id="best-sellers-heading" className="type-section text-[#130006]">
            Best Sellers
          </h2>
          <p className="mx-auto mt-5 max-w-lg type-body-luxury text-[#514347]">
            The pieces our collectors return for — refined silhouettes, luminous crystal accents, and the quiet confidence of elevated style.
            {BEST_SELLERS_SOLD_OUT && (
              <span className="mt-3 block text-sm text-[#6f334a]">
                These edits are currently sold out online; use Enquire to purchase for waitlist, restock, or bespoke options. Dispatch is made to order and not same-day.
              </span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:grid-cols-12 lg:grid-rows-[auto_auto_auto] lg:gap-5">
          <ProductCard
            product={featured}
            layout="featured"
            className="col-span-2 min-h-[340px] lg:col-span-6 lg:row-span-2 lg:min-h-[520px]"
          />

          {rest.slice(0, 2).map((product) => (
            <ProductCard key={product.id} product={product} className="lg:col-span-3 lg:row-span-1" />
          ))}

          {rest.slice(2, 6).map((product) => (
            <ProductCard key={product.id} product={product} className="lg:col-span-3" />
          ))}

          {rest.slice(6, 7).map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              className="col-span-2 lg:col-span-6"
            />
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row md:mt-16">
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
        </div>
      </div>
    </section>
  );
}
