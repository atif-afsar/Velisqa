import serviceImage from "../../assets/contact-velvet-service.png";

export default function VelvetService() {
  return (
    <section className="relative mb-20 flex min-h-[460px] items-center justify-center overflow-hidden md:mb-32 md:min-h-[600px]">
      <img className="absolute inset-0 h-full w-full object-cover" alt="Private consultation room in a jewelry atelier" src={serviceImage} loading="lazy" decoding="async" />
      <div className="absolute inset-0 bg-[#130006]/40" />
      <div className="relative z-10 max-w-2xl px-6 text-center text-white">
        <h2 className="mb-6 type-section text-white">Experience the Velvet Service</h2>
        <p className="body-stitch mb-10 opacity-90">Our private viewings are curated experiences designed to let you feel the weight of craftsmanship in total privacy.</p>
        <a className="tap-target inline-flex items-center justify-center border border-white px-7 py-4 label-stitch uppercase tracking-[0.14em] transition hover:bg-white hover:text-[#130006] sm:px-10 sm:py-5 sm:tracking-[0.2em]" href="#top">
          Book a Private Consultation
        </a>
      </div>
    </section>
  );
}
