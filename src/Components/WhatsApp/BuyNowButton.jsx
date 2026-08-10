import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPrimaryImageUrl } from "../../lib/productImages";
import { useCart } from "../../context/CartContext";
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
  variant = "solid",
}) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const resolvedName = productName ?? product?.name;
  const resolvedImage = productImage ?? (product ? getPrimaryImageUrl(product) : null);
  const resolvedProductId = productId ?? product?.id ?? null;
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  
  const label = soldOut ? "Enquire this product" : children;
  const resolvedUrl = productUrl || (typeof window !== "undefined" ? window.location.href : "");

  function handleBuyNow() {
    if (soldOut) {
      setEnquiryOpen(true);
      return;
    }
    if (product) {
      addToCart(product, 1);
      navigate("/checkout");
    }
  }

  const baseStyles =
    "tap-target inline-flex max-w-full min-w-0 items-center justify-center gap-2 rounded-sm px-4 py-2 text-center font-bold transition-all cursor-pointer";
  const visual = variant === "outline"
    ? "bg-white text-[#3B0D23] border border-[#3B0D23] hover:bg-[#F8F6F3]/40"
    : "bg-[#3B0D23] text-white hover:bg-[#2A0718]";
  const premiumStyles =
    "ring-transparent";

  return (
    <div className="flex w-full max-w-full flex-col items-center">
      {soldOut && (
        <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37] sm:text-[10px]">
          Out of stock
        </p>
      )}
      <motion.button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleBuyNow();
        }}
        whileHover={{ y: -2, scale: 1.01 }}
        whileTap={{ scale: 0.985 }}
        className={`${baseStyles} ${visual} ${premiumStyles} ${className}`}
        aria-label={soldOut ? `Sold out — ${label} for ${resolvedName || "this piece"}` : undefined}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path
            d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M3 6h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <path
            d="M16 10a4 4 0 0 1-8 0"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
        <span className="label-stitch min-w-0 text-[11px] leading-snug tracking-[0.08em] uppercase">{label}</span>
      </motion.button>

      {/* Keep OrderFormModal only for enquiries (out of stock) */}
      {soldOut && (
        <OrderFormModal
          open={enquiryOpen}
          onClose={() => setEnquiryOpen(false)}
          productName={resolvedName}
          productUrl={resolvedUrl}
          productImage={resolvedImage}
          productPrice={productPrice}
          productId={resolvedProductId}
          variant="enquiry"
        />
      )}
    </div>
  );
}
