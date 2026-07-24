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

        <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-6 sm:gap-x-5 sm:gap-y-0 md:flex md:justify-center md:gap-8 lg:gap-10 xl:gap-12">
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
                className="group block w-full max-w-[5.75rem] rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#130006]/30 focus-visible:ring-offset-2 sm:max-w-[6.5rem] md:max-w-[7.25rem] lg:max-w-[8rem]"
              >
                <div className="aspect-square w-full overflow-hidden rounded-full bg-[#1a1a1a]">
                  <img
                    src={image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                </div>
              </Link>
              <p className="mt-2.5 text-center text-[11px] font-normal text-[#130006] sm:mt-3 sm:text-[13px]">
                {label}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
