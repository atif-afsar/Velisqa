import AboutHero from "./AboutHero";
import FounderStory from "./FounderStory";
import Roots from "./Roots";
import Artistry from "./Artistry";
import ValueCards from "./ValueCards";
import InnerCircle from "./InnerCircle";
import AboutFooter from "./AboutFooter";

export default function AboutContent() {
  return (
    <main className="bg-[#fdf9f4] text-[#130006]">
      <AboutHero />
      <FounderStory />
      <Roots />
      <Artistry />
      <ValueCards />
      <InnerCircle />
      <AboutFooter />
    </main>
  );
}
