import aethelgard from "../../assets/collection-aethelgard-earrings.png";
import solitaire from "../../assets/collection-solitaire-pendant.png";
import bangle from "../../assets/collection-obsidian-bangle.png";
import ProductCaption from "./ProductCaption";
import WhatsAppCTA from "../WhatsApp/WhatsAppCTA";

export default function SignatureCollection() {
  return (
    <section id="signature" className="container-stitch mb-20 md:mb-32">
      <div className="mb-12 flex flex-col items-center text-center md:mb-16">
        <h2 className="mb-2 type-section italic text-[#130006]">The Signature Collection</h2>
        <div className="h-px w-24 bg-[#e9c349]" />
      </div>

      <div className="grid h-auto grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="group relative lg:col-span-7">
          <div className="arched-window h-[460px] w-full overflow-hidden bg-[#f1ede8] sm:h-[560px] lg:h-[700px]">
            <img className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Aethelgard emerald earrings" src={aethelgard} loading="lazy" decoding="async" />
            <div className="absolute inset-0 hidden items-end justify-center p-8 opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:flex lg:p-12">
              <div className="rounded-full bg-[#130006]/70 p-4 backdrop-blur-sm">
                <p className="pointer-events-none label-stitch mb-2 text-center text-xs text-[#ffe088] opacity-90">Every order is personally handled</p>
                <WhatsAppCTA productName="Aethelgard Earrings" className="bg-[#3a201e] px-6 py-3">Enquire on WhatsApp</WhatsAppCTA>
              </div>
            </div>
          </div>
          <ProductCaption large name="Aethelgard Earrings" price="INR 145,000" />
        </div>

        <div className="flex flex-col gap-12 lg:col-span-5">
          <div className="group relative flex flex-col items-center">
            <div className="h-[360px] w-full overflow-hidden bg-[#f1ede8] sm:h-[420px]">
              <img className="h-full w-full object-cover transition-all duration-700 group-hover:grayscale" alt="Solitaire pendant" src={solitaire} loading="lazy" decoding="async" />
              <div className="absolute inset-0 hidden items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:flex">
                <div className="rounded-md bg-[#130006]/75 p-4">
                  <WhatsAppCTA productName="Solitaire Pendant" className="px-6 py-3">Enquire on WhatsApp</WhatsAppCTA>
                </div>
              </div>
            </div>
            <ProductCaption name="Solitaire Pendant" price="INR 82,000" />
          </div>

          <div className="group relative flex flex-col items-center">
            <div className="h-[360px] w-full overflow-hidden bg-[#f1ede8] sm:h-[420px]">
              <img className="h-full w-full object-cover transition-all duration-700 group-hover:grayscale" alt="Obsidian bangle" src={bangle} loading="lazy" decoding="async" />
              <div className="absolute inset-0 hidden items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:flex">
                <div className="rounded-md bg-[#130006]/75 p-4">
                  <WhatsAppCTA productName="Obsidian Bangle" className="px-6 py-3">Enquire on WhatsApp</WhatsAppCTA>
                </div>
              </div>
            </div>
            <ProductCaption name="Obsidian Bangle" price="INR 210,000" />
          </div>
        </div>
      </div>
    </section>
  );
}
