import model from "../../assets/image2.png";

export default function FounderStory() {
  return (
    <section className="bg-[#fdf9f4] py-28">
      <div className="container-stitch grid items-center gap-20 md:grid-cols-[0.85fr_1.15fr]">
        <div className="luxury-arch max-w-[420px] overflow-hidden border-[12px] border-white shadow-2xl">
          <img src={model} alt="Ananya, VELISQA founder" className="aspect-[4/5] w-full object-cover" />
        </div>
        <div className="max-w-2xl">
          <p className="mb-4 type-label text-[#d4af37]">The Visionary</p>
          <h2 className="type-section text-[#130006]">Modern Femininity<br />Through Authentic<br />Origin</h2>
          <blockquote className="mt-8 border-l border-[#d4af37] pl-7 text-base italic leading-8 text-[#514347]">
            "Jewellery is more than an adornment; it is a silent narrative of one's journey, heritage, and the quiet strength of modern femininity. At VELISQA, we don't just craft gems; we preserve stories."
          </blockquote>
          <p className="mt-8 max-w-xl text-sm leading-7 text-[#514347]">
            Founded on the principles of architectural precision and artisanal soul, VELISQA merges the opulence of the past with the minimalist demands of the future. Each piece is a testament to the enduring spirit of craftsmanship.
          </p>
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#130006]">- Ananya Sharma, Founder</p>
        </div>
      </div>
    </section>
  );
}
