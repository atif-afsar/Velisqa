import Hero from "./Hero";
import IconsOfElegance from "./IconsOfElegance";
import Ethos from "./Ethos";
import Legacy from "./Legacy";
import SunKissed from "./SunKissed";
import Atelier from "./Atelier";
import Testimonial from "./Testimonial";
import BeginStory from "./BeginStory";
import HomeFooter from "./HomeFooter";

export default function HomeContent() {
  return (
    <main className="bg-[#f9f5f0] text-[#130006]">
      <Hero />
      <IconsOfElegance />
      <Ethos />
      <Legacy />
      <SunKissed />
      <Atelier />
      <Testimonial />
      <BeginStory />
      <HomeFooter />
    </main>
  );
}
