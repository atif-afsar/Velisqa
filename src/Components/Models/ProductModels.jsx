import { productModels } from "./modelsData";

export default function ProductModels() {
  return (
    <section className="bg-[#3d0a21] py-28">
      <div className="container-stitch">
        <div className="mb-12 text-center">
          <p className="mb-4 text-[10px] uppercase tracking-[0.4em] text-[#d4af37]">Collection Assets</p>
          <h2 className="font-serif text-5xl text-white">Product Models</h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {productModels.map(([title, type, image]) => (
            <article key={title} className="group">
              <div className="luxury-arch aspect-[3/4] overflow-hidden border border-[#d4af37]/20 bg-[#130006]/30">
                <img src={image} alt={title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
              </div>
              <div className="pt-5 text-center">
                <h3 className="font-serif text-2xl text-white">{title}</h3>
                <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-[#d4af37]/80">{type}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
