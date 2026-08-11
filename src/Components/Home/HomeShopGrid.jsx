import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { getLenis } from "../../lib/smoothScrollState";
import {
  SIGNATURE_CATEGORIES,
  getCategoryFromParam,
  getCategoryParamSlug,
  groupProductsByCategory,
} from "../../lib/productCategories";
import { HOME_SHOP_PRODUCT_LIMIT } from "../../lib/preloadImages";
import ProductCard from "../Product/ProductCard";

export default function HomeShopGrid({ products, loading, error: fetchError }) {
  const { hash } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // ------------------------------------------------------------
  // GROUP PRODUCTS
  // ------------------------------------------------------------

  const grouped = useMemo(
    () => groupProductsByCategory(products, SIGNATURE_CATEGORIES),
    [products],
  );

  // ------------------------------------------------------------
  // CATEGORY FROM URL
  // ------------------------------------------------------------

  const categoryFromUrl = getCategoryFromParam(searchParams.get("category"));

  // ------------------------------------------------------------
  // DEFAULT CATEGORY
  // ------------------------------------------------------------

  const defaultCategory = useMemo(() => {
    const withStock = SIGNATURE_CATEGORIES.find(
      (category) => (grouped[category]?.length ?? 0) > 0,
    );

    return withStock ?? SIGNATURE_CATEGORIES[0];
  }, [grouped]);

  // ------------------------------------------------------------
  // ACTIVE CATEGORY
  // ------------------------------------------------------------

  const [activeCategory, setActiveCategory] = useState(
    categoryFromUrl && SIGNATURE_CATEGORIES.includes(categoryFromUrl)
      ? categoryFromUrl
      : SIGNATURE_CATEGORIES[0],
  );

  // ------------------------------------------------------------
  // SYNC URL -> ACTIVE CATEGORY
  // ------------------------------------------------------------

  useEffect(() => {
    if (
      categoryFromUrl &&
      SIGNATURE_CATEGORIES.includes(categoryFromUrl) &&
      categoryFromUrl !== activeCategory
    ) {
      setActiveCategory(categoryFromUrl);
    }
  }, [categoryFromUrl, activeCategory]);

  // ------------------------------------------------------------
  // SELECT FIRST CATEGORY WITH PRODUCTS
  // ------------------------------------------------------------

  useEffect(() => {
    if (!loading && !categoryFromUrl) {
      setActiveCategory((current) => {
        if ((grouped[current]?.length ?? 0) > 0) {
          return current;
        }

        return defaultCategory;
      });
    }
  }, [loading, categoryFromUrl, grouped, defaultCategory]);

  // ------------------------------------------------------------
  // CATEGORY PRODUCTS
  // ------------------------------------------------------------

  const allInCategory = grouped[activeCategory] ?? [];

  const categoryProducts = allInCategory.slice(0, HOME_SHOP_PRODUCT_LIMIT);

  const hasMore = allInCategory.length > HOME_SHOP_PRODUCT_LIMIT;

  const totalPieces = SIGNATURE_CATEGORIES.reduce(
    (sum, category) => sum + (grouped[category]?.length ?? 0),
    0,
  );

  // ------------------------------------------------------------
  // SCROLL TO PRODUCTS
  // ------------------------------------------------------------

  function scrollToProducts() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const target = document.getElementById("home-shop-products");

        if (!target) return;

        const lenis = getLenis();

        if (lenis) {
          lenis.scrollTo(target, {
            offset: -110,
            duration: 0.8,
          });
        } else {
          const top = target.getBoundingClientRect().top + window.scrollY - 110;

          window.scrollTo({
            top,
            behavior: "smooth",
          });
        }
      });
    });
  }

  // ------------------------------------------------------------
  // CATEGORY CHANGE
  // ------------------------------------------------------------

  function handleCategoryChange(categoryTitle) {
    setActiveCategory(categoryTitle);

    setSearchParams(
      {
        category: getCategoryParamSlug(categoryTitle),
      },
      {
        replace: true,
      },
    );

    // Move user to the product area
    scrollToProducts();
  }

  // ------------------------------------------------------------
  // INITIAL HASH SCROLL ONLY
  // ------------------------------------------------------------
  //
  // IMPORTANT:
  // This no longer runs when categoryFromUrl changes.
  // Otherwise clicking a category would jump
  // back to the top of the section.
  //

  useEffect(() => {
    if (hash !== "#home-shop") return;

    requestAnimationFrame(() => {
      const target = document.getElementById("home-shop");

      if (!target) return;

      const lenis = getLenis();

      if (lenis) {
        lenis.scrollTo(target, {
          offset: -88,
          duration: 0.9,
        });
      } else {
        const top = target.getBoundingClientRect().top + window.scrollY - 88;

        window.scrollTo({
          top,
          behavior: "smooth",
        });
      }
    });
  }, [hash]);

  // ------------------------------------------------------------
  // COLLECTION URL
  // ------------------------------------------------------------

  const collectionsHref = `/collections?category=${getCategoryParamSlug(
    activeCategory,
  )}#signature`;

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------

  return (
    <section
      id="home-shop"
      className="
        scroll-mt-[calc(var(--nav-height)+1rem)]
        bg-[#fffdfb]
        py-10
        sm:py-12
        lg:py-14
      "
    >
      <div className="container-stitch">
        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="mb-7 text-center sm:mb-8">
          <p
            className="
              mb-2
              text-[9px]
              font-semibold
              uppercase
              tracking-[0.28em]
              text-[#9d815d]
            "
          >
            The Collection
          </p>

          <h2
            className="
              font-serif
              text-3xl
              font-normal
              tracking-[-0.02em]
              text-[#1b0b12]
              sm:text-4xl
              lg:text-[42px]
            "
          >
            Discover your signature
          </h2>
        </div>

        {/* =====================================================
            CATEGORY NAVIGATION
        ====================================================== */}

        <div
          className="
            border-y
            border-[#1b0b12]/10
          "
        >
          <div
            className="
              flex
              items-center
              justify-start
              gap-7
              overflow-x-auto
              overflow-y-hidden
              py-3
              scrollbar-hide
              sm:justify-center
              sm:gap-10
            "
          >
            {SIGNATURE_CATEGORIES.map((category) => {
              const isActive = category === activeCategory;

              const count = grouped[category]?.length ?? 0;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleCategoryChange(category)}
                  className={`
                      relative
                      shrink-0
                      py-2
                      text-[10px]
                      font-medium
                      uppercase
                      tracking-[0.16em]
                      transition-colors
                      duration-200

                      ${
                        isActive
                          ? "text-[#3d0a21]"
                          : "text-[#81777a] hover:text-[#3d0a21]"
                      }
                    `}
                >
                  {category}

                  {/* COUNT */}

                  <sup
                    className={`
                        ml-1
                        text-[7px]

                        ${isActive ? "text-[#b18d50]" : "text-[#aaa2a3]"}
                      `}
                  >
                    {count}
                  </sup>

                  {/* ACTIVE LINE */}

                  <span
                    className={`
                        pointer-events-none
                        absolute
                        bottom-[-1px]
                        left-0
                        h-[1px]
                        bg-[#b18d50]
                        transition-all
                        duration-200

                        ${isActive ? "w-full" : "w-0"}
                      `}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* =====================================================
            PRODUCT SECTION
        ====================================================== */}

        <div
          id="home-shop-products"
          className="
            scroll-mt-[120px]
            mb-5
            mt-7
            flex
            items-center
            justify-between
          "
        >
          <h3
            className="
              font-serif
              text-2xl
              font-normal
              text-[#1b0b12]
              sm:text-[28px]
            "
          >
            {activeCategory}
          </h3>

          <span
            className="
              text-[9px]
              uppercase
              tracking-[0.16em]
              text-[#948a8c]
            "
          >
            {loading ? "Loading" : `${allInCategory.length} pieces`}
          </span>
        </div>

        {/* =====================================================
            ERROR
        ====================================================== */}

        {fetchError && (
          <div
            className="
              mb-6
              border
              border-red-200
              bg-red-50
              px-4
              py-3
              text-sm
              text-red-900
            "
          >
            Could not load products: {fetchError}
          </div>
        )}

        {/* =====================================================
            LOADING
        ====================================================== */}

        {loading && categoryProducts.length === 0 && (
          <div
            className="
                grid
                grid-cols-2
                gap-3
                sm:gap-5
                lg:grid-cols-4
              "
          >
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={`home-skeleton-${i}`}
                className="
                      aspect-[4/5]
                      animate-pulse
                      bg-[#eeeae4]
                    "
                aria-hidden
              />
            ))}
          </div>
        )}

        {/* =====================================================
            EMPTY STORE
        ====================================================== */}

        {!loading &&
          !fetchError &&
          totalPieces === 0 &&
          categoryProducts.length === 0 && (
            <div
              className="
                py-12
                text-center
              "
            >
              <p
                className="
                  font-serif
                  text-xl
                  text-[#1b0b12]
                "
              >
                New pieces arriving soon.
              </p>

              <Link
                to="/collections"
                className="
                  mt-4
                  inline-block
                  text-[10px]
                  uppercase
                  tracking-[0.16em]
                  text-[#6f334a]
                  underline
                  underline-offset-4
                "
              >
                Browse collection
              </Link>
            </div>
          )}

        {/* =====================================================
            EMPTY CATEGORY
        ====================================================== */}

        {!loading &&
          !fetchError &&
          totalPieces > 0 &&
          categoryProducts.length === 0 && (
            <p
              className="
                py-12
                text-center
                text-sm
                text-[#8b8284]
              "
            >
              No {activeCategory.toLowerCase()} available yet.
            </p>
          )}

        {/* =====================================================
            PRODUCT GRID
        ====================================================== */}

        {categoryProducts.length > 0 && (
          <>
            <div
              className="
                grid
                grid-cols-2
                gap-x-3
                gap-y-6
                sm:gap-x-5
                sm:gap-y-8
                lg:grid-cols-4
                lg:gap-x-6
                lg:gap-y-10
              "
            >
              {categoryProducts.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  priority={i < 4}
                />
              ))}
            </div>

            {/* =================================================
                VIEW ALL
            ================================================== */}

            <div
              className="
                mt-9
                flex
                justify-center
              "
            >
              <Link
                to={hasMore ? collectionsHref : "/collections#signature"}
                className="
                  group
                  inline-flex
                  items-center
                  gap-3
                  border-b
                  border-[#3d0a21]/70
                  pb-1.5
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.18em]
                  text-[#3d0a21]
                  transition-all
                  duration-200
                  hover:gap-4
                "
              >
                {hasMore
                  ? `View all ${activeCategory.toLowerCase()}`
                  : "View all collection"}

                <span
                  className="
                    text-sm
                    transition-transform
                    duration-200
                    group-hover:translate-x-1
                  "
                >
                  →
                </span>
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
