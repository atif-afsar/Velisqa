import { NavLink, Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import WhatsAppCTA from "./WhatsApp/WhatsAppCTA";

const DARK_HERO_ROUTES = ["/", "/about"];
const SCROLL_BG_RANGE = 100; // px — white bg eases in over this distance
const SCROLL_SOLID_AT = 0.22; // text / theme switch threshold (0–1)

const links = [
  { label: "HOME", to: "/" },
  { label: "COLLECTIONS", to: "/collections" },
  { label: "ABOUT", to: "/about" },
  { label: "MODELS", to: "/models" },
  { label: "CONTACT", to: "/contact" },
];

// Framer Motion Variants for Mobile Menu Staggering
const menuVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1], // Custom premium easeOut
      when: "beforeChildren",
      staggerChildren: 0.06,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.25,
      ease: [0.7, 0, 0.84, 0], // Custom easeIn
    },
  },
};

const linkVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const closeMenu = () => setIsOpen(false);

  const rawProgress = useMotionValue(0);
  const scrollProgress = useSpring(rawProgress, {
    stiffness: 110,
    damping: 26,
    mass: 0.55,
    restDelta: 0.001,
  });

  const onDarkHero = DARK_HERO_ROUTES.includes(pathname) && !scrolled;

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        rawProgress.set(Math.min(1, window.scrollY / SCROLL_BG_RANGE));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname, rawProgress]);

  useEffect(() => {
    const unsub = scrollProgress.on("change", (v) => {
      setScrolled(v > SCROLL_SOLID_AT);
    });
    return unsub;
  }, [scrollProgress]);

  useEffect(() => {
    rawProgress.set(0);
    setIsOpen(false);
    setScrolled(false);
  }, [pathname, rawProgress]);

  const bgY = useTransform(scrollProgress, (p) => (1 - p) * -10);
  const bgScaleY = useTransform(scrollProgress, (p) => 0.94 + p * 0.06);
  const bgShadow = useTransform(
    scrollProgress,
    (p) => `0 12px 40px -16px rgba(19,0,6,${p * 0.1})`,
  );
  const heroFade = useTransform(scrollProgress, (p) => 1 - p);
  const borderOnHero = useTransform(scrollProgress, (p) => `rgba(255,255,255,${0.1 * (1 - p)})`);
  const borderOnLight = useTransform(scrollProgress, (p) => `rgba(132,115,119,${0.08 + p * 0.04})`);
  const navPy = useTransform(scrollProgress, [0, 1], [10, 5]);
  return (
    <motion.header
      initial={{ y: -6, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="fixed left-0 right-0 top-0 z-50 bg-transparent"
      style={{
        borderBottomWidth: 1,
        borderBottomStyle: "solid",
        borderBottomColor: onDarkHero ? borderOnHero : borderOnLight,
      }}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 origin-top bg-[#fdf9f4] backdrop-blur-xl"
        style={{
          opacity: scrollProgress,
          y: bgY,
          scaleY: bgScaleY,
          boxShadow: bgShadow,
        }}
      />

      {onDarkHero && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#130006]/40 to-transparent"
          style={{ opacity: heroFade }}
        />
      )}
      <motion.div
        className={`container-stitch relative flex items-center justify-between transition-[min-height] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          scrolled ? "min-h-[44px] md:min-h-[52px]" : "min-h-[56px] md:min-h-[72px]"
        }`}
        style={{ paddingTop: navPy, paddingBottom: navPy }}
      >
        
        {/* Brand Logo */}
        <Link
          to="/"
          onClick={closeMenu}
          className={`font-serif font-medium leading-none tracking-[0.06em] transition-[color,opacity,font-size] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:opacity-80 ${
            scrolled
              ? "text-[1.1rem] sm:text-xl md:text-[1.35rem]"
              : "text-[1.25rem] sm:text-2xl md:text-3xl"
          } ${
            onDarkHero
              ? "text-white drop-shadow-[0_2px_16px_rgba(19,0,6,0.45)]"
              : "text-[#130006]"
          }`}
        >
          <motion.span whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
            VELISQA
          </motion.span>
        </Link>

        {/* Desktop Navigation */}
        <nav
          className={`hidden items-center md:flex md:absolute md:left-[52%] md:-translate-x-1/2 md:z-20 transition-[gap] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
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
                  `relative py-0.5 font-medium transition-[color,font-size,letter-spacing] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
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
                    <motion.span className="relative z-10 inline-block transition-transform duration-300" whileHover={{ scale: 1.03 }} transition={{ type: "spring", stiffness: 300 }}>
                      {link.label}
                    </motion.span>
                    {/* Shared layout animation for a fluid premium underline */}
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

        {/* Desktop Call To Action */}
        <div className="hidden items-center md:flex">
          <WhatsAppCTA
            className={`hidden md:inline-flex transition-[padding,transform,gap] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] active:scale-[0.98] [&_svg]:shrink-0 ${
              scrolled
                ? "gap-1.5 px-3 py-1.5 text-[0.62rem] [&_svg]:h-3.5 [&_svg]:w-3.5 [&_span]:tracking-[0.14em]"
                : "gap-2 px-3.5 py-1.5 text-[0.68rem] [&_svg]:h-3.5 [&_svg]:w-3.5 [&_span]:tracking-[0.12em]"
            }`}
            intent="consult"
          >
            Concierge
          </WhatsAppCTA>
        </div>

        {/* Premium Animated Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className={`grid place-items-center rounded-full border transition-all duration-500 md:hidden focus:outline-none ${
            scrolled ? "h-8 w-8" : "h-9 w-9"
          } ${
            onDarkHero
              ? "border-white/25 text-white hover:border-white/45 hover:bg-white/5"
              : "border-[#130006]/10 text-[#130006] hover:border-[#130006]/25"
          }`}
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isOpen}
        >
          <div className="relative flex h-2.5 w-4 flex-col justify-between" aria-hidden="true">
            <span className={`h-[1px] w-4 bg-current transition-all duration-300 ease-out ${isOpen ? "translate-y-[4px] rotate-45" : ""}`} />
            <span className={`h-[1px] w-4 bg-current transition-all duration-300 ease-out ${isOpen ? "scale-x-0 opacity-0" : ""}`} />
            <span className={`h-[1px] w-4 bg-current transition-all duration-300 ease-out ${isOpen ? "-translate-y-[4px] -rotate-45" : ""}`} />
          </div>
        </button>
      </motion.div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`absolute left-0 right-0 border-t px-6 pb-6 pt-3 backdrop-blur-2xl md:hidden ${
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
                      `group flex min-h-[48px] items-center justify-between border-b text-[0.78rem] font-medium tracking-[0.10em] transition-colors duration-300 ${
                        scrolled
                          ? `border-[#847377]/8 ${isActive ? "text-[#130006]" : "text-[#514347]/90 hover:text-[#130006]"}`
                          : `border-white/8 ${isActive ? "text-[#d4af37]" : "text-white/80 hover:text-[#f7ead0]"}`
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <motion.span className="relative transition-transform duration-300 group-hover:translate-x-1" whileHover={{ x: 2 }}>
                          {link.label}
                          {isActive && (
                            <span
                              className={`absolute -left-3 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full ${
                                scrolled ? "bg-[#afa0d1]" : "bg-[#d4af37]"
                              }`}
                            />
                          )}
                        </motion.span>
                        <span 
                          className="text-[0.7rem] opacity-40 transition-transform duration-300 group-hover:translate-x-1 group-hover:opacity-100" 
                          aria-hidden="true"
                        >
                          &rarr;
                        </span>
                      </>
                    )}
                  </NavLink>
                </motion.div>
              ))}
              
              <motion.div variants={linkVariants} className="mt-5">
                <WhatsAppCTA className="w-full justify-center py-2.5 shadow-sm transition-transform active:scale-[0.99] text-xs" intent="consult">
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