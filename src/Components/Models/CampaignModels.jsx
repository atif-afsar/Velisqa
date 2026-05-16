import { editorialModels } from "./modelsData";

export default function CampaignModels() {
  return (
    <section className="container-stitch pb-20 md:pb-28">
      <div className="mb-10 flex items-end justify-between border-b border-[#847377]/15 pb-6 md:mb-12">
        <div>
          <p className="type-label text-[#847377]">Editorial</p>
          <h2 className="mt-3 type-section">Campaign Models</h2>
        </div>
      </div>

      <div className="grid auto-rows-[280px] gap-6 sm:auto-rows-[320px] md:grid-cols-4 md:gap-8">
        {editorialModels.map((item) => (
          <article key={item.title} className={`group relative overflow-hidden bg-[#f1ede8] ${item.className || ""}`}>
            <img src={item.image} alt={item.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#130006]/75 to-transparent p-6 text-white">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37]">{item.type}</p>
              <h3 className="mt-2 font-serif text-2xl sm:text-3xl">{item.title}</h3>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
