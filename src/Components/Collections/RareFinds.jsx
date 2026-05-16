import { rareFinds } from "./collectionsData";

export default function RareFinds() {
  return (
    <section className="section-gap bg-[#3d0a21] text-[#b97189]">
      <div className="container-stitch">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <span className="label-stitch uppercase tracking-widest text-[#ffe088]">Vault Treasures</span>
            <h2 className="mt-2 font-serif text-5xl font-medium leading-[1.2] tracking-[-0.01em] text-white">Rare Finds</h2>
          </div>
          <a className="hidden border-b border-[#ffe088] pb-1 label-stitch uppercase tracking-[0.2em] text-[#ffe088] hover:opacity-80 md:block" href="#archive">
            View the Vault
          </a>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {rareFinds.map((item) => (
            <div key={item.name} className="group relative border border-[#847377]/20 p-4 pb-8 transition-colors hover:border-[#ffe088]/50">
              {item.badge && (
                <div className="absolute top-6 right-6 z-10">
                  <span className="bg-[#ffe088] px-3 py-1 text-[10px] font-semibold uppercase tracking-tighter text-[#130006]">{item.badge}</span>
                </div>
              )}
              <div className="mb-6 h-[450px] overflow-hidden">
                <img className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={item.alt} src={item.image} />
              </div>
              <div className="text-center">
                <h3 className="mb-2 font-serif text-[28px] leading-[1.3] text-white">{item.name}</h3>
                <p className="mb-4 text-base italic text-[#b97189] opacity-70">{item.meta}</p>
                <button className="w-full border border-[#ffe088] py-3 label-stitch uppercase tracking-[0.15em] text-[#ffe088] transition-all hover:bg-[#ffe088] hover:text-[#130006]">
                  Enquire Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
