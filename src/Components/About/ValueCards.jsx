import { values } from "./aboutData";

export default function ValueCards() {
  return (
    <section className="bg-[#f7f3ee] py-24">
      <div className="container-stitch grid gap-8 md:grid-cols-3">
        {values.map(([title, copy]) => (
          <article key={title} className="bg-white/65 p-12 text-center">
            <h3 className="mb-5 text-[10px] font-semibold uppercase tracking-[0.35em] text-[#130006]">{title}</h3>
            <p className="text-sm leading-7 text-[#514347]">{copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
