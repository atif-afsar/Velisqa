function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7.2 4.5 9.4 9l-1.8 1.3c.9 1.9 2.3 3.4 4.2 4.3l1.4-1.8 4.4 2.1-.7 3.2c-.2.8-.9 1.3-1.7 1.2C9.4 18.7 5.3 14.6 4.7 8.8c-.1-.8.4-1.5 1.2-1.7l1.3-.3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.5 7.25h15v10.5h-15V7.25Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="m5 8 7 5 7-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ContactInfo() {
  return (
    <aside className="space-y-12 lg:col-span-4">
      <div>
        <h3 className="mb-4 label-stitch uppercase tracking-[0.2em] text-[#514347]">The Atelier</h3>
        <p className="mb-2 font-serif text-3xl leading-[1.3] text-[#130006]">Heritage House</p>
        <p className="text-base leading-relaxed text-[#514347]">
          Colaba Arts District,<br />
          Mumbai, Maharashtra 400001<br />
          India
        </p>
        <div className="mt-4 w-12 border-t border-[#e9c349]/30 pt-4" />
      </div>

      <div>
        <h3 className="mb-4 label-stitch uppercase tracking-[0.2em] text-[#514347]">Direct Communication</h3>
        <div className="space-y-4">
          <a className="flex items-center gap-4 text-[#130006] transition hover:opacity-70" href="tel:+912288880000">
            <PhoneIcon />
            <span className="body-stitch">+91 (22) 8888 0000</span>
          </a>
          <a className="flex items-center gap-4 text-[#130006] transition hover:opacity-70" href="mailto:private@velisqa.com">
            <MailIcon />
            <span className="body-stitch">private@velisqa.com</span>
          </a>
        </div>
      </div>

      <div>
        <h3 className="mb-4 label-stitch uppercase tracking-[0.2em] text-[#514347]">Global Hours</h3>
        <p className="text-base leading-relaxed text-[#514347]">
          Monday - Saturday<br />
          10:00 AM - 7:00 PM IST
        </p>
        <p className="mt-2 text-base italic text-[#e9c349]">By Appointment Only</p>
      </div>
    </aside>
  );
}
