import aethelgard from "../../assets/collection-aethelgard-earrings.png";
import solitaire from "../../assets/collection-solitaire-pendant.png";
import bangle from "../../assets/collection-obsidian-bangle.png";
import ProductCaption from "./ProductCaption";

export default function SignatureCollection() {
  return (
    <section id="signature" className="container-stitch mb-32">
      <div className="mb-16 flex flex-col items-center">
        <h2 className="mb-2 font-serif text-[40px] font-medium italic leading-[1.2] text-[#130006]">The Signature Collection</h2>
        <div className="h-px w-24 bg-[#e9c349]" />
      </div>

      <div className="grid h-auto grid-cols-1 gap-8 md:grid-cols-12">
        <div className="group relative md:col-span-7">
          <div className="arched-window h-[700px] w-full overflow-hidden bg-[#f1ede8]">
            <img className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Aethelgard emerald earrings" src={aethelgard} />
            <div className="absolute inset-0 flex items-end justify-center bg-[#130006]/10 p-12 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <button className="bg-[#130006] px-8 py-3 label-stitch uppercase tracking-widest text-[#ffe088]">ADD TO BAG</button>
            </div>
          </div>
          <ProductCaption large name="Aethelgard Earrings" price="INR 145,000" />
        </div>

        <div className="flex flex-col gap-12 md:col-span-5">
          <div className="group relative flex flex-col items-center">
            <div className="h-[400px] w-full overflow-hidden bg-[#f1ede8]">
              <img className="h-full w-full object-cover transition-all duration-700 group-hover:grayscale" alt="Solitaire pendant" src={solitaire} />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <button className="bg-[#130006] px-8 py-3 label-stitch uppercase tracking-widest text-[#ffe088]">BUY NOW</button>
              </div>
            </div>
            <ProductCaption name="Solitaire Pendant" price="INR 82,000" />
          </div>

          <div className="group relative flex flex-col items-center">
            <div className="h-[400px] w-full overflow-hidden bg-[#f1ede8]">
              <img className="h-full w-full object-cover transition-all duration-700 group-hover:grayscale" alt="Obsidian bangle" src={bangle} />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <button className="bg-[#130006] px-8 py-3 label-stitch uppercase tracking-widest text-[#ffe088]">BUY NOW</button>
              </div>
            </div>
            <ProductCaption name="Obsidian Bangle" price="INR 210,000" />
          </div>
        </div>
      </div>
    </section>
  );
}
