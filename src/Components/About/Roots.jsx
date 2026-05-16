import Icon from "./Icon";
import { roots } from "./aboutData";

export default function Roots() {
  return (
    <section className="bg-[#4a0821] py-20 text-center text-white md:py-24">
      <div className="container-stitch">
        <p className="mb-5 type-label text-[#d4af37]">Three Generations</p>
        <h2 className="type-section text-white">Our Jaipur Roots</h2>
        <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-white/85">
          In the heart of the Pink City, our story began in a small atelier. Today, that legacy of intricate hand-carving and gemstone selection continues to define the VELISQA signature.
        </p>
        <div className="mt-14 grid gap-8 md:mt-20 md:grid-cols-3">
          {roots.map(([icon, title, copy]) => (
            <article key={title}>
              <div className="mx-auto grid aspect-[1.25/1] max-w-[340px] place-items-center rounded-t-[180px] bg-white/7">
                <Icon className="text-5xl text-[#d4af37]">{icon}</Icon>
              </div>
              <h3 className="mt-5 font-serif text-2xl">{title}</h3>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-white/75">{copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
