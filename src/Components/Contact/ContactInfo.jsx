import Icon from "./Icon";

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
            <Icon>call</Icon>
            <span className="body-stitch">+91 (22) 8888 0000</span>
          </a>
          <a className="flex items-center gap-4 text-[#130006] transition hover:opacity-70" href="mailto:private@velisqa.com">
            <Icon>mail</Icon>
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
