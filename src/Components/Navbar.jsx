import { NavLink, Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import WhatsAppCTA from "./WhatsApp/WhatsAppCTA";
import CartNavLink from "./Cart/CartNavLink";
import WishlistNavLink from "./Wishlist/WishlistNavLink";
import AccountNavMenu from "./Nav/AccountNavMenu";
import SearchDialog from "./Search/SearchDialog";
import { useAuth } from "../context/AuthContext";

const DARK_HERO_ROUTES = ["/about"];
const BG_FADE_RANGE = 56;
const SCROLL_SOLID_AT = 32;

const links = [
  { label: "Home", to: "/" },
  { label: "Collections", to: "/collections" },
  { label: "About", to: "/about" },
  { label: "Creators", to: "/models" },
];

const contactLink = { label: "Contact", to: "/contact" };
const mobileLinks = [...links, contactLink];

const menuVariantsDesktop = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
      when: "beforeChildren",
      staggerChildren: 0.06,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.25, ease: [0.7, 0, 0.84, 0] },
  },
};

const menuVariantsMobile = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.22,
      ease: [0.16, 1, 0.3, 1],
      when: "beforeChildren",
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.18, ease: [0.7, 0, 0.84, 0] },
  },
};

const linkVariantsDesktop = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

const linkVariantsMobile = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18, ease: "easeOut" } },
};

function applyNavScrollVars(el, isDarkHeroRoute) {
  if (!el) return;

  if (!isDarkHeroRoute) {
    el.style.setProperty("--nav-bg", "1");
    el.style.setProperty("--nav-hero", "0");
    return;
  }

  const y = window.scrollY;
  const progress = Math.min(1, y / BG_FADE_RANGE);
  el.style.setProperty("--nav-bg", String(progress));
  el.style.setProperty("--nav-hero", String(1 - progress));
}

