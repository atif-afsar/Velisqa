import { motion } from "framer-motion";
import { useState } from "react";
import OrderFormModal from "./OrderFormModal";

export default function BuyNowButton({
  productName,
  productUrl,
  children = "Buy Now",
  className = "",
  soldOut = false,
}) {
  const [open, setOpen] = useState(false);
  const label = soldOut ? "Enquire to purchase" : children;

  const baseStyles =
    "tap-target inline-flex max-w-full min-w-0 items-center justify-center gap-3 rounded-full px-4 py-2 text-center font-medium transition-all";
  const visual =
    "bg-[#3d0a21] text-[#d4af37] border border-[#d4af37]/20 shadow-none";
  const premiumStyles =
    "bg-clip-padding backdrop-blur-sm bg-gradient-to-b from-[#3d0a21] via-[#4c172f] to-[#2a0712] text-[#d4af37] ring-transparent";
  const accent =
    "relative before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-gradient-to-r before:from-[#3d0a21]/95 before:via-[#4c172f]/60 before:to-[#3d0a21]/95";

  return (
    <div className="flex w-full max-w-full flex-col items-center">
      {soldOut && (
        <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#c9a75a] sm:text-[10px]">
          Sold out
        </p>
      )}
      <motion.button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        whileHover={{ y: -2, scale: 1.01 }}
        whileTap={{ scale: 0.985 }}
        className={`${baseStyles} ${visual} ${premiumStyles} ${accent} ${className}`}
        aria-label={soldOut ? `Sold out — ${label} for ${productName || "this piece"}` : undefined}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path
            d="M17.5 14.5c-.4-.2-2.4-1.2-2.8-1.3-.4-.1-.6-.2-.8.2-.2.4-.8 1.3-1 1.6-.2.3-.4.3-.8.1-.4-.2-1.6-.6-3-1.9-1.1-1-1.8-2.3-2-2.7-.2-.4 0-.6.2-.8.2-.2.4-.6.6-1 .2-.4.1-.7 0-.9-.1-.2-.8-1.9-1.1-2.6-.3-.7-.6-.6-.8-.6-.2 0-.4 0-.7 0-.3 0-.9.1-1.3.6-.4.5-1.5 1.5-1.5 3.6 0 2.1 1.5 4.2 1.7 4.5.2.3 2.8 4.4 6.9 6.1 4.1 1.7 4.1 1.1 4.9 1 0 0 1.5-.6 2.1-1.4.6-.8 1.3-1.9 1.4-3.1.1-1.2-.8-1.8-1.2-2z"
            fill="#c9a75a"
          />
        </svg>
        <span className="label-stitch min-w-0 text-sm leading-snug tracking-[0.12em]">{label}</span>
      </motion.button>

      <OrderFormModal
        open={open}
        onClose={() => setOpen(false)}
        productName={productName}
        productUrl={productUrl}
        variant={soldOut ? "enquiry" : "order"}
      />
    </div>
  );
}
