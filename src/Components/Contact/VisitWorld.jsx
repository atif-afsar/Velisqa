import boutiqueImage from "../../assets/contact-boutique.png";
import Icon from "./Icon";

export default function VisitWorld() {
  return (
    <section className="mb-32 grid min-h-[400px] grid-cols-1 gap-8 md:grid-cols-2">
      <div className="group overflow-hidden">
        <img className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" alt="VELISQA boutique storefront" src={boutiqueImage} />
      </div>
      <div className="flex flex-col items-center justify-center border border-[#847377]/5 bg-[#f1ede8] p-12 text-center">
        <Icon className="mb-6 text-4xl text-[#130006]">location_on</Icon>
        <h4 className="mb-4 font-serif text-3xl leading-[1.3] text-[#130006]">Visit Our World</h4>
        <p className="mb-8 max-w-md text-base leading-[1.6] text-[#514347]">Guided tours of our atelier and workshop are available upon request for our regular patrons.</p>
        <a className="border-b border-[#130006] pb-1 label-stitch uppercase tracking-widest text-[#130006] transition hover:opacity-50" href="https://www.velisqa.com">
          View Map Location
        </a>
      </div>
    </section>
  );
}
