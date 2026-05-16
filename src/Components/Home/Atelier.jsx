export default function Atelier() {
  return (
    <section className="bg-[#f9f5f0] px-4 py-20 md:py-28">
      <div className="mx-auto max-w-3xl border border-[#d4af37]/30 bg-white/50 px-5 py-12 text-center sm:px-8 md:px-20 md:py-14">
        <p className="mb-6 type-label text-[#d4af37]">The Velisqa Atelier</p>
        <h2 className="type-section text-[#130006]">Private Consultations</h2>
        <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-[#514347]">
          Experience the aura of Velisqa in a private setting. Our artisans are available for bespoke commissions and personalized styling.
        </p>
        <form className="mt-10 grid gap-6 md:grid-cols-2">
          <input className="border-0 border-b border-[#847377]/35 bg-transparent py-3 text-[11px] uppercase tracking-[0.2em] outline-none" placeholder="FULL NAME" />
          <input className="border-0 border-b border-[#847377]/35 bg-transparent py-3 text-[11px] uppercase tracking-[0.2em] outline-none" placeholder="PREFERRED DATE" />
          <button className="tap-target bg-[#3d0a21] px-8 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d4af37] md:col-span-2 md:mx-auto md:px-10">Request Appointment</button>
        </form>
      </div>
    </section>
  );
}
