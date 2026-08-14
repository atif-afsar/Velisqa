import { Link } from "react-router-dom";
import { shopCategories } from "./homeData";
import { getCategoryParamSlug } from "../../lib/productCategories";

export default function IconsOfElegance() {
  return (
    <section className="bg-white py-6 md:py-10 lg:py-12">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10">
        <h2 className="mb-6 text-center text-[12px] font-medium uppercase tracking-[0.22em] text-[#130006] md:mb-10 md:text-sm md:tracking-[0.28em]">
          Everyday Signature Jewellery
        </h2>

        <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-6 sm:gap-x-6 sm:gap-y-0 md:flex md:justify-center md:gap-8 lg:gap-10 xl:gap-12">
          {shopCategories.map(({ label, type, image }) => (
            <article
              key={type}
              className="flex flex-col items-center sm:w-auto"
            >
              <Link
                to={{
                  pathname: "/collections",
                  search: `?category=${getCategoryParamSlug(type)}`,
                }}
                aria-label={`Shop ${label}`}
                className="group flex flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#130006]/30 focus-visible:ring-offset-2"
              >
                <div className="aspect-square w-full max-w-[6.75rem] sm:max-w-[8rem] md:max-w-[9.5rem] lg:max-w-[10.5rem] xl:max-w-[11.5rem] overflow-hidden rounded-full border border-[#d4af37]/15 bg-[#1a1a1a] shadow-[0_12px_28px_-10px_rgba(19,0,6,0.18)] transition-all duration-500 ease-out group-hover:scale-[1.04] group-hover:border-[#d4af37]/35 group-hover:shadow-[0_20px_40px_-12px_rgba(19,0,6,0.28)]">
                  <img
                    src={image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  />
                </div>
                <p className="mt-3 text-center text-xs font-serif italic tracking-wide text-[#130006] transition-colors duration-300 group-hover:text-[#6f334a] sm:mt-4 sm:text-sm">
                  {label}
                </p>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
