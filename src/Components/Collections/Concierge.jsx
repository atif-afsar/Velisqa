import WhatsAppCTA from "../WhatsApp/WhatsAppCTA";

export default function Concierge() {
  return (
    <section id="contact" className="mx-auto mb-20 max-w-[900px] px-4 text-center md:mb-32 md:px-6">
      <h3 className="mb-6 type-section italic text-ink">Bespoke Concierge</h3>
      <p className="mb-6 text-base leading-[1.6] text-body">
        Join our inner circle for early access to high-jewellery launches and private collection previews.
      </p>
      <p className="mb-8 text-sm text-body">Every order is personally handled by our team. For secure purchases, please contact our concierge on WhatsApp.</p>

      <form className="mb-8 flex flex-col items-stretch gap-6 md:flex-row md:items-end md:gap-8">
        <div className="w-full flex-1">
          <label className="mb-2 block text-left label-stitch uppercase tracking-widest text-body">Email Address</label>
          <input className="line-input w-full bg-transparent py-3 text-base text-ink placeholder:text-muted/30 focus:border-line focus:outline-none" placeholder="YOUR@EMAIL.COM" type="email" />
        </div>
        <button className="tap-target w-full bg-ink px-10 py-4 label-stitch uppercase tracking-widest text-white md:w-auto" type="submit">Subscribe</button>
      </form>

      <div className="mx-auto max-w-[700px]">
        <p className="mb-4 text-sm text-body">Prefer to speak with our advisors? Use WhatsApp for private assistance and white-glove delivery.</p>
        <div className="flex items-center justify-center">
          <WhatsAppCTA intent="consult">Luxury Concierge via WhatsApp</WhatsAppCTA>
        </div>
      </div>
    </section>
  );
}
