import { useState, useEffect, useCallback, useRef } from "react";

import heroImage1 from "../../assets/hero/hero1.webp";
import heroImage2 from "../../assets/hero/hero2.webp";
import heroImage3 from "../../assets/hero/hero3.webp";
import heroImage4 from "../../assets/hero/hero4.webp";

const SLIDES = [
  {
    id: "slide-1",
    src: heroImage1,
    alt: "Velisqa Fine Jewellery Showcase 1",
  },
  {
    id: "slide-2",
    src: heroImage2,
    alt: "Velisqa Fine Jewellery Showcase 2",
  },
  {
    id: "slide-3",
    src: heroImage3,
    alt: "Velisqa Fine Jewellery Showcase 3",
  },
  {
    id: "slide-4",
    src: heroImage4,
    alt: "Velisqa Fine Jewellery Showcase 4",
  },
];

const AUTO_SLIDE_INTERVAL = 3000; // 3 seconds slide interval

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  // Auto-slide every 3 seconds continuously
  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, AUTO_SLIDE_INTERVAL);

    return () => clearInterval(timer);
  }, [currentSlide, nextSlide]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) {
      nextSlide();
    } else if (diff < -50) {
      prevSlide();
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  return (
    <section
      className="relative w-full overflow-hidden select-none"
      style={{ marginTop: "calc(var(--nav-height) + env(safe-area-inset-top, 0px))" }}
      aria-label="Featured Jewellery Hero Carousel"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <h1 className="sr-only">Velisqa Fine Jewellery Banner Carousel</h1>

      {/* Preload first slide for instantaneous rendering */}
      <link rel="preload" as="image" href={heroImage1} fetchPriority="high" />

      {/* Slide Container */}
      <div className="relative w-full aspect-[16/9] sm:aspect-[2.2/1] md:aspect-[2.5/1] lg:aspect-[2.9/1] overflow-hidden bg-[#f9f5f0]">
        {/* Horizontal Track for Smooth Sliding Effect */}
        <div
          className="absolute inset-0 flex w-full h-full transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {SLIDES.map((slide, index) => (
            <div key={slide.id} className="relative w-full h-full flex-shrink-0">
              <img
                src={slide.src}
                alt={slide.alt}
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "low"}
                decoding={index === 0 ? "sync" : "async"}
                className="block w-full h-full object-cover object-center select-none"
              />
            </div>
          ))}
        </div>

        {/* Previous Navigation Arrow */}
        <button
          type="button"
          onClick={prevSlide}
          aria-label="Previous Slide"
          className="absolute left-2.5 sm:left-5 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full bg-white/75 hover:bg-white/95 text-[#130006] shadow-md backdrop-blur-sm transition-all duration-300 transform hover:scale-110 active:scale-95 focus:outline-none"
        >
          <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Next Navigation Arrow */}
        <button
          type="button"
          onClick={nextSlide}
          aria-label="Next Slide"
          className="absolute right-2.5 sm:right-5 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full bg-white/75 hover:bg-white/95 text-[#130006] shadow-md backdrop-blur-sm transition-all duration-300 transform hover:scale-110 active:scale-95 focus:outline-none"
        >
          <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Pagination Dots */}
        <div className="absolute bottom-2.5 sm:bottom-4 left-0 right-0 z-30 flex justify-center items-center space-x-2 sm:space-x-3">
          {SLIDES.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={`h-2 sm:h-2.5 rounded-full transition-all duration-500 ${
                currentSlide === index
                  ? "w-6 sm:w-10 bg-[#c49a45] shadow-sm"
                  : "w-2 sm:w-2.5 bg-white/60 hover:bg-white/90"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
