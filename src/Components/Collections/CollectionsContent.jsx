import { lazy } from "react";
import { Link } from "react-router-dom";
import CatalogProducts from "./CatalogProducts";
import SignatureCollection from "./SignatureCollection";
import LazySection from "../Performance/LazySection";

const RareFinds = lazy(() => import("./RareFinds"));
const Archive = lazy(() => import("./Archive"));
const Concierge = lazy(() => import("./Concierge"));
const CollectionsFooter = lazy(() => import("./CollectionsFooter"));

export default function CollectionsContent() {
  return (
    <main className="page-offset-nav bg-[#fdf9f4] text-[#1c1c19]">
      <header className="container-stitch px-4 pb-2 pt-6 text-center sm:pt-8">
        <p className="type-label text-[#847377]">Shop Velisqa</p>
        <h1 className="mt-2 type-section text-[#130006]">Velisqa Jewellery Collections</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm font-medium text-[#514347]">
          Premium artificial jewellery — necklaces, rings, bangles &amp; earrings.{" "}
          <Link to="/order" className="text-[#6f334a] underline-offset-2 hover:underline">
            Order on WhatsApp
          </Link>
          .
        </p>
      </header>
      <CatalogProducts />
      <SignatureCollection />
      <LazySection minHeight="760px">
        <RareFinds />
      </LazySection>
      <LazySection minHeight="520px">
        <Archive />
      </LazySection>
      <LazySection minHeight="420px">
        <Concierge />
      </LazySection>
      <LazySection minHeight="260px">
        <CollectionsFooter />
      </LazySection>
    </main>
  );
}