function useCompactNavMotion() {
  const [compact, setCompact] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(max-width: 767px), (prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px), (prefers-reduced-motion: reduce)");
    const onChange = () => setCompact(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return compact;
}

function navTextClass({ scrolled, onDarkHero, isActive = false }) {
  const size = scrolled
    ? "text-[0.62rem] tracking-[0.1em]"
    : "text-[0.72rem] tracking-[0.12em]";

  if (onDarkHero) {
    return `${size} ${isActive ? "text-[#d4af37]" : "text-white/75 hover:text-[#f7ead0]"}`;
  }

  return `${size} ${isActive ? "text-[#130006]" : "text-[#514347]/80 hover:text-[#130006]"}`;
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function HeaderSearchBar({ onOpen, className = "" }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full min-w-0 items-center gap-3 rounded-full border border-black/5 bg-[#f6f5f3] px-5 py-2 text-left transition hover:bg-[#efedea] hover:border-black/10 md:py-2.5 ${className}`}
      aria-label="Search products"
    >
      <span className="min-w-0 flex-1 truncate text-xs md:text-[13px] tracking-wide text-[#8a8a8a]">
        Search for necklaces, rings, earrings…
      </span>
      <span className="shrink-0 text-[#130006]/70">
        <SearchIcon />
      </span>
    </button>
  );
}

function PincodeLink() {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 text-[12px] font-medium tracking-wide text-[#514347]/90 transition hover:text-[#130006] shrink-0"
      aria-label="Enter delivery pincode"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-[#130006]/70">
        <path
          d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle cx="12" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      Enter pincode
    </button>
  );
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const compactMotion = useCompactNavMotion();
  const menuVariants = compactMotion ? menuVariantsMobile : menuVariantsDesktop;
  const linkVariants = compactMotion ? linkVariantsMobile : linkVariantsDesktop;
  const headerRef = useRef(null);
  const scrolledRef = useRef(false);
  const { pathname } = useLocation();
  const closeMenu = () => setIsOpen(false);
  const { user, profile, loading: authLoading, logout } = useAuth();

  const isDarkHeroRoute = DARK_HERO_ROUTES.includes(pathname);
  const onDarkHero = isDarkHeroRoute && !scrolled;

  useEffect(() => {
    const el = headerRef.current;
    let rafId = 0;

    const tick = () => {
      rafId = 0;
      applyNavScrollVars(el, isDarkHeroRoute);

      if (!isDarkHeroRoute) {
        if (!scrolledRef.current) {
          scrolledRef.current = true;
          setScrolled(true);
        }
        return;
      }

      const isNowScrolled = window.scrollY > SCROLL_SOLID_AT;
      if (isNowScrolled !== scrolledRef.current) {
        scrolledRef.current = isNowScrolled;
        setScrolled(isNowScrolled);
      }
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(tick);
    };

    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("velisqa:scroll", onScroll, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("velisqa:scroll", onScroll);
    };
  }, [isDarkHeroRoute]);

  useEffect(() => {
    const el = headerRef.current;
    queueMicrotask(() => {
      setIsOpen(false);
      setSearchOpen(false);
    });

    if (isDarkHeroRoute) {
      scrolledRef.current = window.scrollY > SCROLL_SOLID_AT;
      setScrolled(scrolledRef.current);
    } else {
      scrolledRef.current = true;
      setScrolled(true);
    }

    applyNavScrollVars(el, isDarkHeroRoute);
  }, [pathname, isDarkHeroRoute]);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return undefined;

    const syncNavBarHeight = () => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      if (height > 0) {
        document.documentElement.style.setProperty("--nav-bar-height", `${height}px`);
      }
    };

    syncNavBarHeight();
    const observer = new ResizeObserver(syncNavBarHeight);
    observer.observe(el);
    window.addEventListener("resize", syncNavBarHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncNavBarHeight);
      document.documentElement.style.removeProperty("--nav-bar-height");
    };
  }, [pathname]);

  const isAdmin = pathname.startsWith("/admin");
  const openSearch = () => {
    setIsOpen(false);
    setSearchOpen(true);
  };

  return (
    <motion.header
      ref={headerRef}
      initial={{ y: -6, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed left-0 right-0 z-50 isolate border-b transition-shadow duration-300 ${
        isAdmin ? "top-0" : "top-[var(--announcement-height)]"
      } ${
        isAdmin
          ? onDarkHero
            ? "border-white/10"
            : "border-[#847377]/12 shadow-[0_8px_32px_-12px_rgba(19,0,6,0.08)]"
          : "border-black/5 bg-white/95 backdrop-blur-md shadow-[0_2px_15px_-3px_rgba(19,0,6,0.03)]"
      }`}
      style={
        isAdmin
          ? {
              "--nav-bg": isDarkHeroRoute ? 0 : 1,
              "--nav-hero": isDarkHeroRoute ? 1 : 0,
            }
          : undefined
      }
    >
      {isAdmin && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[#fdf9f4] md:will-change-[opacity]"
            style={{ opacity: "var(--nav-bg)" }}
          />
          {isDarkHeroRoute && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 -z-[5] h-28 bg-gradient-to-b from-[#130006]/45 to-transparent md:will-change-[opacity]"
              style={{ opacity: "var(--nav-hero)" }}
            />
          )}
        </>
      )}

      {isAdmin ? (
      <div
        className={`container-stitch relative flex items-center justify-between gap-3 md:gap-4 ${
          scrolled ? "min-h-[44px] py-1 md:min-h-[52px]" : "min-h-[56px] py-2.5 md:min-h-[72px]"
        }`}
      >
        <Link
          to="/"
          onClick={closeMenu}
          className={`relative z-20 inline-flex min-h-9 shrink-0 items-center font-serif font-medium leading-none tracking-[0.16em] transition-colors duration-200 hover:opacity-80 ${
            scrolled
              ? "text-[1.5rem] sm:text-3xl md:text-[2.25rem]"
              : "text-[1.65rem] sm:text-[2.25rem] md:text-[2.75rem]"
          } ${
            onDarkHero
              ? "text-white drop-shadow-[0_2px_16px_rgba(19,0,6,0.45)]"
              : "text-[#130006]"
          }`}
        >
          VELISQA
        </Link>

        <nav
          className={`pointer-events-none absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 items-center xl:flex ${
            scrolled ? "gap-4 2xl:gap-6" : "gap-5 2xl:gap-8"
          }`}
        >
          {[...links, contactLink].map((link) => {
            const isHome = link.label === "Home";
            return (
              <NavLink
                key={link.label}
                to={link.to}
                end={isHome}
                className={({ isActive }) =>
                  `pointer-events-auto relative inline-flex min-h-9 items-center whitespace-nowrap font-medium transition-colors duration-200 ${navTextClass({ scrolled, onDarkHero, isActive })}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative z-10">{link.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="desktop-active-underline"
                        className={`absolute bottom-1 left-0 right-0 ${scrolled ? "h-[1.5px]" : "h-[2px]"} ${onDarkHero ? "bg-[#d4af37]" : "bg-[#afa0d1]"}`}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div
          className={`relative z-20 hidden min-h-9 shrink-0 items-center justify-end xl:flex ${
            scrolled ? "gap-1.5 2xl:gap-2" : "gap-2 2xl:gap-2.5"
          }`}
        >
          <div className="flex items-center gap-1">
            {!pathname.startsWith("/admin") && (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className={`grid rounded-full border transition-colors ${
                  scrolled ? "h-8 w-8" : "h-9 w-9"
                } ${
                  onDarkHero
                    ? "place-items-center border-white/20 text-white hover:border-white/45 hover:bg-white/10"
                    : "place-items-center border-[#130006]/10 text-[#130006] hover:border-[#130006]/25"
                }`}
                aria-label="Search products"
              >
                <SearchIcon />
              </button>
            )}
            <WishlistNavLink
              variant="icon"
              onDarkHero={onDarkHero}
              scrolled={scrolled}
              className={scrolled ? "!h-8 !w-8" : ""}
            />
            <CartNavLink
              variant="icon"
              onDarkHero={onDarkHero}
              scrolled={scrolled}
              className={scrolled ? "!h-8 !w-8" : ""}
            />
          </div>

          <AccountNavMenu scrolled={scrolled} onDarkHero={onDarkHero} />

          <WhatsAppCTA
            className={`hidden shrink-0 items-center xl:inline-flex [&_svg]:shrink-0 ${
              scrolled
                ? "h-8 gap-1.5 px-3 py-0 text-[0.58rem] [&_svg]:h-3.5 [&_svg]:w-3.5 [&_span]:tracking-[0.12em]"
                : "h-9 gap-2 px-3 py-0 text-[0.64rem] [&_svg]:h-3.5 [&_svg]:w-3.5 [&_span]:tracking-[0.1em]"
            }`}
            intent="consult"
          >
            Get Support
          </WhatsAppCTA>
        </div>

        <div className="relative z-20 flex shrink-0 items-center justify-end gap-2 xl:hidden">
          {!pathname.startsWith("/admin") && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setSearchOpen(true);
              }}
              className={`grid place-items-center rounded-full border transition-colors ${
                scrolled ? "h-8 w-8" : "h-9 w-9"
              } ${
                onDarkHero
                  ? "border-white/25 text-white hover:border-white/45 hover:bg-white/5"
                  : "border-[#130006]/10 text-[#130006] hover:border-[#130006]/25"
              }`}
              aria-label="Search products"
            >
              <SearchIcon />
            </button>
          )}
          <WishlistNavLink
            variant="icon"
            onDarkHero={onDarkHero}
            scrolled={scrolled}
            onClick={closeMenu}
          />
          <CartNavLink
            variant="icon"
            onDarkHero={onDarkHero}
            scrolled={scrolled}
            onClick={closeMenu}
          />
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            className={`grid place-items-center rounded-full border transition-colors duration-200 focus:outline-none ${
              scrolled ? "h-8 w-8" : "h-9 w-9"
            } ${
              onDarkHero
                ? "border-white/25 text-white hover:border-white/45 hover:bg-white/5"
                : "border-[#130006]/10 text-[#130006] hover:border-[#130006]/25"
            }`}
            aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isOpen}
          >
          <motion.div className="relative flex h-2.5 w-4 flex-col justify-between" aria-hidden="true">
            <motion.span
              className="h-[1px] w-4 bg-current"
              animate={isOpen ? { y: 4, rotate: 45 } : { y: 0, rotate: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.span
              className="h-[1px] w-4 bg-current"
              animate={isOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.2 }}
            />
            <motion.span
              className="h-[1px] w-4 bg-current"
              animate={isOpen ? { y: -4, rotate: -45 } : { y: 0, rotate: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            />
          </motion.div>
          </button>
        </div>
      </div>
      ) : (
        <div className="mx-auto flex w-full max-w-[1600px] flex-col px-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-2 py-2.5 md:gap-4 md:py-3.5">
            <Link
              to="/"
              onClick={closeMenu}
              className="relative z-20 inline-flex min-h-9 shrink-0 items-center font-serif text-[1.5rem] font-medium leading-none tracking-[0.16em] text-[#130006] transition-opacity hover:opacity-75 sm:text-3xl md:text-[2.25rem] lg:text-[2.65rem]"
            >
              VELISQA
            </Link>

            <div className="hidden min-w-0 flex-1 items-center justify-center gap-6 md:flex">
              <PincodeLink />
              <HeaderSearchBar onOpen={openSearch} className="max-w-md" />
            </div>

            <div className="ml-auto flex shrink-0 items-center justify-end gap-1 sm:gap-2">
              <WishlistNavLink variant="plain" onDarkHero={false} scrolled={false} onClick={closeMenu} className="!h-10 !w-10" />
              <CartNavLink variant="plain" onDarkHero={false} scrolled={false} onClick={closeMenu} className="!h-10 !w-10" />
              <AccountNavMenu variant="plain" scrolled={false} onDarkHero={false} />
              <button
                type="button"
                onClick={() => setIsOpen((open) => !open)}
                className="grid h-10 w-10 place-items-center text-[#130006] transition hover:opacity-70 xl:hidden"
                aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={isOpen}
              >
                <motion.div className="relative flex h-2.5 w-4 flex-col justify-between" aria-hidden="true">
                  <motion.span
                    className="h-[1px] w-4 bg-current"
                    animate={isOpen ? { y: 4, rotate: 45 } : { y: 0, rotate: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <motion.span
                    className="h-[1px] w-4 bg-current"
                    animate={isOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                  <motion.span
                    className="h-[1px] w-4 bg-current"
                    animate={isOpen ? { y: -4, rotate: -45 } : { y: 0, rotate: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  />
                </motion.div>
              </button>
            </div>
          </div>

          <div className="pb-3 md:hidden">
            <HeaderSearchBar onOpen={openSearch} className="w-full" />
          </div>

          <nav
            className="hidden items-center justify-center gap-6 border-t border-black/5 py-3 xl:flex 2xl:gap-8"
            aria-label="Primary"
          >
            {[...links, contactLink].map((link) => {
              const isHome = link.label === "Home";
              return (
                <NavLink
                  key={link.label}
                  to={link.to}
                  end={isHome}
                  className={({ isActive }) =>
                    `relative inline-flex min-h-9 items-center whitespace-nowrap text-[11px] font-medium tracking-[0.18em] uppercase transition-colors duration-200 ${
                      isActive
                        ? "text-[#130006] font-semibold"
                        : "text-[#514347]/85 hover:text-[#130006]"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span>{link.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="shop-desktop-active-underline"
                          className="absolute -bottom-3 left-0 right-0 h-[1.5px] bg-[#130006]"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`absolute left-0 right-0 border-t px-6 pb-6 pt-3 xl:hidden ${
              isAdmin
                ? scrolled
                  ? "border-[#847377]/10 bg-[#fdf9f4] shadow-[0_20px_48px_rgba(19,0,6,0.08)]"
                  : "border-white/10 bg-[#130006]/95 shadow-[0_24px_48px_rgba(19,0,6,0.35)]"
                : "border-[#847377]/10 bg-[#fdf9f4] shadow-[0_20px_48px_rgba(19,0,6,0.08)]"
            }`}
          >
            <nav className="mx-auto flex max-w-md flex-col">
              {mobileLinks.map((link) => (
                <motion.div key={link.label} variants={linkVariants}>
                  <NavLink
                    to={link.to}
                    end={link.label === "Home"}
                    onClick={closeMenu}
                    className={({ isActive }) =>
                      `group flex min-h-[48px] items-center justify-between border-b text-[0.72rem] font-medium tracking-[0.16em] uppercase transition-colors duration-200 border-[#847377]/8 ${
                        isActive ? "text-[#130006] font-semibold" : "text-[#514347]/85 hover:text-[#130006]"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className="relative">
                          {link.label}
                          {isActive && (
                            <span
                              className="absolute -left-3.5 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-[#3d0a21]"
                            />
                          )}
                        </span>
                        <span className="text-[0.7rem] opacity-40" aria-hidden="true">
                          &rarr;
                        </span>
                      </>
                    )}
                  </NavLink>
                </motion.div>
              ))}

              <motion.div variants={linkVariants} className="mt-5 flex flex-col gap-2">
                {!authLoading &&
                  (user ? (
                    <>
                      <Link
                        to="/account/orders"
                        onClick={closeMenu}
                        className={`flex min-h-[48px] items-center justify-center rounded-full border text-[0.72rem] font-semibold uppercase tracking-[0.12em] transition ${
                          scrolled
                            ? "border-[#3d0a21]/20 bg-white text-[#130006] hover:border-[#3d0a21]/35"
                            : "border-[#d4af37]/35 bg-white/10 text-[#f7ead0] hover:bg-white/15"
                        }`}
                      >
                        My orders
                      </Link>
                      {profile?.role === "admin" && (
                        <Link
                          to="/admin/panel"
                          onClick={closeMenu}
                          className={`flex min-h-[48px] items-center justify-center rounded-full border text-[0.72rem] font-semibold uppercase tracking-[0.12em] transition ${
                            scrolled
                              ? "border-[#3d0a21]/20 bg-[#3d0a21] text-[#fdf9f4] hover:bg-[#2a0718]"
                              : "border-[#d4af37]/35 bg-white/10 text-[#f7ead0] hover:bg-white/15"
                          }`}
                        >
                          Admin dashboard
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          void logout();
                          closeMenu();
                        }}
                        className={`flex min-h-[48px] w-full items-center justify-center rounded-full border text-[0.72rem] font-semibold uppercase tracking-[0.12em] transition ${
                          scrolled
                            ? "border-[#847377]/25 text-[#130006] hover:border-[#130006]/30"
                            : "border-white/20 text-white/90 hover:border-white/40"
                        }`}
                      >
                        Sign out
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/login"
                      onClick={closeMenu}
                      className={`flex min-h-[48px] items-center justify-center rounded-full border text-[0.72rem] font-semibold uppercase tracking-[0.12em] transition ${
                        scrolled
                          ? "border-[#3d0a21]/20 text-[#130006] hover:border-[#3d0a21]/40"
                          : "border-white/25 text-white hover:border-white/45"
                      }`}
                    >
                      Sign in
                    </Link>
                  ))}
              </motion.div>
              <motion.div variants={linkVariants} className="mt-3">
                <WhatsAppCTA className="w-full justify-center py-2.5 text-xs shadow-sm" intent="consult">
                  Get Support
                </WhatsAppCTA>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
      {searchOpen && !isAdmin && <SearchDialog onClose={() => setSearchOpen(false)} />}
    </motion.header>
  );
}
