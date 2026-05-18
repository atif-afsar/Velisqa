import { useState } from "react";
import aethelgard from "../../assets/collection-aethelgard-earrings.webp";
import solitaire from "../../assets/collection-solitaire-pendant.webp";
import bangle from "../../assets/collection-obsidian-bangle.webp";
import ruby from "../../assets/collection-ruby-sovereign.webp";
import pearls from "../../assets/collection-celestial-pearls.webp";
import lumina from "../../assets/collection-lumina-brooch.webp";
import solarisNecklace from "../../assets/velisqa-solaris-necklace.webp";
import solarisRing from "../../assets/velisqa-solaris-ring.webp";
import bracelet from "../../assets/Bracelet/image1.png";
import earrings from "../../assets/Earrings/image.png";
import WhatsAppCTA from "../WhatsApp/WhatsAppCTA";

const signatureCategories = [
  {
    title: "Necklace",
    products: [
      {
        name: "Solitaire Pendant",
        price: "INR 82,000",
        image: solitaire,
        alt: "Solitaire pendant on a soft jewellery display",
      },
      {
        name: "Solaris Necklace",
        price: "INR 128,000",
        image: solarisNecklace,
        alt: "Solaris necklace with warm gold detailing",
      },
      {
        name: "Celestial Pearls",
        price: "INR 165,000",
        image: pearls,
        alt: "Multi-strand pearl necklace with vintage gold clasp",
      },
    ],
  },
  {
    title: "Bracelet",
    products: [
      {
        name: "Obsidian Bangle",
        price: "INR 210,000",
        image: bangle,
        alt: "Obsidian bangle set against dark silk",
      },
      {
        name: "Velisqa Bracelet",
        price: "INR 96,000",
        image: bracelet,
        alt: "Velisqa bracelet with polished gold finish",
      },
      {
        name: "Lumina Brooch Bracelet",
        price: "INR 118,000",
        image: lumina,
        alt: "Lumina jewellery piece styled as a bracelet accent",
      },
    ],
  },
  {
    title: "Rings",
    products: [
      {
        name: "The Ruby Sovereign",
        price: "INR 185,000",
        image: ruby,
        alt: "Rare ruby ring surrounded by baguette diamonds",
      },
      {
        name: "Solaris Ring",
        price: "INR 74,000",
        image: solarisRing,
        alt: "Solaris ring with a sculptural gold profile",
      },
      {
        name: "Velisqa Signature Ring",
        price: "INR 92,000",
        image: ruby,
        alt: "Velisqa signature gemstone ring",
      },
    ],
  },
  {
    title: "Earrings",
    products: [
      {
        name: "Aethelgard Earrings",
        price: "INR 145,000",
        image: aethelgard,
        alt: "Aethelgard emerald earrings",
      },
      {
        name: "Velisqa Earrings",
        price: "INR 88,000",
        image: earrings,
        alt: "Velisqa earrings with elegant gold detailing",
      },
      {
        name: "Emerald Drop Earrings",
        price: "INR 132,000",
        image: aethelgard,
        alt: "Emerald drop earrings styled for the signature collection",
      },
    ],
  },
];

function ProductCard({ product }) {
  return (
    <article className="group flex h-full flex-col">
      <div className="aspect-[4/5] overflow-hidden bg-[#f1ede8]">
        <img
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          src={product.image}
          alt={product.alt}
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="flex flex-1 flex-col items-center pt-5 text-center">
        <h4 className="font-serif text-2xl leading-tight text-[#130006]">{product.name}</h4>
        <p className="type-price mt-1 text-sm leading-[1.6] text-[#514347]">{product.price}</p>
        <div className="mt-4 flex w-full justify-center">
          <WhatsAppCTA productName={product.name} className="px-5 py-2.5">
            Buy
          </WhatsAppCTA>
        </div>
      </div>
    </article>
  );
}

export default function SignatureCollection() {
  const [activeCategory, setActiveCategory] = useState(signatureCategories[0].title);
  const selectedCategory = signatureCategories.find((category) => category.title === activeCategory) ?? signatureCategories[0];

  return (
    <section id="signature" className="container-stitch mb-20 md:mb-32">
      <div className="mb-12 flex flex-col items-center text-center md:mb-16">
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
              onClick={() => setActiveCategory(category.title)}
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

        <div className="grid grid-cols-1 gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {selectedCategory.products.map((product) => (
            <ProductCard key={product.name} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
