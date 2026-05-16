import silk from "../../assets/velisqa-silk.png";
import SilkCorners from "./SilkCorners";

export default function AboutHero() {
  return (
    <section className="relative flex min-h-[630px] items-center justify-center overflow-hidden text-center">
      <img src={silk} alt="Deep plum silk" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[#130006]/15" />
      <SilkCorners />
      <div className="relative z-10 px-6">
        <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.35em] text-[#d4af37]">Established 1998</p>
        <h1 className="font-serif text-5xl font-semibold leading-tight text-white md:text-7xl">A Legacy of Radiance</h1>
        <div className="mx-auto mt-7 h-px w-20 bg-[#d4af37]" />
      </div>
    </section>
  );
}
