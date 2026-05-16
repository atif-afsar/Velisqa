import craftsmanship from "../../assets/velisqa-craftsmanship.png";
import brooch from "../../assets/collection-lumina-brooch.png";
import necklace from "../../assets/velisqa-solaris-necklace.png";
import sketch from "../../assets/velisqa-stationery.png";
import { process } from "./aboutData";

export default function Artistry() {
  return (
    <section className="bg-[#fdf9f4] py-24">
      <div className="container-stitch grid gap-14 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <h2 className="font-serif text-5xl leading-tight text-[#130006]">Handcrafted<br />Artistry</h2>
          <p className="mt-7 max-w-sm text-sm leading-7 text-[#514347]">
            Witness the transformation from raw earth to ethereal elegance. Our process is slow, deliberate, and entirely uncompromising.
          </p>
          <div className="mt-12 space-y-8">
            {process.map(([number, title, copy]) => (
              <div key={title} className="grid grid-cols-[64px_1fr] gap-5">
                <span className="font-serif text-4xl text-[#ddd9d5]">{number}</span>
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#130006]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#514347]">{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <img src={craftsmanship} alt="Gem craftsmanship" className="h-[360px] w-full object-cover" />
          <img src={brooch} alt="Gemstone display" className="mt-16 h-[360px] w-full object-cover" />
          <img src={sketch} alt="Jewellery sketch" className="h-[360px] w-full object-cover" />
          <img src={necklace} alt="Gold necklace on velvet bust" className="mt-16 h-[360px] w-full object-cover" />
        </div>
      </div>
    </section>
  );
}
