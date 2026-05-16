import { motion } from "framer-motion";

function buildWhatsAppLink({ productName, productUrl, intent = "inquiry" }) {
  const base = "https://wa.me/?text="; // opens WhatsApp with prefilled message
  let message = "Hello VELISQA, I’m interested in this jewellery piece. Please assist me with pricing and delivery.";
  if (intent === "consult") {
    message = "Hello VELISQA, I’d like to book a private consultation. Please assist me with scheduling and pricing.";
  }
  if (productName) message = `Hello VELISQA, I’m interested in **${productName}**. Please assist me with pricing and delivery.`;
  if (productUrl) message += `\n\n${productUrl}`;
  return base + encodeURIComponent(message);
}

export default function WhatsAppCTA({ productName, productUrl, children, intent = "inquiry", className = "" }) {
  const href = buildWhatsAppLink({ productName, productUrl, intent });

  const baseStyles = "inline-flex items-center gap-3 rounded-full px-6 py-3 font-semibold shadow-lg transition-transform";
  const visual = "bg-[#130006] text-[#ffe088] hover:scale-102 focus:outline-none focus:ring-2 focus:ring-[#e9c349]/30";

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noreferrer"
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      className={`${baseStyles} ${visual} ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M20.52 3.48A11.87 11.87 0 0012.01.5C6.03.5 1.07 5.48 1.07 11.5c0 2.03.53 3.92 1.5 5.56L.5 23.5l6.78-2.22c1.55.86 3.3 1.33 5.14 1.33h.59c6 0 10.96-4.98 10.96-11 0-3.02-1.15-5.77-3.04-7.63z" fill="#c2a35a" opacity="0.08" />
        <path d="M17.5 14.5c-.4-.2-2.4-1.2-2.8-1.3-.4-.1-.6-.2-.8.2-.2.4-.8 1.3-1 1.6-.2.3-.4.3-.8.1-.4-.2-1.6-.6-3-1.9-1.1-1-1.8-2.3-2-2.7-.2-.4 0-.6.2-.8.2-.2.4-.6.6-1 .2-.4.1-.7 0-.9-.1-.2-.8-1.9-1.1-2.6-.3-.7-.6-.6-.8-.6-.2 0-.4 0-.7 0-.3 0-.9.1-1.3.6-.4.5-1.5 1.5-1.5 3.6 0 2.1 1.5 4.2 1.7 4.5.2.3 2.8 4.4 6.9 6.1 4.1 1.7 4.1 1.1 4.9 1 0 0 1.5-.6 2.1-1.4.6-.8 1.3-1.9 1.4-3.1.1-1.2-.8-1.8-1.2-2z" fill="#ffe088" />
      </svg>
      <span className="label-stitch tracking-[0.08em] text-sm">{children || "Enquire on WhatsApp"}</span>
    </motion.a>
  );
}
