import Icon from "./Icon";
import { values } from "./homeData";

export default function Ethos() {
  return (
    <section id="ethos" className="relative overflow-hidden bg-[#f9f5f0] py-16 md:py-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#f1ede8] to-transparent" />
      <div className="container-stitch relative grid items-center gap-12 lg:grid-cols-12 lg:gap-14 xl:gap-20">
        <div className="space-y-10 lg:col-span-5">
          <div>
            <p className="mb-5 type-label text-[#d4af37]">Our Philosophy</p>
            <h2 className="type-section text-[#130006]">
              The Velisqa
              <br />
              Ethos
            </h2>
            <p className="mt-7 max-w-md type-body-luxury text-[#514347]">
              Our pieces are more than adornments; they are milestones of the feminine journey, crafted with soul and precision.
            </p>
          </div>
          <div className="space-y-7">
            {values.map(([icon, title, copy]) => (
              <div key={title} className="flex gap-5 sm:gap-6">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3d0a21] text-[#d4af37] shadow-[0_14px_34px_rgba(61,10,33,0.18)]">
                  <Icon className="text-[21px]">{icon}</Icon>
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-[0.1em] text-[#130006]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#514347]/80">{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative lg:col-span-7">
          <div className="absolute -inset-4 rounded-[2.25rem] bg-[#3d0a21] opacity-95 shadow-[0_34px_95px_rgba(61,10,33,0.28)] md:-inset-5 lg:-right-2 lg:left-8" />
          <div className="absolute -bottom-5 -left-5 hidden h-28 w-28 rounded-full bg-[#d4af37]/22 blur-2xl md:block" />
          <div className="relative mx-auto max-w-[760px] overflow-hidden rounded-[1.75rem] shadow-[0_28px_80px_rgba(19,0,6,0.24)] lg:ml-auto">
            <img
              src="/images/img1.png"
              alt="VELISQA premium jewellery showcase"
              loading="lazy"
              decoding="async"
              className="aspect-[3/2] w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[#130006]/24 via-transparent to-[#d4af37]/10" />
          </div>
        </div>
      </div>
    </section>
  );
}
