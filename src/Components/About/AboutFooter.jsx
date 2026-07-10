import { Link } from "react-router-dom";

export default function AboutFooter() {
  return (
    <footer className="bg-[#4a0821] pb-28 pt-10 text-[#b97189] md:pb-10">
      <div className="container-stitch flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
        <Link to="/" className="font-serif text-2xl">VELISQA</Link>
        <div className="flex flex-wrap justify-center gap-5 text-[10px] uppercase tracking-[0.16em] sm:gap-8 sm:tracking-[0.2em]">
          <a href="https://facebook.com">Facebook</a>
          <a href="https://instagram.com/velisqa.in">Instagram</a>
          <a href="https://pinterest.com">Pinterest</a>
        </div>
        <p className="text-xs opacity-80">Velisqa creates artificial/imitation fashion jewellery — we do not sell real gold, diamonds, or precious stones.</p>
        <p className="text-xs opacity-80">Copyright 2026 VELISQA JEWELLERY. Established in India. Newly Launched - 2026.</p>
      </div>
    </footer>
  );
}
