import craftsmanship from "../../assets/velisqa-craftsmanship.webp";
import brooch from "../../assets/collection-lumina-brooch.webp";
import necklace from "../../assets/velisqa-solaris-necklace.webp";
import sketch from "../../assets/velisqa-stationery.webp";
import { process } from "./aboutData";

export default function Artistry() {
  return (
    <section className="bg-[#fdf9f4] py-20 md:py-24">
      <div className="container-stitch grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
        <div>
          <h2 className="type-section text-[#130006]">Handcrafted<br />Artistry</h2>
          <p className="mt-7 max-w-sm text-sm leading-7 text-[#514347]">
            Witness the transformation from raw earth to ethereal elegance. Our process is slow, deliberate, and entirely uncompromising.
          </p>
          <div className="mt-12 space-y-8">
            {process.map(([number, title, copy]) => (
              <div key={title} className="grid grid-cols-[48px_1fr] gap-4 sm:grid-cols-[64px_1fr] sm:gap-5">
                <span className="font-serif text-4xl text-[#ddd9d5]">{number}</span>
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#130006]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#514347]">{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-8">
          <img src={craftsmanship} alt="Gem craftsmanship" loading="lazy" decoding="async" className="h-[300px] w-full object-cover sm:h-[360px]" />
          <img src={brooch} alt="Gemstone display" loading="lazy" decoding="async" className="h-[300px] w-full object-cover sm:mt-16 sm:h-[360px]" />
          <img src={sketch} alt="Jewellery sketch" loading="lazy" decoding="async" className="h-[300px] w-full object-cover sm:h-[360px]" />
          <img src={necklace} alt="Gold necklace on velvet bust" loading="lazy" decoding="async" className="h-[300px] w-full object-cover sm:mt-16 sm:h-[360px]" />
        </div>
      </div>
    </section>
  );
}
