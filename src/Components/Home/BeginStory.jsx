import { Link } from "react-router-dom";
import silk from "../../assets/velisqa-silk.webp";
import SilkCorners from "./SilkCorners";

export default function BeginStory() {
  return (
    <section className="relative overflow-hidden py-28 text-center">
      <img src={silk} alt="Plum satin texture" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[#3d0a21]/30" />
      <SilkCorners />
      <div className="relative z-10 mx-auto max-w-3xl px-6">
        <h2 className="type-display uppercase text-[#d4af37] luxury-text-shadow">Begin Your<br />Story</h2>
        <p className="mx-auto mt-7 max-w-lg text-sm leading-7 text-white/85">
          From timeless icons to modern masterworks, find the piece that resonates with your unique radiance.
        </p>
        <Link to="/collections" className="mt-10 inline-block bg-[#d4af37] px-12 py-4 type-button text-[#3d0a21] transition hover:bg-white">
          Explore Full Collection
        </Link>
      </div>
    </section>
  );
}
