import { Link } from "react-router-dom";
import SEOHead from "../Components/SEO/SEOHead";
import WhatsAppCTA from "../Components/WhatsApp/WhatsAppCTA";
import HomeFooter from "../Components/Home/HomeFooter";
import { buildBreadcrumbSchema } from "../Components/SEO/schemaBuilders";
import { pageSeo } from "../Components/SEO/seoData";

export default function Order() {
  return (
    <>
      <SEOHead
        {...pageSeo.order}
        schema={[
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Order on WhatsApp", path: "/order" },
          ]),
        ]}
      />
      <main className="page-offset-nav bg-[#f9f5f0] text-[#130006]">
        <section className="container-stitch px-4 py-12 text-center sm:py-16 md:py-20">
          <p className="type-label text-[#847377]">Private Concierge</p>
          <h1 className="mt-3 type-section">Order Velisqa on WhatsApp</h1>
          <p className="mx-auto mt-5 max-w-xl type-body-luxury text-[#514347]">
            Reserve necklaces, rings, bangles, and earrings with our concierge. Share your preferred
            piece, occasion, and city — we confirm pricing, availability, and delivery on WhatsApp.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <WhatsAppCTA intent="consult" className="px-8 py-4 text-sm">
              Message on WhatsApp
            </WhatsAppCTA>
            <Link
              to="/collections"
              className="tap-target inline-flex items-center justify-center rounded-full border border-[#3d0a21] px-8 py-4 type-button text-[#3d0a21] transition hover:bg-[#3d0a21]/5"
            >
              Browse Collections
            </Link>
          </div>
          <p className="mx-auto mt-8 max-w-lg text-xs font-medium text-[#847377]">
            Prefer to read first? Visit our{" "}
            <Link to="/faq" className="text-[#6f334a] underline-offset-2 hover:underline">
              FAQ
            </Link>{" "}
            or{" "}
            <Link to="/shipping-returns" className="text-[#6f334a] underline-offset-2 hover:underline">
              Shipping & Returns
            </Link>
            .
          </p>
        </section>
        <HomeFooter />
      </main>
    </>
  );
}
