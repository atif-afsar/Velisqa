export default function InnerCircle() {
  return (
    <section className="bg-[#fdf9f4] py-28 text-center">
      <h2 className="font-serif text-5xl text-[#130006]">The Inner Circle</h2>
      <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-[#514347]">
        Receive seasonal narratives, private collection previews, and invitations to our intimate Jaipur atelier gatherings.
      </p>
      <form className="mx-auto mt-10 flex max-w-xl flex-col gap-4 sm:flex-row">
        <input className="flex-1 border border-[#847377]/30 bg-transparent px-5 py-4 text-[11px] uppercase tracking-[0.22em] outline-none" placeholder="Your Email Address" type="email" />
        <button className="bg-[#130006] px-10 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-white">Join</button>
      </form>
    </section>
  );
}
