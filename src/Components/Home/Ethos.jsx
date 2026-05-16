import model from "../../assets/velisqa-model.png";
import Icon from "./Icon";
import { values } from "./homeData";

export default function Ethos() {
  return (
    <section id="ethos" className="bg-[#f9f5f0] py-24">
      <div className="container-stitch grid items-center gap-16 lg:grid-cols-12">
        <div className="space-y-12 lg:col-span-5">
          <div>
            <h2 className="font-serif text-5xl leading-tight text-[#130006]">The Velisqa<br />Ethos</h2>
            <p className="mt-7 max-w-md text-sm leading-7 text-[#514347]">
              Our pieces are more than adornments; they are milestones of the feminine journey, crafted with soul and precision.
            </p>
          </div>
          <div className="space-y-8">
            {values.map(([icon, title, copy]) => (
              <div key={title} className="flex gap-6">
                <Icon className="mt-1 text-[22px] text-[#d4af37]">{icon}</Icon>
                <div>
                  <h3 className="text-sm font-semibold tracking-[0.1em] text-[#130006]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#514347]/80">{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative lg:col-span-7">
          <div className="luxury-arch ml-auto max-w-[520px] border-[14px] border-white shadow-2xl">
            <img src={model} alt="VELISQA founder portrait" className="aspect-[4/5] w-full object-cover" />
          </div>
          <div className="right-0 bottom-0 bg-[#3d0a21] p-9 text-white shadow-2xl md:absolute md:w-[360px] md:translate-x-2 md:translate-y-1/4">
            <Icon className="mb-5 block text-4xl text-[#d4af37]">format_quote</Icon>
            <blockquote className="font-serif text-2xl italic leading-snug">Jewellery is the punctuation mark of personality. Velisqa creates the conversation.</blockquote>
            <p className="mt-6 text-[10px] uppercase tracking-[0.25em] text-[#d4af37]">Ananya V., Founder</p>
          </div>
        </div>
      </div>
    </section>
  );
}
