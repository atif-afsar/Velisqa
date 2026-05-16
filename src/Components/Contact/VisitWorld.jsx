import boutiqueImage from "../../assets/contact-boutique.png";
import Icon from "./Icon";

export default function VisitWorld() {
  return (
    <section className="mb-20 grid min-h-[400px] grid-cols-1 gap-8 md:mb-32 md:grid-cols-2">
      <div className="group overflow-hidden">
        <img className="h-[340px] w-full object-cover transition-transform duration-700 group-hover:scale-105 md:h-full" alt="VELISQA boutique storefront" src={boutiqueImage} loading="lazy" decoding="async" />
      </div>
      <div className="flex flex-col items-center justify-center border border-[#847377]/5 bg-[#f1ede8] p-8 text-center md:p-12">
        <Icon className="mb-6 text-4xl text-[#130006]">location_on</Icon>
        <h4 className="mb-4 font-serif text-3xl leading-[1.3] text-[#130006]">Visit Our World</h4>
        <p className="mb-8 max-w-md text-base leading-[1.6] text-[#514347]">Guided tours of our atelier and workshop are available upon request for our regular patrons.</p>
        <a className="tap-target inline-flex items-center border-b border-[#130006] pb-1 label-stitch uppercase tracking-widest text-[#130006] transition hover:opacity-50" href="https://www.velisqa.com">
          View Map Location
        </a>
      </div>
    </section>
  );
}
