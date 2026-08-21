import { NavLink, Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import WhatsAppCTA from "./WhatsApp/WhatsAppCTA";
import CartNavLink from "./Cart/CartNavLink";
import WishlistNavLink from "./Wishlist/WishlistNavLink";
import AccountNavMenu from "./Nav/AccountNavMenu";
import SearchDialog from "./Search/SearchDialog";
import { useAuth } from "../context/AuthContext";
import { requestLocationPincode } from "../lib/geolocation";

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
      className={`flex w-full min-w-0 items-center gap-3 rounded-lg border border-black/10 bg-white px-4 py-2.5 text-left transition hover:bg-[#F8F6F3]/40 ${className}`}
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

function PincodeLink({ pincode, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2.5 border border-[#E8DCC8] bg-[#F5EFE6]/60 px-3.5 py-1.5 rounded-md text-left text-xs leading-tight transition hover:bg-[#F5EFE6] shrink-0 font-sans shadow-xs"
      aria-label="Update delivery pincode"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-[#8B6914] shrink-0">
        <path
          d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="12" cy="10" r="2.25" stroke="currentColor" strokeWidth="2" />
      </svg>
      <div>
        <p className="text-[11px] font-bold text-[#8B6914]/70 uppercase tracking-wider leading-none">Deliver To</p>
        <p className="font-semibold text-slate-800 text-xs mt-0.5 leading-none">
          {pincode ? pincode : 'Enter Pincode'}
        </p>
      </div>
    </button>
  );
}

function PincodeModal({ onClose, onUpdate, initialValue }) {
  const [pin, setPin] = useState(initialValue || '');
  const [error, setError] = useState('');
  const [detecting, setDetecting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (/^\d{6}$/.test(pin)) {
      onUpdate(pin);
      onClose();
    } else {
      setError('Please enter a valid 6-digit PIN code.');
    }
  };

  const handleDetectLocation = async () => {
    setDetecting(true);
    setError('');
    try {
      // Clear session flag so geolocation re-triggers
      sessionStorage.removeItem('velisqa:geo_asked');
      const { pincode } = await requestLocationPincode();
      if (pincode) {
        setPin(pincode);
        onUpdate(pincode);
        onClose();
      } else {
        setError('Could not detect your pincode. Please enter manually.');
      }
    } catch {
      setError('Location access denied. Please enter pincode manually.');
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 px-4 py-20 scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <div className="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-xl border border-black/5 font-sans">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-[#847377] hover:text-[#130006] text-lg font-bold"
        >
          ✕
        </button>
        <h3 className="font-serif text-base font-semibold text-[#3d0a21] mb-4">Enter Pincode</h3>

        <button
          type="button"
          onClick={handleDetectLocation}
          disabled={detecting}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#3d0a21]/15 bg-[#fdf9f4] px-4 py-2.5 text-xs font-semibold text-[#3d0a21] transition hover:bg-[#f5efe8] disabled:opacity-50"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 3" />
          </svg>
          {detecting ? 'Detecting location…' : 'Detect my location'}
        </button>

        <div className="mb-3 flex items-center gap-3 text-[10px] text-[#8a8a8a] uppercase tracking-wider">
          <span className="h-px flex-1 bg-black/8" />
          or enter manually
          <span className="h-px flex-1 bg-black/8" />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Enter Delivery Pincode"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="flex-1 rounded border border-black/10 px-3 py-2 text-sm outline-none focus:border-[#3d0a21]/30 text-[#130006]"
          />
          <button
            type="submit"
            className="rounded bg-[#B76E79]/15 text-[#3b0d23] font-bold text-xs px-4 py-2 hover:bg-[#B76E79]/25 transition shrink-0"
          >
            Update
          </button>
        </form>
        {error && <p className="mt-2 text-xs text-red-600 font-medium">{error}</p>}
      </div>
    </div>
  );
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pincodeOpen, setPincodeOpen] = useState(false);
  const [deliveryPincode, setDeliveryPincode] = useState(() => {
    return localStorage.getItem('velisqa:delivery_pincode') || '';
  });
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

  // Auto-detect pincode via browser geolocation on first visit
  useEffect(() => {
    if (deliveryPincode) return; // already have one
    let cancelled = false;
    requestLocationPincode().then(({ pincode }) => {
      if (!cancelled && pincode) {
        setDeliveryPincode(pincode);
      }
    });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        
        // Find announcement bar to get its exact height dynamically
        const announcementEl = document.querySelector('[role="region"][aria-label="Store highlights"]');
        const announcementHeight = announcementEl ? announcementEl.getBoundingClientRect().height : 0;
        document.documentElement.style.setProperty("--nav-height", `${announcementHeight + height}px`);
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
      document.documentElement.style.removeProperty("--nav-height");
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
          className={`relative z-20 inline-flex min-h-9 shrink-0 items-center font-logo uppercase leading-none tracking-[0.2em] transition-colors duration-200 hover:opacity-80 ${
            scrolled
              ? "text-base sm:text-lg md:text-xl lg:text-2xl"
              : "text-lg sm:text-xl md:text-2xl lg:text-3xl"
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
              className="relative z-20 inline-flex min-h-9 shrink-0 items-center font-logo uppercase leading-none tracking-[0.2em] text-[#130006] transition-opacity hover:opacity-75 text-lg sm:text-xl md:text-2xl lg:text-3xl"
            >
              VELISQA
            </Link>

            <div className="hidden min-w-0 flex-1 items-center justify-center gap-6 md:flex">
              <PincodeLink pincode={deliveryPincode} onClick={() => setPincodeOpen(true)} />
              <HeaderSearchBar onOpen={openSearch} className="max-w-md" />
            </div>

            <div className="ml-auto flex shrink-0 items-center justify-end gap-2 sm:gap-4 items-stretch">
              <WishlistNavLink variant="labelled" onDarkHero={false} scrolled={false} onClick={closeMenu} className="!h-11" />
              <CartNavLink variant="labelled" onDarkHero={false} scrolled={false} onClick={closeMenu} className="!h-11" />
              <AccountNavMenu variant="labelled" scrolled={false} onDarkHero={false} />
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
            className="hidden items-center justify-center gap-6 border-t border-slate-100 py-3 xl:flex 2xl:gap-8 bg-white"
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
                    `relative inline-flex min-h-9 items-center whitespace-nowrap text-xs md:text-sm font-semibold tracking-[0.15em] uppercase transition-colors duration-200 ${
                      isActive
                        ? "text-[#8B6914] font-bold"
                        : "text-slate-800 hover:text-[#8B6914]"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span>{link.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="shop-desktop-active-underline"
                          className="absolute -bottom-3 left-0 right-0 h-[2.5px] bg-[#8B6914] rounded-full"
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
      {pincodeOpen && (
        <PincodeModal
          initialValue={deliveryPincode}
          onClose={() => setPincodeOpen(false)}
          onUpdate={(pin) => {
            setDeliveryPincode(pin);
            localStorage.setItem('velisqa:delivery_pincode', pin);
          }}
        />
      )}
    </motion.header>
  );
}
