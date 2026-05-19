import { NavLink, Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import WhatsAppCTA from "./WhatsApp/WhatsAppCTA";

const DARK_HERO_ROUTES = ["/", "/about"];
const BG_FADE_RANGE = 56;
const SCROLL_SOLID_AT = 32;

const links = [
  { label: "HOME", to: "/" },
  { label: "COLLECTIONS", to: "/collections" },
  { label: "ABOUT", to: "/about" },
  { label: "MODELS", to: "/models" },
  { label: "CONTACT", to: "/contact" },
];

const menuVariants = {
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

const linkVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
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

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef(null);
  const scrolledRef = useRef(false);
  const { pathname } = useLocation();
  const closeMenu = () => setIsOpen(false);

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
    setIsOpen(false);

    if (isDarkHeroRoute) {
      scrolledRef.current = window.scrollY > SCROLL_SOLID_AT;
      setScrolled(scrolledRef.current);
    } else {
      scrolledRef.current = true;
      setScrolled(true);
    }

    applyNavScrollVars(el, isDarkHeroRoute);
  }, [pathname, isDarkHeroRoute]);

  return (
    <motion.header
      ref={headerRef}
      initial={{ y: -6, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed left-0 right-0 top-0 z-50 isolate border-b will-change-[border-color] ${
        onDarkHero ? "border-white/10" : "border-[#847377]/12 shadow-[0_8px_32px_-12px_rgba(19,0,6,0.08)]"
      }`}
      style={{
        "--nav-bg": isDarkHeroRoute ? 0 : 1,
        "--nav-hero": isDarkHeroRoute ? 1 : 0,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[#fdf9f4] will-change-[opacity]"
        style={{ opacity: "var(--nav-bg)" }}
      />

      {isDarkHeroRoute && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-[5] h-28 bg-gradient-to-b from-[#130006]/45 to-transparent will-change-[opacity]"
          style={{ opacity: "var(--nav-hero)" }}
        />
      )}

      <div
        className={`container-stitch relative flex items-center justify-between ${
          scrolled ? "min-h-[44px] py-1 md:min-h-[52px]" : "min-h-[56px] py-2.5 md:min-h-[72px]"
        }`}
      >
        <Link
          to="/"
          onClick={closeMenu}
          className={`font-serif font-medium leading-none tracking-[0.06em] transition-colors duration-200 hover:opacity-80 ${
            scrolled
              ? "text-[1.1rem] sm:text-xl md:text-[1.35rem]"
              : "text-[1.25rem] sm:text-2xl md:text-3xl"
          } ${
            onDarkHero
              ? "text-white drop-shadow-[0_2px_16px_rgba(19,0,6,0.45)]"
              : "text-[#130006]"
          }`}
        >
          VELISQA
        </Link>

        <nav
          className={`hidden items-center md:flex md:absolute md:left-[52%] md:-translate-x-1/2 md:z-20 ${
            scrolled ? "gap-4 lg:gap-5" : "gap-5 lg:gap-8"
          }`}
        >
          {links.map((link) => {
            const isHome = link.label === "HOME";
            return (
              <NavLink
                key={link.label}
                to={link.to}
                end={isHome}
                className={({ isActive }) =>
                  `relative py-0.5 font-medium transition-colors duration-200 ${
                    scrolled ? "text-[0.62rem] tracking-[0.1em]" : "text-[0.72rem] tracking-[0.12em]"
                  } ${
                    onDarkHero
                      ? isActive
                        ? "text-[#d4af37]"
                        : "text-white/75 hover:text-[#f7ead0]"
                      : isActive
                        ? "text-[#130006]"
                        : "text-[#514347]/80 hover:text-[#130006]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative z-10 inline-block">{link.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="desktop-active-underline"
                        className={`absolute bottom-0 left-0 w-full ${scrolled ? "h-[1.5px]" : "h-[2px]"} ${onDarkHero ? "bg-[#d4af37]" : "bg-[#afa0d1]"}`}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="hidden items-center md:flex">
          <WhatsAppCTA
            className={`hidden md:inline-flex [&_svg]:shrink-0 ${
              scrolled
                ? "gap-1.5 px-3 py-1.5 text-[0.62rem] [&_svg]:h-3.5 [&_svg]:w-3.5 [&_span]:tracking-[0.14em]"
                : "gap-2 px-3.5 py-1.5 text-[0.68rem] [&_svg]:h-3.5 [&_svg]:w-3.5 [&_span]:tracking-[0.12em]"
            }`}
            intent="consult"
          >
            Concierge
          </WhatsAppCTA>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className={`grid place-items-center rounded-full border transition-colors duration-200 md:hidden focus:outline-none ${
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

      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`absolute left-0 right-0 border-t px-6 pb-6 pt-3 backdrop-blur-xl md:hidden ${
              scrolled
                ? "border-[#847377]/10 bg-[#fdf9f4]/98 shadow-[0_20px_48px_rgba(19,0,6,0.08)]"
                : "border-white/10 bg-[#130006]/88 shadow-[0_24px_48px_rgba(19,0,6,0.35)]"
            }`}
          >
            <nav className="mx-auto flex max-w-md flex-col">
              {links.map((link) => (
                <motion.div key={link.label} variants={linkVariants}>
                  <NavLink
                    to={link.to}
                    end={link.label === "HOME"}
                    onClick={closeMenu}
                    className={({ isActive }) =>
                      `group flex min-h-[48px] items-center justify-between border-b text-[0.78rem] font-medium tracking-[0.10em] transition-colors duration-200 ${
                        scrolled
                          ? `border-[#847377]/8 ${isActive ? "text-[#130006]" : "text-[#514347]/90 hover:text-[#130006]"}`
                          : `border-white/8 ${isActive ? "text-[#d4af37]" : "text-white/80 hover:text-[#f7ead0]"}`
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className="relative">
                          {link.label}
                          {isActive && (
                            <span
                              className={`absolute -left-3 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full ${
                                scrolled ? "bg-[#afa0d1]" : "bg-[#d4af37]"
                              }`}
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

              <motion.div variants={linkVariants} className="mt-5">
                <WhatsAppCTA className="w-full justify-center py-2.5 text-xs shadow-sm" intent="consult">
                  Concierge
                </WhatsAppCTA>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
