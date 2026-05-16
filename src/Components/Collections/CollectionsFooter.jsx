export default function CollectionsFooter() {
  return (
    <footer className="bg-[#3d0a21] py-12">
      <div className="container-stitch flex flex-col items-center justify-between md:flex-row">
        <div className="mb-8 font-serif text-[32px] leading-[1.3] text-[#b97189] md:mb-0">VELISQA</div>
        <div className="mb-8 text-center md:mb-0">
          <p className="text-base leading-[1.6] text-[#b97189] opacity-80">Copyright 2026 VELISQA JEWELLERY. Established in India. Newly Launched - 2026.</p>
        </div>
        <div className="flex gap-8">
          {["facebook", "instagram", "pinterest"].map((item) => (
            <a key={item} className="text-[#b97189] opacity-80 transition-opacity hover:opacity-100" href="#">
              <span className="label-stitch uppercase tracking-widest">{item}</span>
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
