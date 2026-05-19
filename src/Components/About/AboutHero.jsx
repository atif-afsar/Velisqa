import silk from "../../assets/velisqa-silk.webp";

export default function AboutHero() {
  return (
    <section className="relative flex min-h-svh items-center justify-center overflow-hidden px-4 py-20 text-center md:px-6 md:py-24">
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
        <h1 className="type-display text-white luxury-text-shadow">About Velisqa Jewellery</h1>
        <div className="mx-auto mt-7 h-px w-20 bg-[#d4af37]" />
      </div>
    </section>
  );
}
