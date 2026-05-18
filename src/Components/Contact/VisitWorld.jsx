import boutiqueImage from "../../assets/contact-boutique.webp";
import Icon from "./Icon";

export default function VisitWorld() {
  return (
    <section className="mb-20 grid min-h-[420px] grid-cols-1 gap-8 md:mb-32 md:grid-cols-2">
      <div className="group relative overflow-hidden rounded-[2rem] border border-[#130006]/10 bg-[#130006]/5 shadow-[0_28px_80px_rgba(19,0,6,0.12)]">
        <img className="h-[360px] w-full object-cover transition-transform duration-700 group-hover:scale-105 md:h-full" alt="VELISQA boutique storefront" src={boutiqueImage} loading="lazy" decoding="async" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#130006]/35 via-transparent to-transparent" />
      </div>
      <div className="flex flex-col items-center justify-center border border-[#847377]/5 bg-[#f1ede8] p-8 text-center md:p-12">
        <Icon className="mb-6 text-4xl text-[#130006]">location_on</Icon>
        <h4 className="mb-4 font-serif text-3xl leading-[1.3] text-[#130006]">Visit Our World</h4>
        <p className="mb-8 max-w-md text-base leading-[1.6] text-[#514347]">Private viewings and styling assistance from our Aligarh atelier are available by appointment across India.</p>
        <a className="tap-target inline-flex items-center border-b border-[#130006] pb-1 label-stitch uppercase tracking-widest text-[#130006] transition hover:opacity-50" href="https://www.google.com/maps/search/?api=1&query=Aligarh%2C%20Uttar%20Pradesh%2C%20India" target="_blank" rel="noreferrer">
          View Map Location
        </a>
      </div>
    </section>
  );
}
