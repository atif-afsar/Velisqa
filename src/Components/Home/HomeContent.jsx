import { lazy } from "react";
import Hero from "./Hero";
import IconsOfElegance from "./IconsOfElegance";
import LazySection from "../Performance/LazySection";

const Ethos = lazy(() => import("./Ethos"));
const PremiumImageSlider = lazy(() => import("./PremiumImageSlider"));
const SunKissed = lazy(() => import("./SunKissed"));
const Atelier = lazy(() => import("./Atelier"));
const Testimonial = lazy(() => import("./Testimonial"));
const BeginStory = lazy(() => import("./BeginStory"));
const HomeFooter = lazy(() => import("./HomeFooter"));

export default function HomeContent() {
  return (
    <main className="bg-[#f9f5f0] text-[#130006]">
      <Hero />
      <IconsOfElegance />
      <LazySection minHeight="620px">
        <Ethos />
      </LazySection>
      <LazySection minHeight="520px">
        <PremiumImageSlider />
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
      <LazySection minHeight="280px">
        <HomeFooter />
      </LazySection>
    </main>
  );
}
