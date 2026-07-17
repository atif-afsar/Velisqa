import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { createManualPaymentOrder, orderPrivateUrl } from "../../lib/manualPayments";
import { buildOrderEmailPayload, submitOrderEmail } from "../../lib/orderEmail";
import { trackInitiateCheckout } from "../../lib/metaPixel";
import { validateIndianPhone } from "../../lib/indianPhone";
import { getLenis } from "../../lib/smoothScrollState";
import OrderConfirmation from "../Checkout/OrderConfirmation";
import OrderProductPreview from "../Checkout/OrderProductPreview";

const fieldClass =
  "box-border w-full min-w-0 max-w-full rounded-lg border border-[#130006]/15 bg-white px-3 py-2.5 text-base text-[#130006] outline-none transition placeholder:text-[#847377]/55 focus:border-[#6f334a] focus:ring-1 focus:ring-[#6f334a]/20 sm:py-2 sm:text-sm";

function mapsLink(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function productIdFromUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    const match = url.pathname.match(/\/product\/([^/]+)/);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

const PAYMENT_OPTIONS = [
  {
    value: "cod",
    label: "Cash on delivery",
    hint: "Pay when your order arrives",
    icon: "💵",
  },
  {
    value: "online",
    label: "UPI QR payment",
    hint: "Scan QR and upload payment proof",
    icon: "💳",
  },
];

export default function OrderFormModal({
  open,
  onClose,
  productName,
  productUrl,
  productImage = null,
  productPrice = null,
  productId = null,
  variant = "order",
  cartItems = null,
  stockWarnings = [],
  onCheckoutSuccess,
}) {
  const navigate = useNavigate();
  const isEnquiry = variant === "enquiry";
  const isCart = Array.isArray(cartItems) && cartItems.length > 0;
  const titleId = useId();
  const [locationStatus, setLocationStatus] = useState("idle");
  const [coords, setCoords] = useState(null);
  const [locationNote, setLocationNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmation, setConfirmation] = useState(null);

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
      queueMicrotask(() => {
        setLocationStatus("idle");
        setCoords(null);
        setLocationNote("");
        setPaymentMethod("cod");
        setSubmitting(false);
        setSubmitError("");
        setConfirmation(null);
      });
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

  function handleCloseAll() {
    onCheckoutSuccess?.();
    onClose();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError("");
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

    if (!isEnquiry) {
      const phoneCheck = validateIndianPhone(customer.phone);
      if (!phoneCheck.ok) {
        setSubmitError(phoneCheck.message);
        setSubmitting(false);
        return;
      }
      customer.phone = phoneCheck.phone;
    }

    const resolvedPayment = isEnquiry ? "cod" : paymentMethod;
    setSubmitting(true);

    // Sold-out / interest enquiries still notify via email (not a stocked order).
    if (isEnquiry) {
      const emailPayload = buildOrderEmailPayload({
        productName,
        productUrl: productUrl || (typeof window !== "undefined" ? window.location.href : ""),
        cartItems: null,
        stockWarnings,
        paymentMethod: resolvedPayment,
        customer,
        enquiryType: "enquiry",
      });

      try {
        const result = await submitOrderEmail({
          ...emailPayload,
          customer,
        });

        if (!result.ok) {
          setSubmitError(result.error);
          return;
        }

        setConfirmation({
          variant: "enquiry",
          customerName: customer.name,
          orderRef: result.orderRef,
          productName,
          total: null,
        });
      } catch (error) {
        setSubmitError(error?.message || "Could not submit your enquiry. Please try again.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // COD + UPI: create the order in Supabase (no FormSubmit dependency).
    try {
      const orderItems = isCart
        ? cartItems
        : [{
            productId: productId || productIdFromUrl(productUrl),
            name: productName,
            price: productPrice,
            imageUrl: productImage,
            quantity: 1,
          }];

      if (orderItems.some((item) => !item.productId)) {
        throw new Error("This product is missing its order identifier. Please add it to your bag and retry.");
      }

      const created = await createManualPaymentOrder({
        customer,
        items: orderItems,
        paymentMethod: resolvedPayment === "cod" ? "cod" : "online",
      });

      trackInitiateCheckout({
        value: created.grandTotal,
        itemCount: orderItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0),
        contentIds: orderItems.map((item) => item.productId),
      });

      if (resolvedPayment === "online") {
        onCheckoutSuccess?.();
        onClose();
        navigate(orderPrivateUrl("/pay", created.orderRef, created.accessToken));
        return;
      }

      setConfirmation({
        variant: "cod",
        customerName: customer.name,
        orderRef: created.orderRef,
        trackUrl: orderPrivateUrl("/orders", created.orderRef, created.accessToken),
        productName: isCart
          ? `${cartItems.length} item${cartItems.length === 1 ? "" : "s"} in your bag`
          : productName,
        total: created.grandTotal,
      });
      onCheckoutSuccess?.();
    } catch (error) {
      const message =
        error?.message ||
        error?.error_description ||
        (typeof error === "string" ? error : null) ||
        "Could not place your order. Please try again.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const modalTitle = confirmation
    ? "Order confirmed"
    : isCart
      ? "Checkout"
      : isEnquiry
        ? "Register interest"
        : "Complete your order";

  const submitLabel = submitting
    ? "Placing order…"
    : paymentMethod === "online" && !isEnquiry
      ? "Continue to UPI payment"
      : isCart
        ? "Place order"
        : isEnquiry
          ? "Submit enquiry"
          : "Place order";

  return createPortal(
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          key="order-form-overlay"
          className="fixed inset-0 z-[200] flex sm:items-center sm:justify-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 hidden cursor-default bg-[#130006]/75 backdrop-blur-[2px] sm:block"
            onClick={confirmation ? handleCloseAll : onClose}
            aria-label="Close order form"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-lenis-prevent
            className="relative z-10 flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-[#fbf7f1] max-sm:fixed max-sm:inset-0 sm:h-auto sm:max-h-[min(90dvh,680px)] sm:max-w-md sm:rounded-2xl sm:border sm:border-[#d4af37]/20 sm:shadow-[0_24px_80px_rgba(19,0,6,0.35)]"
            initial={{ y: "100%", opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#d4af37]/15 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:py-3">
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="font-serif text-lg leading-tight text-[#130006] sm:text-xl">
                  {modalTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={confirmation ? handleCloseAll : onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#130006]/10 text-lg leading-none text-[#130006] transition hover:bg-[#130006]/5"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <AnimatePresence mode="wait">
              {confirmation ? (
                <div key="confirmation-wrap" className="flex min-h-0 flex-1 flex-col">
                  <OrderConfirmation
                    variant={confirmation.variant}
                    customerName={confirmation.customerName}
                    orderRef={confirmation.orderRef}
                    trackUrl={confirmation.trackUrl}
                    productName={confirmation.productName}
                    total={confirmation.total}
                    onClose={handleCloseAll}
                  />
                </div>
              ) : (
                <motion.form
                  key="order-form"
                  onSubmit={handleSubmit}
                  className="flex min-h-0 flex-1 flex-col"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-3 [-webkit-overflow-scrolling:touch] sm:space-y-3.5 sm:px-5 sm:py-4">
                    <OrderProductPreview
                      productName={productName}
                      productImage={productImage}
                      productPrice={productPrice}
                      cartItems={isCart ? cartItems : null}
                    />

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

                    {!isEnquiry && (
                      <fieldset className="min-w-0 space-y-2">
                        <legend className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#514347]">
                          Payment method <span className="text-[#6f334a]">*</span>
                        </legend>
                        <div className="grid grid-cols-2 gap-2">
                          {PAYMENT_OPTIONS.map((option) => {
                            const selected = paymentMethod === option.value;
                            return (
                              <label
                                key={option.value}
                                className={`flex min-w-0 cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 transition max-sm:min-h-0 sm:tap-target sm:gap-2.5 sm:rounded-xl sm:px-3 sm:py-2.5 ${
                                  selected
                                    ? "border-[#3d0a21] bg-[#3d0a21]/[0.06] ring-1 ring-[#3d0a21]/15"
                                    : "border-[#130006]/12 bg-white hover:border-[#3d0a21]/25"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="paymentMethod"
                                  value={option.value}
                                  checked={selected}
                                  onChange={() => setPaymentMethod(option.value)}
                                  className="sr-only"
                                />
                                <span className="text-sm leading-none sm:text-base" aria-hidden>
                                  {option.icon}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-[10px] font-semibold leading-snug text-[#130006] sm:text-xs">
                                    {option.label}
                                  </span>
                                  <span className="mt-0.5 hidden text-[10px] leading-snug text-[#847377] sm:block">
                                    {option.hint}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    )}

                    <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                      <label className="flex min-w-0 flex-col gap-1 sm:col-span-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#514347]">
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
                      <label className="flex min-w-0 flex-col gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#514347]">
                          Phone <span className="text-[#6f334a]">*</span>
                        </span>
                        <input
                          className={fieldClass}
                          name="phone"
                          type="tel"
                          required
                          autoComplete="tel"
                          inputMode="numeric"
                          pattern="[0-9]{10}"
                          maxLength={10}
                          title="Enter a 10-digit mobile number without spaces"
                          placeholder="9876543210"
                        />
                      </label>
                      <label className="flex min-w-0 flex-col gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#514347]">
                          Email <span className="text-[#6f334a]">*</span>
                        </span>
                        <input
                          className={fieldClass}
                          name="email"
                          type="email"
                          required
                          autoComplete="email"
                          placeholder="you@email.com"
                        />
                      </label>
                    </div>

                    <label className="flex min-w-0 flex-col gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#514347]">
                        Delivery address <span className="text-[#6f334a]">*</span>
                      </span>
                      <textarea
                        className={`${fieldClass} min-h-[56px] resize-none sm:min-h-[60px]`}
                        name="address"
                        required
                        rows={2}
                        autoComplete="street-address"
                        placeholder="House no., street, area"
                      />
                    </label>

                    <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                      <label className="flex min-w-0 flex-col gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#514347]">
                          City
                        </span>
                        <input
                          className={fieldClass}
                          name="city"
                          autoComplete="address-level2"
                          placeholder="City"
                        />
                      </label>
                      <label className="flex min-w-0 flex-col gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#514347]">
                          PIN code
                        </span>
                        <input
                          className={fieldClass}
                          name="pincode"
                          inputMode="numeric"
                          required
                          pattern="[0-9]{6}"
                          autoComplete="postal-code"
                          placeholder="6-digit PIN"
                        />
                      </label>
                    </div>

                    <label className="flex min-w-0 flex-col gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#514347]">
                        Order notes
                      </span>
                      <input
                        className={fieldClass}
                        name="notes"
                        placeholder="Size, gift wrap, notes…"
                      />
                    </label>

                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#514347]">
                        Location <span className="font-normal normal-case tracking-normal text-[#847377]">(optional)</span>
                      </span>
                      <div className="flex min-w-0 gap-2">
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

                    {submitError && (
                      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] leading-snug text-red-800">
                        {submitError}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 border-t border-[#d4af37]/15 bg-[#fbf7f1] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="tap-target inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[#d4af37]/20 bg-[#2A0718] px-4 text-[11px] font-bold uppercase tracking-[0.1em] text-[#f7ead0] shadow-[0_8px_24px_rgba(42,7,24,0.35)] transition hover:bg-[#3d0a21] disabled:cursor-not-allowed disabled:opacity-60 sm:h-12 sm:text-xs"
                    >
                      <OrderIcon />
                      <span className="truncate">{submitLabel}</span>
                    </button>
                    <p className="mt-1.5 text-center text-[10px] leading-snug text-[#847377]">
                      {paymentMethod === "online" && !isEnquiry
                        ? "Next: scan the UPI QR and upload your payment screenshot."
                        : isEnquiry
                          ? "We’ll email our team about your interest."
                          : "Your order is saved in Velisqa — no email gateway required."}
                    </p>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function OrderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
