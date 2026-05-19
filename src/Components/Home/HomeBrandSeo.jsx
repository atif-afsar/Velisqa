import { Link } from "react-router-dom";

export default function HomeBrandSeo() {
  return (
    <section
      className="border-t border-[#d4af37]/12 bg-[#f9f5f0] py-14 md:py-18"
      aria-labelledby="brand-seo-heading"
    >
      <div className="container-stitch">
        <div className="mx-auto max-w-3xl text-center">
          <p className="type-label text-[#847377]">The Velisqa Story</p>
          <h2
            id="brand-seo-heading"
            className="mt-3 type-section text-[#130006]"
          >
            Velisqa Jewellery
          </h2>
          <div className="mx-auto mt-4 h-px w-16 bg-[#d4af37]/50" />
        </div>

        <div className="mx-auto mt-8 max-w-3xl space-y-4 text-sm font-medium leading-relaxed text-[#514347] md:mt-10 md:text-[0.95rem] md:leading-7">
          <p>
            <strong className="font-semibold text-[#130006]">Velisqa</strong> is a modern jewellery house
            devoted to premium artificial jewellery and refined fashion jewellery for women across India.
            When you search for <strong className="font-semibold text-[#130006]">Velisqa Jewellery</strong>,
            you will find a brand built on editorial craftsmanship, luminous finishes, and the belief that
            every woman deserves pieces that feel intentional — never ordinary.
          </p>
          <p>
            Our signature edit spans{" "}
            <Link to="/collections?category=necklace" className="text-[#6f334a] underline-offset-2 hover:underline">
              necklaces
            </Link>
            ,{" "}
            <Link to="/collections?category=rings" className="text-[#6f334a] underline-offset-2 hover:underline">
              rings
            </Link>
            ,{" "}
            <Link to="/collections?category=bracelet" className="text-[#6f334a] underline-offset-2 hover:underline">
              bangles
            </Link>
            , and{" "}
            <Link to="/collections?category=earrings" className="text-[#6f334a] underline-offset-2 hover:underline">
              earrings
            </Link>
            , each presented with the clarity of a luxury maison and the ease of contemporary styling.
            Whether you are curating bridal artificial jewellery, elevating festive looks, or investing in
            versatile daily icons, Velisqa offers modern jewellery with a quiet, confident presence.
          </p>
          <p>
            Every enquiry is handled by our private concierge on{" "}
            <Link to="/order" className="text-[#6f334a] underline-offset-2 hover:underline">
              WhatsApp
            </Link>
            , so you can explore collections, confirm availability, and place orders without friction.
            Visit our{" "}
            <Link to="/about" className="text-[#6f334a] underline-offset-2 hover:underline">
              About
            </Link>{" "}
            page to discover our heritage, browse the{" "}
            <Link to="/collections" className="text-[#6f334a] underline-offset-2 hover:underline">
              Collections
            </Link>
            , or read our{" "}
            <Link to="/faq" className="text-[#6f334a] underline-offset-2 hover:underline">
              FAQ
            </Link>{" "}
            for guidance on care, shipping, and authenticity. Velisqa — Crafted to Captivate.
          </p>
        </div>
      </div>
    </section>
  );
}
