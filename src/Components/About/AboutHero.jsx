import silk from "../../assets/velisqa-silk.webp";

export default function AboutHero() {
  return (
    <section className="relative flex min-h-[calc(100svh-68px)] items-center justify-center overflow-hidden px-4 py-20 text-center md:min-h-[630px]">
      <img
        src={silk}
        alt="Deep plum silk"
        width="512"
        height="293"
        loading="eager"
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover"
        decoding="async"
      />
      <div className="absolute inset-0 bg-[#130006]/15" />
      <div className="relative z-10 px-6">
        <p className="mb-5 type-label text-[#d4af37]">Established 1998</p>
        <h1 className="type-display text-white luxury-text-shadow">A Legacy of Radiance</h1>
        <div className="mx-auto mt-7 h-px w-20 bg-[#d4af37]" />
      </div>
    </section>
  );
}
