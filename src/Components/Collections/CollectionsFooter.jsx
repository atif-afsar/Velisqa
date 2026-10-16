export default function CollectionsFooter() {
  return (
    <footer className="bg-ink pb-28 pt-12 md:pb-12">
      <div className="container-stitch flex flex-col items-center justify-between gap-8 text-center md:flex-row md:text-left">
        <div className="mb-8 font-serif text-[32px] leading-[1.3] text-accent-ink md:mb-0">VELISQA</div>
        <div className="mb-8 text-center md:mb-0">
          <p className="text-base leading-[1.6] text-accent-ink opacity-80">Copyright 2026 VELISQA JEWELLERY. Established in India. Newly Launched - 2026.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-5 sm:gap-8">
          {["facebook", "instagram", "pinterest"].map((item) => (
            <a key={item} className="text-accent-ink opacity-80 transition-opacity hover:opacity-100" href="#">
              <span className="label-stitch uppercase tracking-widest">{item}</span>
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
