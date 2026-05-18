import { lazy } from "react";
import SignatureCollection from "./SignatureCollection";
import LazySection from "../Performance/LazySection";

const RareFinds = lazy(() => import("./RareFinds"));
const Archive = lazy(() => import("./Archive"));
const Concierge = lazy(() => import("./Concierge"));
const CollectionsFooter = lazy(() => import("./CollectionsFooter"));

export default function CollectionsContent() {
  return (
    <main className="bg-[#fdf9f4] text-[#1c1c19]">
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
