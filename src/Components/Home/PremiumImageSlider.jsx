const sliderImages = [
  { src: "/images/img2.webp", width: 800, height: 800 },
  { src: "/images/img3.webp", width: 798, height: 798 },
  { src: "/images/img4.webp", width: 800, height: 793 },
  { src: "/images/img5.webp", width: 642, height: 796 },
  { src: "/images/img6.webp", width: 792, height: 795 },
  { src: "/images/img7.webp", width: 640, height: 798 },
  { src: "/images/img8.webp", width: 795, height: 791 },
  { src: "/images/img9.webp", width: 798, height: 788 },
];

export default function PremiumImageSlider() {
  return (
    <section className="overflow-hidden bg-[#f9f5f0] py-12 md:py-20">
      <div className="container-stitch">
        <div className="mx-auto grid max-w-[420px] grid-cols-1 gap-5 sm:max-w-none sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
          {sliderImages.map((image, index) => (
            <figure
              key={image.src}
              className="group relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-[1.25rem] bg-[#f1ede8] p-2 shadow-[0_18px_46px_rgba(19,0,6,0.10)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(19,0,6,0.16)] sm:p-3"
            >
              <img
                src={image.src}
                alt={`VELISQA gallery image ${index + 1}`}
                width={image.width}
                height={image.height}
                loading="lazy"
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
