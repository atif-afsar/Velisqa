import ContactHero from "./ContactHero";
import ContactGrid from "./ContactGrid";
import VelvetService from "./VelvetService";
import VisitWorld from "./VisitWorld";
import ContactFooter from "./ContactFooter";

export default function ContactContent() {
  return (
    <main className="page-offset-nav bg-[#fdf9f4] text-[#1c1c19]">
      <div className="container-stitch">
        <ContactHero />
        <ContactGrid />
        <VelvetService />
        <VisitWorld />
      </div>
      <ContactFooter />
    </main>
  );
}
