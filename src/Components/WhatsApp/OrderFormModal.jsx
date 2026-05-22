import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { getLenis } from "../../lib/smoothScrollState";
import { buildCartOrderWhatsAppMessage, buildOrderWhatsAppMessage, createWhatsAppLink } from "./whatsapp";
import { formatInr, getCartTotal } from "../../lib/cartStock";

const fieldClass =
  "w-full min-w-0 border border-[#130006]/20 bg-white/80 px-3 py-2.5 text-base text-[#130006] outline-none transition placeholder:text-[#847377]/50 focus:border-[#6f334a] focus:ring-1 focus:ring-[#6f334a]/25 sm:text-sm";

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
      email: String(form.get("email") || "").trim(),
      address: String(form.get("address") || "").trim(),
      city: String(form.get("city") || "").trim(),
      pincode: String(form.get("pincode") || "").trim(),
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

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          key="order-form-overlay"
          className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4 md:p-6"
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
            className="relative z-10 flex max-h-[min(92dvh,100%)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[#d4af37]/20 bg-[#fbf7f1] shadow-[0_24px_80px_rgba(19,0,6,0.35)] sm:max-h-[min(88vh,720px)] sm:rounded-2xl"
            initial={{ y: "100%", opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#d4af37]/15 px-4 py-3.5 sm:gap-4 sm:px-6 sm:py-4">
              <div className="min-w-0 flex-1 pr-2">
                <p className="label-stitch text-[9px] uppercase tracking-[0.18em] text-[#847377] sm:text-[10px]">
                  {isEnquiry ? "Register interest" : "Complete your order"}
                </p>
                <h2 id={titleId} className="mt-1 font-serif text-lg leading-tight text-[#130006] sm:text-2xl">
                  {isCart ? "Checkout on WhatsApp" : isEnquiry ? "Enquire on WhatsApp" : "Buy on WhatsApp"}
                </h2>
                {isCart ? (
                  <p className="mt-1 text-xs font-medium text-[#6f334a] sm:text-sm">
                    {cartItems.length} product{cartItems.length === 1 ? "" : "s"} · {formatInr(getCartTotal(cartItems))}
                  </p>
                ) : (
                  productName && (
                    <p className="mt-1 line-clamp-2 text-xs font-medium text-[#6f334a] sm:text-sm">{productName}</p>
                  )
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#130006]/10 text-xl leading-none text-[#130006] transition hover:bg-[#130006]/5 sm:h-10 sm:w-10"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
                <div className="space-y-4">
                  {isCart && (
                    <div className="rounded-xl border border-[#d4af37]/25 bg-white/60 p-3.5 sm:p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#514347]">Your cart</p>
                      <ul className="mt-2 space-y-2">
                        {cartItems.map((item) => (
                          <li
                            key={item.productId}
                            className="flex justify-between gap-3 text-xs text-[#514347] sm:text-sm"
                          >
                            <span className="min-w-0 truncate font-medium text-[#130006]">
                              {item.name} × {item.quantity}
                            </span>
                            <span className="shrink-0 tabular-nums">
                              {formatInr((Number(item.price) || 0) * item.quantity)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {stockWarnings.length > 0 && (
                        <div className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                          {stockWarnings.map((w) => (
                            <p key={w} className="leading-snug">
                              {w}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {isEnquiry && (
                    <div className="rounded-xl border border-[#d4af37]/30 bg-[#3d0a21]/[0.06] px-3.5 py-3 text-left sm:px-4 sm:py-3.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6f334a]">
                        Made to order · not same-day delivery
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-[#514347]">
                        Share your details and our concierge will confirm availability, lead time, and dispatch — fine jewellery is prepared and shipped on an agreed timeline.
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5 sm:col-span-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#514347]">
                        Full name <span className="text-[#6f334a]">*</span>
                      </span>
                      <input
                        className={fieldClass}
                        name="name"
                        required
                        autoComplete="name"
                        placeholder="Your name"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#514347]">
                        WhatsApp / phone <span className="text-[#6f334a]">*</span>
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
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#514347]">
                        Email
                      </span>
                      <input
                        className={fieldClass}
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@email.com"
                      />
                    </label>
                  </div>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#514347]">
                      Delivery address <span className="text-[#6f334a]">*</span>
                    </span>
                    <textarea
                      className={`${fieldClass} min-h-[80px] resize-y sm:min-h-[88px]`}
                      name="address"
                      required
                      autoComplete="street-address"
                      placeholder="House no., street, landmark, area"
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#514347]">
                        City
                      </span>
                      <input
                        className={fieldClass}
                        name="city"
                        autoComplete="address-level2"
                        placeholder="Mumbai"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#514347]">
                        PIN code
                      </span>
                      <input
                        className={fieldClass}
                        name="pincode"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        placeholder="400001"
                      />
                    </label>
                  </div>

                  <div className="rounded-xl border border-[#d4af37]/25 bg-white/50 p-3.5 sm:p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#514347]">
                      Live location
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#847377]">
                      Share GPS so our team can confirm delivery. You can add a landmark below.
                    </p>
                    <button
                      type="button"
                      onClick={handleUseLocation}
                      disabled={locationStatus === "loading"}
                      className="tap-target mt-3 w-full rounded-full border border-[#3d0a21]/20 bg-[#3d0a21]/5 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[#3d0a21] transition hover:bg-[#3d0a21]/10 disabled:opacity-60 sm:py-2.5 sm:text-xs"
                    >
                      {locationStatus === "loading" ? "Getting location…" : "Use my current location"}
                    </button>
                    {locationStatus === "ready" && coords && (
                      <p className="mt-2 text-xs font-medium text-[#2d6a4f]">
                        Location captured — will be sent with your order.
                      </p>
                    )}
                    {locationStatus === "denied" && (
                      <p className="mt-2 text-xs text-[#9b4d4d]">
                        Location blocked. Type a landmark or area in the field below.
                      </p>
                    )}
                    {locationStatus === "unsupported" && (
                      <p className="mt-2 text-xs text-[#847377]">
                        GPS not available on this device — use the field below.
                      </p>
                    )}
                    <input
                      className={`${fieldClass} mt-3`}
                      value={locationNote}
                      onChange={(e) => setLocationNote(e.target.value)}
                      placeholder="Landmark / area (optional)"
                      aria-label="Location notes"
                    />
                  </div>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#514347]">
                      Order notes
                    </span>
                    <input
                      className={fieldClass}
                      name="notes"
                      placeholder="Size, occasion, preferred delivery date…"
                    />
                  </label>
                </div>
              </div>

              <div className="shrink-0 border-t border-[#d4af37]/15 bg-[#fbf7f1] px-4 py-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
                <button
                  type="submit"
                  className="tap-target inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-[0_12px_32px_rgba(37,211,102,0.35)] transition hover:bg-[#1fb855] sm:px-6 sm:text-sm sm:tracking-[0.14em]"
                >
                  <WhatsAppIcon />
                  {isCart ? "Send cart order on WhatsApp" : isEnquiry ? "Send enquiry on WhatsApp" : "Send order on WhatsApp"}
                </button>
                <p className="mt-2 text-center text-[10px] leading-relaxed text-[#847377]">
                  {isEnquiry
                    ? "Opens WhatsApp with your enquiry — our team will respond with timelines (delivery is not same-day)."
                    : "Opens WhatsApp with your details pre-filled for Velisqa concierge."}
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
