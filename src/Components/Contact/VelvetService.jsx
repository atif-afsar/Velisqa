import serviceImage from "../../assets/contact-velvet-service.png";

export default function VelvetService() {
  return (
    <section className="relative mb-32 flex h-[600px] items-center justify-center overflow-hidden">
      <img className="absolute inset-0 h-full w-full object-cover" alt="Private consultation room in a jewelry atelier" src={serviceImage} />
      <div className="absolute inset-0 bg-[#130006]/40" />
      <div className="relative z-10 max-w-2xl px-6 text-center text-white">
        <h2 className="mb-6 font-serif text-[40px] font-medium leading-[1.2]">Experience the Velvet Service</h2>
        <p className="body-stitch mb-10 opacity-90">Our private viewings are curated experiences designed to let you feel the weight of craftsmanship in total privacy.</p>
        <a className="inline-block border border-white px-10 py-5 label-stitch uppercase tracking-[0.2em] transition hover:bg-white hover:text-[#130006]" href="#top">
          Book a Private Consultation
        </a>
      </div>
    </section>
  );
}
