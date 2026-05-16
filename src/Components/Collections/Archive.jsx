import brooch from "../../assets/collection-lumina-brooch.png";
import { archiveLinks } from "./collectionsData";
import WhatsAppCTA from "../WhatsApp/WhatsAppCTA";

export default function Archive() {
  return (
    <section id="archive" className="container-stitch my-20 md:my-32">
      <div className="flex flex-col items-center gap-12 md:flex-row md:gap-16">
        <div className="w-full md:w-1/2">
          <div className="arched-window relative h-[460px] w-full overflow-hidden bg-[#f1ede8] sm:h-[620px] lg:h-[800px]">
            <img className="h-full w-full object-cover" alt="Celestial diamond brooch in an arched niche" src={brooch} loading="lazy" decoding="async" />
          </div>
        </div>
        <div className="space-y-8 md:w-1/2">
          <span className="type-label text-[#130006]">Masterpieces</span>
          <h2 className="type-display text-[#130006]">The High Jewellery Archive</h2>
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
            <WhatsAppCTA intent="consult" className="bg-[#130006] px-8 py-4 text-[#ffe088] transition-all duration-300 hover:bg-[#6f334a] sm:px-12">
              Book Private Viewing
            </WhatsAppCTA>
          </div>
        </div>
      </div>
    </section>
  );
}
