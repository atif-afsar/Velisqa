import { rareFinds } from "./collectionsData";
import BuyNowButton from "../WhatsApp/BuyNowButton";

export default function RareFinds() {
  return (
    <section className="section-gap bg-ink text-accent-ink">
      <div className="container-stitch">
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="label-stitch uppercase tracking-widest text-muted">Signature Edits</span>
            <h2 className="mt-2 type-section text-white">Rare Finds</h2>
          </div>
          <a className="hidden border-b border-line pb-1 label-stitch uppercase tracking-[0.2em] text-muted hover:opacity-80 md:block" href="#archive">
            View the Vault
          </a>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
          {rareFinds.map((item) => (
            <div key={item.name} className="group relative border border-muted/20 p-4 pb-8 transition-colors hover:border-line">
              {item.badge && (
                <div className="absolute top-6 right-6 z-10">
                  <span className="bg-ink px-3 py-1 text-[10px] font-semibold uppercase tracking-tighter text-white">{item.badge}</span>
                </div>
              )}
              <div className="mb-6 h-[360px] overflow-hidden sm:h-[450px]">
                <img className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={item.alt} src={item.image} loading="lazy" decoding="async" />
              </div>
              <div className="text-center">
                <h3 className="mb-2 font-serif text-[28px] leading-[1.3] text-white">{item.name}</h3>
                <p className="mb-4 text-base italic text-accent-ink opacity-70">{item.meta}</p>
                <BuyNowButton productName={item.name} productImage={item.image} className="w-full py-3">
                  Buy Now
                </BuyNowButton>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
