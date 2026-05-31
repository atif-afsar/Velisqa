import { lazy } from "react";
import { useHomeShopPreload } from "../../hooks/useHomeShopPreload";
import Hero from "./Hero";
import HomeBrandSeo from "./HomeBrandSeo";
import IconsOfElegance from "./IconsOfElegance";
import LazySection from "../Performance/LazySection";

const HomeShopGrid = lazy(() => import("./HomeShopGrid"));
const Ethos = lazy(() => import("./Ethos"));
const BestSellers = lazy(() => import("./BestSellers"));
const SunKissed = lazy(() => import("./SunKissed"));
const Atelier = lazy(() => import("./Atelier"));
const Testimonial = lazy(() => import("./Testimonial"));
const BeginStory = lazy(() => import("./BeginStory"));
const HomeFooter = lazy(() => import("./HomeFooter"));

export default function HomeContent() {
  const homeShopCatalog = useHomeShopPreload();

  return (
    <main className="bg-[#f9f5f0] text-[#130006]">
      <Hero />
      <IconsOfElegance />
      <LazySection minHeight="520px" rootMargin="900px">
        <HomeShopGrid
          products={homeShopCatalog.products}
          loading={homeShopCatalog.loading}
          error={homeShopCatalog.error}
        />
      </LazySection>
      <LazySection minHeight="620px">
        <Ethos />
      </LazySection>
      <LazySection minHeight="720px">
        <BestSellers />
      </LazySection>
      <LazySection minHeight="760px">
        <SunKissed />
      </LazySection>
      <LazySection minHeight="520px">
        <Atelier />
      </LazySection>
      <LazySection minHeight="420px">
        <Testimonial />
      </LazySection>
      <LazySection minHeight="480px">
        <BeginStory />
      </LazySection>
      <HomeBrandSeo />
      <LazySection minHeight="280px">
        <HomeFooter />
      </LazySection>
    </main>
  );
}
