import { Link } from "react-router-dom";

export default function HomeFooter() {
  return (
    <footer id="contact" className="bg-[#3d0a21] pb-28 pt-14 text-[#f9f5f0] md:pb-16">
      <div className="container-stitch grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h2 className="font-serif text-3xl tracking-[0.25em] text-[#d4af37]">VELISQA</h2>
          <p className="mt-6 text-sm leading-7 text-white/55">A heritage of elegance, crafted for the modern visionary.</p>
        </div>
        <div>
          <h3 className="mb-5 text-[11px] uppercase tracking-[0.25em] text-[#d4af37]">Collections</h3>
          <Link className="block text-sm text-white/55 hover:text-[#d4af37]" to="/collections">High Jewellery</Link>
          <Link className="mt-3 block text-sm text-white/55 hover:text-[#d4af37]" to="/collections">The Sun-Kissed Series</Link>
          <Link className="mt-3 block text-sm text-white/55 hover:text-[#d4af37]" to="/collections">Daily Icons</Link>
        </div>
        <div>
          <h3 className="mb-5 text-[11px] uppercase tracking-[0.25em] text-[#d4af37]">Concierge</h3>
          <p className="text-sm text-white/55">hello@velisqa.com</p>
          <p className="mt-3 text-sm text-white/55">@velisqa.in</p>
        </div>
        <div>
          <h3 className="mb-5 text-[11px] uppercase tracking-[0.25em] text-[#d4af37]">The Inner Circle</h3>
          <input className="w-full border-0 border-b border-[#d4af37]/30 bg-transparent py-3 text-sm outline-none placeholder:text-white/30" placeholder="EMAIL ADDRESS" />
        </div>
      </div>
      <div className="container-stitch mt-12 border-t border-[#d4af37]/10 pt-6 text-[10px] uppercase tracking-[0.14em] text-white/35 sm:tracking-[0.2em]">
        Copyright 2026 VELISQA JEWELLERY. All rights reserved.
      </div>
    </footer>
  );
}
