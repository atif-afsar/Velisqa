export default function Concierge() {
  return (
    <section id="contact" className="mx-auto mb-32 max-w-[800px] px-6 text-center">
      <h3 className="mb-6 font-serif text-[40px] font-medium italic leading-[1.2] text-[#130006]">Bespoke Concierge</h3>
      <p className="mb-12 text-base leading-[1.6] text-[#514347]">
        Join our inner circle for early access to high-jewellery launches and private collection previews.
      </p>
      <form className="flex flex-col items-end gap-8 md:flex-row">
        <div className="w-full flex-1">
          <label className="mb-2 block text-left label-stitch uppercase tracking-widest text-[#514347]">Email Address</label>
          <input className="line-input w-full bg-transparent py-3 text-base text-[#130006] placeholder:text-[#847377]/30 focus:border-[#e9c349] focus:outline-none" placeholder="YOUR@EMAIL.COM" type="email" />
        </div>
        <button className="w-full bg-[#130006] px-12 py-4 label-stitch uppercase tracking-widest text-[#ffe088] md:w-auto" type="submit">Subscribe</button>
      </form>
    </section>
  );
}
