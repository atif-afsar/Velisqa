import { editorialModels } from "./modelsData";

export default function CampaignModels() {
  return (
    <section className="container-stitch pb-28">
      <div className="mb-12 flex items-end justify-between border-b border-[#847377]/15 pb-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#847377]">Editorial</p>
          <h2 className="mt-3 font-serif text-4xl">Campaign Models</h2>
        </div>
      </div>

      <div className="grid auto-rows-[340px] gap-8 md:grid-cols-4">
        {editorialModels.map((item) => (
          <article key={item.title} className={`group relative overflow-hidden bg-[#f1ede8] ${item.className || ""}`}>
            <img src={item.image} alt={item.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#130006]/75 to-transparent p-6 text-white">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37]">{item.type}</p>
              <h3 className="mt-2 font-serif text-3xl">{item.title}</h3>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
