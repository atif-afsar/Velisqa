import { motion } from "framer-motion";
import { useState } from "react";
import { getPrimaryImageUrl } from "../../lib/productImages";
import { useAuth } from "../../context/AuthContext";
import OrderFormModal from "./OrderFormModal";

export default function BuyNowButton({
  productName,
  productUrl,
  productImage,
  productPrice,
  productId,
  product,
  children = "Buy Now",
  className = "",
  soldOut = false,
}) {
  const resolvedName = productName ?? product?.name;
  const resolvedImage = productImage ?? (product ? getPrimaryImageUrl(product) : null);
  const resolvedPrice = productPrice ?? product?.price ?? null;
  const resolvedProductId = productId ?? product?.id ?? null;
  const [formOpen, setFormOpen] = useState(false);
  const { requireSignIn } = useAuth();
  const label = soldOut ? "Enquire this product" : children;
  const resolvedUrl =
    productUrl || (typeof window !== "undefined" ? window.location.href : "");

  function openOrderForm() {
    if (soldOut) {
      setFormOpen(true);
      return;
    }
    requireSignIn(() => setFormOpen(true));
  }

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
          Out of stock
        </p>
      )}
      <motion.button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openOrderForm();
        }}
        whileHover={{ y: -2, scale: 1.01 }}
        whileTap={{ scale: 0.985 }}
        className={`${baseStyles} ${visual} ${premiumStyles} ${accent} ${className}`}
        aria-label={soldOut ? `Sold out — ${label} for ${resolvedName || "this piece"}` : undefined}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path
            d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6Z"
            stroke="#c9a75a"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M3 6h18" stroke="#c9a75a" strokeWidth="1.75" strokeLinecap="round" />
          <path
            d="M16 10a4 4 0 0 1-8 0"
            stroke="#c9a75a"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
        <span className="label-stitch min-w-0 text-sm leading-snug tracking-[0.12em]">{label}</span>
      </motion.button>

      <OrderFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        productName={resolvedName}
        productUrl={resolvedUrl}
        productImage={resolvedImage}
        productPrice={resolvedPrice}
        productId={resolvedProductId}
        variant={soldOut ? "enquiry" : "order"}
      />
    </div>
  );
}
