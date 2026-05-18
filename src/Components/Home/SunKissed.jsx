import { Link } from "react-router-dom";
import silk from "../../assets/velisqa-silk.webp";
import SilkCorners from "./SilkCorners";
import { seasonal } from "./homeData";

export default function SunKissed() {
  return (
    <section className="relative overflow-hidden py-20 text-center md:py-28">
      <img src={silk} alt="Plum satin texture" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[#3d0a21]/25" />
      <SilkCorners />
      <div className="container-stitch relative z-10">
        <p className="mb-5 type-label text-[#d4af37]/80">Seasonal Edit</p>
        <h2 className="mb-12 type-section uppercase text-[#d4af37] md:mb-16">The Sun-Kissed Series</h2>
        <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {seasonal.map(([name, image], index) => (
            <article key={name} className={index % 2 === 1 ? "lg:translate-y-10" : ""}>
              <div className="luxury-arch aspect-[3/4] overflow-hidden border border-[#d4af37]/25 bg-[#3d0a21]/30">
                <img src={image} alt={name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
              </div>
              <p className="mt-6 text-[10px] uppercase tracking-[0.28em] text-[#d4af37]/80">{name}</p>
            </article>
          ))}
        </div>
        <div className="pt-16 md:pt-24">
          <Link to="/collections" className="tap-target inline-flex items-center justify-center border border-[#d4af37] px-8 py-4 type-button text-[#d4af37] transition hover:bg-[#d4af37] hover:text-white sm:px-10">
            Discover the Series
          </Link>
        </div>
      </div>
    </section>
  );
}
