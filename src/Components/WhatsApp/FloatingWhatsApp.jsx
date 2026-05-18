import { motion } from "framer-motion";
import { createWhatsAppLink } from "./whatsapp";

export default function FloatingWhatsApp() {
  return (
    <div>
      <div className="pointer-events-none fixed inset-0 z-40 flex items-end justify-end p-6 md:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="pointer-events-auto hidden md:flex"
        >
          <a
            href={createWhatsAppLink("Hello VELISQA, I'd like private assistance with a purchase.")}
            target="_blank"
            rel="noreferrer"
            className="group relative flex items-center gap-3 rounded-full bg-[#130006]/85 px-4 py-3 shadow-2xl ring-1 ring-[#d4af37]/20 backdrop-blur-md"
            aria-label="Contact VELISQA on WhatsApp"
          >
            <div className="absolute -inset-1 -z-10 rounded-full bg-gradient-to-br from-[#1b1b18]/40 via-[#3a201e]/20 to-[#d4af37]/10 opacity-60 blur-lg transition-opacity group-hover:opacity-100" />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M17.5 14.5c-.4-.2-2.4-1.2-2.8-1.3-.4-.1-.6-.2-.8.2-.2.4-.8 1.3-1 1.6-.2.3-.4.3-.8.1-.4-.2-1.6-.6-3-1.9-1.1-1-1.8-2.3-2-2.7-.2-.4 0-.6.2-.8.2-.2.4-.6.6-1 .2-.4.1-.7 0-.9-.1-.2-.8-1.9-1.1-2.6-.3-.7-.6-.6-.8-.6-.2 0-.4 0-.7 0-.3 0-.9.1-1.3.6-.4.5-1.5 1.5-1.5 3.6 0 2.1 1.5 4.2 1.7 4.5.2.3 2.8 4.4 6.9 6.1 4.1 1.7 4.1 1.1 4.9 1 0 0 1.5-.6 2.1-1.4.6-.8 1.3-1.9 1.4-3.1.1-1.2-.8-1.8-1.2-2z" fill="#d4af37" />
            </svg>

            <div className="flex flex-col pr-2">
              <span className="label-stitch text-sm tracking-[0.08em] text-[#ffe088]">Luxury Concierge</span>
              <span className="text-xs text-[#d8caa1] opacity-90">Private Purchase Assistance</span>
            </div>
          </a>
        </motion.div>
      </div>

      <div className="fixed bottom-5 left-1/2 z-50 flex w-full -translate-x-1/2 justify-center px-4 md:hidden">
        <a
          href={createWhatsAppLink("Hello VELISQA, I'm interested in a piece and would like private assistance.")}
          className="tap-target flex w-full max-w-sm items-center justify-center gap-3 rounded-full bg-[#130006] px-5 py-3 shadow-2xl ring-1 ring-[#d4af37]/25"
          target="_blank"
          rel="noreferrer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M17.5 14.5c-.4-.2-2.4-1.2-2.8-1.3-.4-.1-.6-.2-.8.2-.2.4-.8 1.3-1 1.6-.2.3-.4.3-.8.1-.4-.2-1.6-.6-3-1.9-1.1-1-1.8-2.3-2-2.7-.2-.4 0-.6.2-.8.2-.2.4-.6.6-1 .2-.4.1-.7 0-.9-.1-.2-.8-1.9-1.1-2.6-.3-.7-.6-.6-.8-.6-.2 0-.4 0-.7 0-.3 0-.9.1-1.3.6-.4.5-1.5 1.5-1.5 3.6 0 2.1 1.5 4.2 1.7 4.5.2.3 2.8 4.4 6.9 6.1 4.1 1.7 4.1 1.1 4.9 1 0 0 1.5-.6 2.1-1.4.6-.8 1.3-1.9 1.4-3.1.1-1.2-.8-1.8-1.2-2z" fill="#d4af37" />
          </svg>
          <span className="label-stitch text-xs text-[#ffe088] sm:text-sm">Order via WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
