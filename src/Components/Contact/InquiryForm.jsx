export default function InquiryForm() {
  const fieldClass = "border border-[#130006]/35 bg-transparent px-3 py-3 text-sm text-[#130006] outline-none transition focus:border-[#e9c349] placeholder:text-[#847377]/45";

  return (
    <section className="bg-[#f7f3ee] p-5 shadow-[32px_32px_64px_-16px_rgba(19,0,6,0.04)] sm:p-8 md:p-12 lg:col-span-8">
      <h2 className="mb-8 type-section text-[#130006]">Bespoke Inquiry</h2>
      <form className="space-y-9">
        <div className="grid grid-cols-1 gap-9 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="label-stitch uppercase tracking-wider text-[#514347]">Full Name</label>
            <input className={fieldClass} placeholder="Gautam Adani" type="text" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="label-stitch uppercase tracking-wider text-[#514347]">Email Address</label>
            <input className={fieldClass} placeholder="client@luxury.com" type="email" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="label-stitch uppercase tracking-wider text-[#514347]">Nature of Inquiry</label>
          <select className={fieldClass} defaultValue="Custom Engagement Design">
            <option>Custom Engagement Design</option>
            <option>High Jewellery Viewing</option>
            <option>Heirloom Restoration</option>
            <option>Media & Partnerships</option>
            <option>General Concierge</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="label-stitch uppercase tracking-wider text-[#514347]">Your Message</label>
          <textarea className={`${fieldClass} min-h-32 resize-none`} placeholder="Describe your vision or the collection of interest..." />
        </div>
        <div className="flex justify-end">
          <button className="tap-target w-full bg-[#130006] px-8 py-4 label-stitch uppercase tracking-[0.18em] text-white transition hover:bg-[#b97189] sm:w-auto sm:px-12 sm:tracking-[0.2em]" type="submit">
            Submit Inquiry
          </button>
        </div>
      </form>
    </section>
  );
}
