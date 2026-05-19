import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getLenis } from "../../lib/smoothScrollState";
import BuyNowButton from "../WhatsApp/BuyNowButton";

const necklaceImages = import.meta.glob("../../assets/Necklace/*.webp", { eager: true });
const braceletImages = import.meta.glob("../../assets/Bracelet/*.webp", { eager: true });
const ringImages = import.meta.glob("../../assets/Rings/*.webp", { eager: true });
const earringImages = import.meta.glob("../../assets/Earrings/*.webp", { eager: true });

function buildProducts(category, modules) {
  return Object.entries(modules)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
    .map(([path, module], index) => ({
      name: `Velisqa ${category} ${index + 1}`,
      price: "Price on request",
      image: module.default,
      alt: `${category} jewellery piece from the Velisqa signature collection`,
      source: path,
    }));
}

const signatureCategories = [
  {
    title: "Necklace",
    products: buildProducts("Necklace", necklaceImages),
  },
  {
    title: "Bracelet",
    products: buildProducts("Bracelet", braceletImages),
  },
  {
    title: "Rings",
    products: buildProducts("Ring", ringImages),
  },
  {
    title: "Earrings",
    products: buildProducts("Earrings", earringImages),
  },
];

const categoryAliases = {
  necklace: "Necklace",
  necklaces: "Necklace",
  bracelet: "Bracelet",
  bracelets: "Bracelet",
  ring: "Rings",
  rings: "Rings",
  earring: "Earrings",
  earrings: "Earrings",
};

function getCategoryFromParam(category) {
  return categoryAliases[category?.toLowerCase()] ?? null;
}

function ProductCard({ product, onSelect }) {
  return (
    <article className="group flex h-full flex-col rounded-lg border border-[#d4af37]/15 bg-[#fbf7f1] p-2 shadow-[0_18px_44px_-28px_rgba(19,0,6,0.35)] transition duration-300 hover:-translate-y-1 hover:border-[#d4af37]/35 sm:p-3">
      <button
        type="button"
        className="aspect-[4/5] overflow-hidden rounded-md bg-[#f1ede8] text-left"
        onClick={() => onSelect(product)}
        aria-label={`View ${product.name}`}
      >
        <img
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          src={product.image}
          alt={product.alt}
          loading="lazy"
          decoding="async"
        />
      </button>

      <div className="flex flex-1 flex-col items-center px-1 pb-1 pt-3 text-center sm:pt-5">
        <button type="button" onClick={() => onSelect(product)} className="text-center">
          <h4 className="font-serif text-[1.05rem] leading-tight text-[#130006] transition hover:text-[#6f334a] sm:text-2xl">{product.name}</h4>
        </button>
        <p className="type-price mt-1 text-[11px] leading-[1.6] text-[#514347] sm:text-sm">{product.price}</p>
        <div className="mt-3 flex w-full justify-center sm:mt-4">
          <BuyNowButton productName={product.name} className="w-full px-3 py-2 sm:w-auto sm:px-5 sm:py-2.5">
            Buy
          </BuyNowButton>
        </div>
      </div>
    </article>
  );
}

function ProductPreviewModal({ product, onClose }) {
  useEffect(() => {
    if (!product) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [product, onClose]);

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#130006]/80 px-3 py-4 backdrop-blur-sm sm:px-6" role="dialog" aria-modal="true" aria-label={product.name}>
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close product preview" />

      <div className="relative z-10 flex max-h-[92svh] w-full max-w-5xl flex-col overflow-hidden bg-[#fbf7f1] shadow-2xl sm:max-h-[90vh] md:grid md:grid-cols-[minmax(0,1fr)_320px]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-[#130006]/85 text-2xl leading-none text-[#ffe088] transition hover:bg-[#3d0a21]"
          aria-label="Close product preview"
        >
          &times;
        </button>

        <div className="flex min-h-0 items-center justify-center bg-[#f1ede8] p-3 sm:p-5 md:p-6">
          <img
            src={product.image}
            alt={product.alt}
            className="max-h-[58svh] w-full object-contain sm:max-h-[68vh] md:max-h-[78vh]"
            decoding="async"
          />
        </div>

        <div className="flex flex-col justify-between gap-6 p-5 text-center sm:p-7 md:text-left">
          <div>
            <p className="label-stitch mb-3 text-xs uppercase tracking-[0.18em] text-[#847377]">Signature Collection</p>
            <h3 className="font-serif text-3xl leading-tight text-[#130006] sm:text-4xl">{product.name}</h3>
            <p className="type-price mt-3 text-sm leading-[1.6] text-[#514347]">{product.price}</p>
            <p className="mt-4 text-sm leading-7 text-[#514347]">
              View the piece in full detail, then connect with our concierge for availability, pricing, and delivery.
            </p>
          </div>

          <BuyNowButton productName={product.name} className="w-full px-6 py-4">
            Buy Now
          </BuyNowButton>
        </div>
      </div>
    </div>
  );
}

export default function SignatureCollection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const activeCategory = getCategoryFromParam(searchParams.get("category")) ?? signatureCategories[0].title;
  const selectedCategory = signatureCategories.find((category) => category.title === activeCategory) ?? signatureCategories[0];

  useEffect(() => {
    const categoryFromUrl = getCategoryFromParam(searchParams.get("category"));

    if (categoryFromUrl) {
      requestAnimationFrame(() => {
        const target = document.getElementById("signature");
        if (!target) return;
        const lenis = getLenis();
        if (lenis) {
          lenis.scrollTo(target, { offset: -88, duration: 1.35 });
        } else {
          target.scrollIntoView({ block: "start", behavior: "smooth" });
        }
      });
    }
  }, [searchParams]);

  function handleCategoryChange(categoryTitle) {
    setSelectedProduct(null);
    setSearchParams({ category: categoryTitle.toLowerCase() });
  }

  return (
    <section
      id="signature"
      className="container-stitch mb-20 scroll-mt-[calc(var(--nav-height)+1rem)] md:mb-32"
    >
      <div className="mb-10 flex flex-col items-center px-2 text-center md:mb-14">
        <h2 className="mb-2 type-section italic text-[#130006]">The Signature Collection</h2>
        <div className="h-px w-24 bg-[#e9c349]" />
      </div>

      <div className="mb-12 flex flex-wrap items-center justify-center gap-3">
        {signatureCategories.map((category) => {
          const isActive = category.title === activeCategory;

          return (
            <button
              key={category.title}
              type="button"
              onClick={() => handleCategoryChange(category.title)}
              className={`tap-target rounded-full border px-5 py-2.5 text-center transition-all ${
                isActive
                  ? "border-[#3d0a21] bg-[#3d0a21] text-[#e9c349]"
                  : "border-[#d4af37]/35 bg-transparent text-[#130006] hover:border-[#3d0a21] hover:bg-[#130006]/5"
              }`}
              aria-pressed={isActive}
            >
              <span className="label-stitch">{category.title}</span>
            </button>
          );
        })}
      </div>

      <div>
        <div className="mb-7 flex items-end justify-between gap-5 border-b border-[#d4af37]/30 pb-3">
          <h3 className="font-serif text-3xl italic leading-tight text-[#130006] md:text-4xl">
            {selectedCategory.title}
          </h3>
          <p className="label-stitch text-right text-[#847377]">{selectedCategory.products.length} pieces</p>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-7 sm:gap-y-12 lg:grid-cols-3">
          {selectedCategory.products.map((product) => (
            <ProductCard key={product.source} product={product} onSelect={setSelectedProduct} />
          ))}
        </div>
      </div>

      <ProductPreviewModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </section>
  );
}
