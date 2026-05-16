import { Link } from "react-router-dom";
import silk from "../../assets/velisqa-silk.png";
import SilkCorners from "./SilkCorners";

export default function BeginStory() {
  return (
    <section className="relative overflow-hidden py-28 text-center">
      <img src={silk} alt="Plum satin texture" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[#3d0a21]/30" />
      <SilkCorners />
      <div className="relative z-10 mx-auto max-w-3xl px-6">
        <h2 className="font-serif text-5xl font-semibold uppercase leading-tight text-[#d4af37] md:text-7xl">Begin Your<br />Story</h2>
        <p className="mx-auto mt-7 max-w-lg text-sm leading-7 text-white/85">
          From timeless icons to modern masterworks, find the piece that resonates with your unique radiance.
        </p>
        <Link to="/collections" className="mt-10 inline-block bg-[#d4af37] px-12 py-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#3d0a21] transition hover:bg-white">
          Explore Full Collection
        </Link>
      </div>
    </section>
  );
}
