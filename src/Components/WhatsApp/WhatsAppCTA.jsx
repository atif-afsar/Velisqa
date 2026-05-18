import { motion } from "framer-motion";
import { buildWhatsAppMessage, createWhatsAppLink } from "./whatsapp";

export default function WhatsAppCTA({ productName, productUrl, children, intent = "inquiry", className = "" }) {
  const href = createWhatsAppLink(buildWhatsAppMessage({ productName, productUrl, intent }));
  const baseStyles =
    "tap-target inline-flex max-w-full min-w-0 items-center justify-center gap-3 rounded-full px-4 py-2 text-center font-medium transition-all";

  const visual =
    "bg-[#3d0a21] text-[#d4af37] border border-[#d4af37]/20 shadow-none";

  const premiumStyles =
    "bg-clip-padding backdrop-blur-sm bg-gradient-to-b from-[#3d0a21] via-[#4c172f] to-[#2a0712] text-[#d4af37] ring-transparent";

  const accent =
    "relative before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-gradient-to-r before:from-[#3d0a21]/95 before:via-[#4c172f]/60 before:to-[#3d0a21]/95";

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noreferrer"
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
      className={`${baseStyles} ${visual} ${premiumStyles} ${accent} ${className}`}
      title={children || "Luxury Concierge"}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M20.52 3.48A11.87 11.87 0 0012.01.5C6.03.5 1.07 5.48 1.07 11.5c0 2.03.53 3.92 1.5 5.56L.5 23.5l6.78-2.22c1.55.86 3.3 1.33 5.14 1.33h.59c6 0 10.96-4.98 10.96-11 0-3.02-1.15-5.77-3.04-7.63z" fill="#c2a35a" opacity="0.06" />
        <path d="M17.5 14.5c-.4-.2-2.4-1.2-2.8-1.3-.4-.1-.6-.2-.8.2-.2.4-.8 1.3-1 1.6-.2.3-.4.3-.8.1-.4-.2-1.6-.6-3-1.9-1.1-1-1.8-2.3-2-2.7-.2-.4 0-.6.2-.8.2-.2.4-.6.6-1 .2-.4.1-.7 0-.9-.1-.2-.8-1.9-1.1-2.6-.3-.7-.6-.6-.8-.6-.2 0-.4 0-.7 0-.3 0-.9.1-1.3.6-.4.5-1.5 1.5-1.5 3.6 0 2.1 1.5 4.2 1.7 4.5.2.3 2.8 4.4 6.9 6.1 4.1 1.7 4.1 1.1 4.9 1 0 0 1.5-.6 2.1-1.4.6-.8 1.3-1.9 1.4-3.1.1-1.2-.8-1.8-1.2-2z" fill="#c9a75a" />
      </svg>
      <span className="label-stitch min-w-0 text-sm leading-snug tracking-[0.12em] sm:text-sm">
        {children || "Luxury Concierge"}
      </span>
    </motion.a>
  );
}
