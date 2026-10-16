import brooch from "../../assets/collection-lumina-brooch.webp";
import { archiveLinks } from "./collectionsData";
import WhatsAppCTA from "../WhatsApp/WhatsAppCTA";

export default function Archive() {
  return (
    <section id="archive" className="container-stitch my-20 md:my-32">
      <div className="flex flex-col items-center gap-12 md:flex-row md:gap-16">
        <div className="w-full md:w-1/2">
          <div className="arched-window relative h-[460px] w-full overflow-hidden bg-mist sm:h-[620px] lg:h-[800px]">
            <img className="h-full w-full object-cover" alt="Celestial crystal-accent brooch in an arched niche" src={brooch} loading="lazy" decoding="async" />
          </div>
        </div>
        <div className="space-y-8 md:w-1/2">
          <span className="type-label text-ink">Masterpieces</span>
          <h2 className="type-display text-ink">The Statement Collection Archive</h2>
          <p className="body-stitch max-w-lg text-body">
            Each piece in our Statement Collection is a singular creation, born from hundreds of hours of meticulous hand-craftsmanship. Premium alloy bases, gold-tone plating, and handset AD stones sculpt light into wearable art.
          </p>
          <div className="flex flex-col gap-6 pt-4">
            {archiveLinks.map((link) => (
              <div key={link} className="group cursor-pointer">
                <p className="label-stitch uppercase tracking-widest text-body transition-colors group-hover:text-ink">{link}</p>
                <div className="mt-1 h-px w-0 bg-ink transition-all duration-500 group-hover:w-full" />
              </div>
            ))}
          </div>
          <div className="pt-8">
            <WhatsAppCTA intent="consult" className="bg-ink px-8 py-4 text-white transition-all duration-300 hover:bg-ink-soft sm:px-12">
              Book Private Viewing
            </WhatsAppCTA>
          </div>
        </div>
      </div>
    </section>
  );
}
