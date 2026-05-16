import craftsmanship from "../../assets/velisqa-craftsmanship.png";

export default function Legacy() {
  return (
    <section className="bg-[#f9f5f0] py-24">
      <div className="container-stitch grid items-center gap-20 md:grid-cols-2">
        <div className="luxury-arch aspect-[4/5] overflow-hidden bg-[#ebe8e3] shadow-2xl">
          <img src={craftsmanship} alt="Jewellery craftsmanship" className="h-full w-full object-cover" />
        </div>
        <div>
          <p className="mb-5 type-label text-[#d4af37]">Our Heritage</p>
          <h2 className="type-section text-[#130006]">A Legacy of<br />Brilliance</h2>
          <p className="mt-8 max-w-lg type-body-luxury text-[#514347]">
            From the heart of Jaipur to the modern world, our pieces are a testament to three generations of master goldsmiths. Every curve is considered, every stone hand-selected to ensure that every VELISQA piece carries the soul of its makers.
          </p>
          <a href="#ethos" className="mt-10 inline-block border-b border-[#130006] pb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#130006]">Learn Our History</a>
        </div>
      </div>
    </section>
  );
}
