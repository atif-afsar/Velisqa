import Icon from "./Icon";

export default function Testimonial() {
  return (
    <section className="bg-[#f9f5f0] py-24 text-center">
      <p className="mb-10 text-[10px] uppercase tracking-[0.45em] text-[#d4af37]">Voices of Distinction</p>
      <blockquote className="mx-auto max-w-4xl font-serif text-3xl italic leading-tight text-[#3d0a21] md:text-5xl">
        "Velisqa doesn't just make jewellery; they curate emotion. My custom bridal set felt like a heritage piece from the moment I first wore it."
      </blockquote>
      <p className="mt-8 text-[10px] uppercase tracking-[0.25em] text-[#847377]">Sonia R., Architectural Designer</p>
      <div className="mt-10 flex justify-center gap-4">
        <button className="grid h-10 w-10 place-items-center rounded-full border border-[#847377]/20"><Icon className="text-[18px]">west</Icon></button>
        <button className="grid h-10 w-10 place-items-center rounded-full border border-[#847377]/20"><Icon className="text-[18px]">east</Icon></button>
      </div>
    </section>
  );
}
