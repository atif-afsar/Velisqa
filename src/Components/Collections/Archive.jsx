import brooch from "../../assets/collection-lumina-brooch.png";
import { archiveLinks } from "./collectionsData";

export default function Archive() {
  return (
    <section id="archive" className="container-stitch my-32">
      <div className="flex flex-col items-center gap-16 md:flex-row">
        <div className="md:w-1/2">
          <div className="arched-window relative h-[800px] w-full overflow-hidden bg-[#f1ede8]">
            <img className="h-full w-full object-cover" alt="Celestial diamond brooch in an arched niche" src={brooch} />
          </div>
        </div>
        <div className="space-y-8 md:w-1/2">
          <span className="label-stitch uppercase tracking-[0.4em] text-[#130006]">Masterpieces</span>
          <h2 className="font-serif text-6xl font-semibold leading-[1.1] tracking-[-0.02em] text-[#130006] md:text-7xl">The High Jewellery Archive</h2>
          <p className="body-stitch max-w-lg text-[#514347]">
            Each piece in our High Jewellery collection is a singular creation, born from hundreds of hours of meticulous hand-craftsmanship. Using only the rarest D-color diamonds and ethically sourced emeralds, we sculpt light into wearable art.
          </p>
          <div className="flex flex-col gap-6 pt-4">
            {archiveLinks.map((link) => (
              <div key={link} className="group cursor-pointer">
                <p className="label-stitch uppercase tracking-widest text-[#514347] transition-colors group-hover:text-[#130006]">{link}</p>
                <div className="mt-1 h-px w-0 bg-[#130006] transition-all duration-500 group-hover:w-full" />
              </div>
            ))}
          </div>
          <div className="pt-8">
            <button className="bg-[#130006] px-12 py-4 label-stitch uppercase tracking-[0.2em] text-[#ffe088] transition-all duration-300 hover:bg-[#6f334a]">
              Book Private Viewing
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
