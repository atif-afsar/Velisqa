import { Link } from "react-router-dom";
import silk from "../../assets/velisqa-silk.png";
import SilkCorners from "./SilkCorners";
import { seasonal } from "./homeData";

export default function SunKissed() {
  return (
    <section className="relative overflow-hidden py-28 text-center">
      <img src={silk} alt="Plum satin texture" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[#3d0a21]/25" />
      <SilkCorners />
      <div className="container-stitch relative z-10">
        <p className="mb-5 type-label text-[#d4af37]/80">Seasonal Edit</p>
        <h2 className="mb-16 type-section uppercase text-[#d4af37]">The Sun-Kissed Series</h2>
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          {seasonal.map(([name, image], index) => (
            <article key={name} className={index === 1 ? "md:translate-y-12" : ""}>
              <div className="luxury-arch aspect-[3/4] overflow-hidden border border-[#d4af37]/25 bg-[#3d0a21]/30">
                <img src={image} alt={name} className="h-full w-full object-cover" />
              </div>
              <p className="mt-6 text-[10px] uppercase tracking-[0.28em] text-[#d4af37]/80">{name}</p>
            </article>
          ))}
        </div>
        <div className="pt-24">
          <Link to="/collections" className="inline-block border border-[#d4af37] px-10 py-4 type-button text-[#d4af37] transition hover:bg-[#d4af37] hover:text-white">
            Discover the Series
          </Link>
        </div>
      </div>
    </section>
  );
}
