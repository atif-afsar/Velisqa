import { Link } from "react-router-dom";
import Icon from "./Icon";
import { icons } from "./homeData";

export default function IconsOfElegance() {
  return (
    <section className="bg-[#f9f5f0] py-16 md:py-24">
      <div className="container-stitch">
        <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-12">
          <div>
            <p className="mb-3 type-label text-[#847377]">Curated Selection</p>
            <h2 className="type-section text-[#130006]">Icons of Elegance</h2>
          </div>
        </div>
        <div className="mx-auto grid max-w-[560px] grid-cols-2 gap-4 sm:max-w-none sm:gap-7 lg:grid-cols-4 lg:gap-6 xl:gap-8">
          {icons.map(([name, type, image]) => (
            <article key={name} className="group text-center">
              <div className="mb-6 aspect-[4/5] overflow-hidden rounded-[1.4rem] bg-[#eee8df] shadow-[0_18px_48px_rgba(19,0,6,0.10)] transition duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_24px_64px_rgba(19,0,6,0.16)]">
                <img
                  src={image}
                  alt={name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
              </div>
              <h3 className="font-serif text-[clamp(1.55rem,3.8vw,2.1rem)] leading-tight text-[#130006]">{name}</h3>
              <p className="mt-1 type-label text-[#847377]">{type}</p>
            </article>
          ))}
        </div>
        <div className="mt-12 flex justify-center md:mt-14">
          <Link
            to="/collections"
            className="tap-target group inline-flex items-center justify-center gap-3 rounded-full bg-[#3d0a21] px-7 py-4 type-button text-[#f7ead0] shadow-[0_18px_42px_rgba(61,10,33,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#130006] hover:shadow-[0_22px_54px_rgba(61,10,33,0.30)] sm:px-9"
          >
            Explore Collections
            <Icon className="text-[18px] transition duration-300 group-hover:translate-x-1">arrow_forward</Icon>
          </Link>
        </div>
      </div>
    </section>
  );
}
