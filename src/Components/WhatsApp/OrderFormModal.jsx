import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { getLenis } from "../../lib/smoothScrollState";
import { buildCartOrderWhatsAppMessage, buildOrderWhatsAppMessage, createWhatsAppLink } from "./whatsapp";
import { formatInr, getCartTotal } from "../../lib/cartStock";

const fieldClass =
  "w-full min-w-0 rounded-lg border border-[#130006]/15 bg-white px-3 py-2 text-sm text-[#130006] outline-none transition placeholder:text-[#847377]/55 focus:border-[#6f334a] focus:ring-1 focus:ring-[#6f334a]/20";

function mapsLink(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export default function OrderFormModal({
  open,
  onClose,
  productName,
  productUrl,
  variant = "order",
  cartItems = null,
  stockWarnings = [],
  onCheckoutSuccess,
}) {
  const isEnquiry = variant === "enquiry";
  const isCart = Array.isArray(cartItems) && cartItems.length > 0;
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [locationStatus, setLocationStatus] = useState("idle");
  const [coords, setCoords] = useState(null);
  const [locationNote, setLocationNote] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    const lenis = getLenis();
    lenis?.stop();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
      lenis?.start();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setLocationStatus("idle");
      setCoords(null);
      setLocationNote("");
    }
  }, [open]);

  function handleUseLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      return;
    }

    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        setLocationStatus("ready");
      },
      () => setLocationStatus("denied"),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const customer = {
      name: String(form.get("name") || "").trim(),
      phone: String(form.get("phone") || "").trim(),
      email: "",
      address: String(form.get("address") || "").trim(),
      city: "",
      pincode: "",
      locationLabel: locationNote.trim() || (coords ? "GPS coordinates shared" : ""),
      locationMapsUrl: coords ? mapsLink(coords.lat, coords.lng) : "",
      notes: String(form.get("notes") || "").trim(),
    };

    const message = isCart
      ? buildCartOrderWhatsAppMessage({
          cartItems,
          stockWarnings,
          ...customer,
        })
      : buildOrderWhatsAppMessage({
          productName,
          productUrl: productUrl || window.location.href,
          ...customer,
          enquiryType: isEnquiry ? "enquiry" : "order",
        });

    window.open(createWhatsAppLink(message), "_blank", "noopener,noreferrer");
    onCheckoutSuccess?.();
    onClose();
  }

  const submitLabel = isCart
    ? "Send order on WhatsApp"
    : isEnquiry
      ? "Send enquiry"
      : "Send order on WhatsApp";

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          key="order-form-overlay"
          className="fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-[#130006]/75 backdrop-blur-[2px]"
            onClick={onClose}
            aria-label="Close order form"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-lenis-prevent
            className="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-[#d4af37]/20 bg-[#fbf7f1] shadow-[0_24px_80px_rgba(19,0,6,0.35)] sm:max-h-[min(90vh,640px)] sm:rounded-2xl"
            initial={{ y: "100%", opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#d4af37]/15 px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="font-serif text-lg leading-tight text-[#130006] sm:text-xl">
                  {isCart ? "Checkout on WhatsApp" : isEnquiry ? "Enquire on WhatsApp" : "Buy on WhatsApp"}
                </h2>
                {isCart ? (
                  <p className="mt-0.5 text-xs font-medium text-[#6f334a]">
                    {cartItems.length} item{cartItems.length === 1 ? "" : "s"} · {formatInr(getCartTotal(cartItems))}
                  </p>
                ) : (
                  productName && (
                    <p className="mt-0.5 line-clamp-1 text-xs font-medium text-[#6f334a]">{productName}</p>
                  )
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#130006]/10 text-lg leading-none text-[#130006] transition hover:bg-[#130006]/5"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
              <div className="space-y-3 overflow-y-auto overscroll-contain px-4 py-3 sm:space-y-3.5 sm:px-5 sm:py-4">
                {isEnquiry && (
                  <p className="rounded-lg border border-[#d4af37]/25 bg-[#3d0a21]/[0.05] px-3 py-2 text-[11px] leading-snug text-[#514347]">
                    Made to order — our team will confirm availability and delivery timeline.
                  </p>
                )}

                {isCart && stockWarnings.length > 0 && (
                  <div className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-950">
                    {stockWarnings.map((w) => (
                      <p key={w}>{w}</p>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                  <label className="flex flex-col gap-1 sm:col-span-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#514347]">
                      Name <span className="text-[#6f334a]">*</span>
                    </span>
                    <input
                      className={fieldClass}
                      name="name"
                      required
                      autoComplete="name"
                      placeholder="Your name"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#514347]">
                      WhatsApp <span className="text-[#6f334a]">*</span>
                    </span>
                    <input
                      className={fieldClass}
                      name="phone"
                      type="tel"
                      required
                      autoComplete="tel"
                      placeholder="+91 98765 43210"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#514347]">
                      Notes
                    </span>
                    <input
                      className={fieldClass}
                      name="notes"
                      placeholder="Size, date…"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#514347]">
                    Delivery address <span className="text-[#6f334a]">*</span>
                  </span>
                  <textarea
                    className={`${fieldClass} min-h-[56px] resize-none sm:min-h-[60px]`}
                    name="address"
                    required
                    rows={2}
                    autoComplete="street-address"
                    placeholder="House, area, city, PIN"
                  />
                </label>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#514347]">
                    Location <span className="font-normal normal-case tracking-normal text-[#847377]">(optional)</span>
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleUseLocation}
                      disabled={locationStatus === "loading"}
                      className="tap-target shrink-0 rounded-lg border border-[#3d0a21]/15 bg-[#3d0a21]/5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#3d0a21] transition hover:bg-[#3d0a21]/10 disabled:opacity-60 sm:px-3.5 sm:text-[11px]"
                      title="Share GPS location"
                    >
                      {locationStatus === "loading"
                        ? "…"
                        : locationStatus === "ready"
                          ? "✓ GPS"
                          : "Use GPS"}
                    </button>
                    <input
                      className={`${fieldClass} min-w-0 flex-1`}
                      value={locationNote}
                      onChange={(e) => setLocationNote(e.target.value)}
                      placeholder="Landmark or area"
                      aria-label="Location notes"
                    />
                  </div>
                  {locationStatus === "denied" && (
                    <p className="text-[10px] text-[#9b4d4d]">GPS blocked — type landmark above.</p>
                  )}
                  {locationStatus === "ready" && (
                    <p className="text-[10px] font-medium text-[#2d6a4f]">Location will be included.</p>
                  )}
                </div>
              </div>

              <div className="shrink-0 border-t border-[#d4af37]/15 bg-[#fbf7f1] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
                <button
                  type="submit"
                  className="tap-target inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[#d4af37]/20 bg-[#2A0718] px-4 text-[11px] font-bold uppercase tracking-[0.1em] text-[#f7ead0] shadow-[0_8px_24px_rgba(42,7,24,0.35)] transition hover:bg-[#3d0a21] sm:h-12 sm:text-xs"
                >
                  <WhatsAppIcon />
                  <span className="truncate">{submitLabel}</span>
                </button>
                <p className="mt-1.5 text-center text-[10px] leading-snug text-[#847377]">
                  Opens WhatsApp with your details pre-filled.
                </p>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
