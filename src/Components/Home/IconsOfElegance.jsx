import Icon from "./Icon";
import { icons } from "./homeData";

export default function IconsOfElegance() {
  return (
    <section className="bg-[#f9f5f0] py-16 md:py-24">
      <div className="container-stitch">
        <div className="mb-10 flex flex-col gap-6 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 type-label text-[#847377]">Curated Selection</p>
            <h2 className="type-section text-[#130006]">Icons of Elegance</h2>
          </div>
          <div className="hidden gap-3 md:flex">
            <button className="grid h-9 w-9 place-items-center border border-[#847377]/30 text-[#514347]"><Icon className="text-[18px]">chevron_left</Icon></button>
            <button className="grid h-9 w-9 place-items-center border border-[#847377]/30 text-[#514347]"><Icon className="text-[18px]">chevron_right</Icon></button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-8 min-[390px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {icons.map(([name, type, image]) => (
            <article key={name} className="text-center">
              <div className="luxury-arch mb-5 aspect-[3/4.3] overflow-hidden bg-[#eae3db]">
                <img src={image} alt={name} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 hover:scale-105" />
              </div>
              <h3 className="type-card-title text-[#130006]">{name}</h3>
              <p className="mt-1 type-label text-[#847377]">{type}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
