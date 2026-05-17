const sliderImages = [
  "/images/img2.png",
  "/images/img3.png",
  "/images/img4.png",
  "/images/img5.png",
  "/images/img6.png",
  "/images/img7.png",
  "/images/img8.png",
  "/images/img9.png",
];

export default function PremiumImageSlider() {
  return (
    <section className="overflow-hidden bg-[#f9f5f0] py-12 md:py-20">
      <div className="container-stitch">
        <div className="mx-auto grid max-w-[420px] grid-cols-1 gap-5 sm:max-w-none sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
          {sliderImages.map((image, index) => (
            <figure
              key={image}
              className="group relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-[1.25rem] bg-[#f1ede8] p-2 shadow-[0_18px_46px_rgba(19,0,6,0.10)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(19,0,6,0.16)] sm:p-3"
            >
              <img
                src={image}
                alt={`VELISQA gallery image ${index + 1}`}
                loading={index < 4 ? "eager" : "lazy"}
                decoding="async"
                className="h-full w-full object-contain transition duration-700 group-hover:scale-[1.015]"
              />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
