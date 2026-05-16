import { NavLink, Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import WhatsAppCTA from "./WhatsApp/WhatsAppCTA";

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
  const closeMenu = () => setIsOpen(false);

  return (
    <motion.header
      initial={{ y: -6, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="fixed left-0 right-0 top-0 z-50 border-b border-[#847377]/10 bg-[#fdf9f4]/85 shadow-[0_8px_24px_rgba(19,0,6,0.03)] backdrop-blur-xl transition-all duration-300"
    >
      <div className="container-stitch relative flex min-h-[56px] items-center justify-between py-2.5 md:min-h-[72px] md:py-3">
        
        {/* Brand Logo */}
        <Link
          to="/"
          onClick={closeMenu}
          className="font-serif text-[1.25rem] font-medium leading-none tracking-[0.06em] text-[#130006] transition-opacity duration-300 hover:opacity-80 sm:text-2xl md:text-3xl"
        >
          <motion.span whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
            VELISQA
          </motion.span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-5 lg:gap-8 md:flex md:absolute md:left-[52%] md:-translate-x-1/2 md:z-20">
          {links.map((link) => {
            const isHome = link.label === "HOME";
            return (
              <NavLink
                key={link.label}
                to={link.to}
                end={isHome}
                className={({ isActive }) =>
                  `relative py-1 text-[0.72rem] font-medium tracking-[0.12em] transition-colors duration-300 ease-out hover:text-[#130006] ${
                    isActive ? "text-[#130006]" : "text-[#514347]/80"
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
                        className="absolute bottom-0 left-0 h-[2px] w-full bg-[#afa0d1]"
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
        <div className="hidden items-center text-[#130006] md:flex">
          <WhatsAppCTA
            className="hidden md:inline-flex px-5 py-2 transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] text-sm"
            intent="consult"
          >
            Luxury Concierge
          </WhatsAppCTA>
        </div>

        {/* Premium Animated Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="grid h-9 w-9 place-items-center rounded-full border border-[#130006]/6 text-[#130006] transition-all duration-300 hover:border-[#130006]/20 md:hidden focus:outline-none"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isOpen}
        >
          <div className="relative flex h-2.5 w-4 flex-col justify-between" aria-hidden="true">
            <span className={`h-[1px] w-4 bg-current transition-all duration-300 ease-out ${isOpen ? "translate-y-[4px] rotate-45" : ""}`} />
            <span className={`h-[1px] w-4 bg-current transition-all duration-300 ease-out ${isOpen ? "scale-x-0 opacity-0" : ""}`} />
            <span className={`h-[1px] w-4 bg-current transition-all duration-300 ease-out ${isOpen ? "-translate-y-[4px] -rotate-45" : ""}`} />
          </div>
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute left-0 right-0 border-t border-[#847377]/10 bg-[#fdf9f4]/98 px-6 pb-6 pt-3 shadow-2xl backdrop-blur-2xl md:hidden"
          >
            <nav className="mx-auto flex max-w-md flex-col">
              {links.map((link) => (
                <motion.div key={link.label} variants={linkVariants}>
                  <NavLink
                    to={link.to}
                    end={link.label === "HOME"}
                    onClick={closeMenu}
                    className={({ isActive }) =>
                      `group flex min-h-[48px] items-center justify-between border-b border-[#847377]/5 text-[0.78rem] font-medium tracking-[0.10em] transition-colors duration-300 ${
                        isActive ? "text-[#130006]" : "text-[#514347]/90"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <motion.span className="relative transition-transform duration-300 group-hover:translate-x-1" whileHover={{ x: 2 }}>
                          {link.label}
                          {isActive && (
                            <span className="absolute -left-3 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-[#a0d1b8]" />
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
                <WhatsAppCTA className="w-full justify-center py-3 shadow-sm transition-transform active:scale-[0.99] text-sm" intent="consult">
                  Luxury Concierge
                </WhatsAppCTA>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}