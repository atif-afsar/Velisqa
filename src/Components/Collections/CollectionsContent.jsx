import CollectionsHero from "./CollectionsHero";
import SignatureCollection from "./SignatureCollection";
import RareFinds from "./RareFinds";
import Archive from "./Archive";
import Concierge from "./Concierge";
import CollectionsFooter from "./CollectionsFooter";

export default function CollectionsContent() {
  return (
    <main className="bg-[#fdf9f4] text-[#1c1c19]">
      <CollectionsHero />
      <SignatureCollection />
      <RareFinds />
      <Archive />
      <Concierge />
      <CollectionsFooter />
    </main>
  );
}
