import { SITE_URL } from "../SEO/siteConfig";

export const WHATSAPP_NUMBER = "919336072590";

export function createWhatsAppLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function buildOrderWhatsAppMessage({
  productName,
  productUrl,
  name,
  phone,
  email,
  address,
  city,
  pincode,
  locationLabel,
  locationMapsUrl,
  notes,
  enquiryType = "order",
} = {}) {
  const isEnquiry = enquiryType === "enquiry";

  const lines = [
    isEnquiry
      ? "✨ *Velisqa — Sold out / register interest*"
      : "🛍️ *New Velisqa Order*",
    "",
    isEnquiry
      ? "*This piece is marked sold out or made to order online — please advise on waitlist, restock, or bespoke options. Delivery is not same-day; timelines to be confirmed.*"
      : null,
    "",
    `*Product:* ${productName || "Not specified"}`,
    productUrl ? `*Page:* ${productUrl}` : null,
    "",
    "*Customer details*",
    `Name: ${name}`,
    `Phone: ${phone}`,
    email ? `Email: ${email}` : null,
    "",
    "*Delivery address*",
    address,
    city ? `City: ${city}` : null,
    pincode ? `PIN: ${pincode}` : null,
    "",
    locationMapsUrl
      ? `*Live location:* ${locationLabel || "Shared via GPS"}\n${locationMapsUrl}`
      : locationLabel
        ? `*Location note:* ${locationLabel}`
        : null,
    notes ? `\n*Notes:* ${notes}` : null,
    "",
    isEnquiry
      ? "Please confirm next steps, lead time, and delivery — thank you!"
      : "Please confirm availability, price, and delivery timeline. Thank you!",
  ].filter(Boolean);

  return lines.join("\n");
}

function formatInrLine(amount) {
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

export function buildCartOrderWhatsAppMessage({
  cartItems = [],
  stockWarnings = [],
  name,
  phone,
  email,
  address,
  city,
  pincode,
  locationLabel,
  locationMapsUrl,
  notes,
} = {}) {
  const orderTime = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });

  let productsSubtotal = 0;
  let totalPieces = 0;

  const itemLines = cartItems.map((item, index) => {
    const unit = Number(item.price) || 0;
    const qty = Number(item.quantity) || 0;
    const lineTotal = unit * qty;
    productsSubtotal += lineTotal;
    totalPieces += qty;

    const url =
      item.productUrl ||
      (item.productId ? `${SITE_URL}/product/${item.productId}` : null);

    return [
      `${index + 1}. *${item.name}*`,
      `   Qty: ${qty} × ${formatInrLine(unit)} = *${formatInrLine(lineTotal)}*`,
      url ? `   Link: ${url}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  });

  const lines = [
    "🛍️ *VELISQA — CART ORDER (Website)*",
    `🕐 ${orderTime}`,
    "",
    "📦 *FOR DELIVERY / DISPATCH*",
    "Multi-item cart order — pack all items below and deliver to the address in this message.",
    "",
    "━━━━━━━━━━━━━━━━",
    "*ORDER SUMMARY*",
    `Products: ${cartItems.length} · Total pieces: ${totalPieces}`,
    "━━━━━━━━━━━━━━━━",
    "",
    ...itemLines,
    "",
    "━━━━━━━━━━━━━━━━",
    `*PRODUCTS SUBTOTAL:* *${formatInrLine(productsSubtotal)}*`,
    `*GRAND TOTAL (all items):* *${formatInrLine(productsSubtotal)}*`,
    "_Delivery charges (if any) to be confirmed by Velisqa._",
    "",
    "📋 *PACKING CHECKLIST*",
    ...cartItems.map((item) => `☐ ${item.name} × ${item.quantity}`),
    "",
    stockWarnings.length > 0 ? "⚠ *Stock notes (verify before dispatch)*" : null,
    ...stockWarnings.map((w) => `• ${w}`),
    stockWarnings.length > 0 ? "" : null,
    "🚚 *DELIVER TO*",
    `*Customer:* ${name}`,
    `*Phone:* ${phone}`,
    email ? `*Email:* ${email}` : null,
    "",
    `*Address:*\n${address}`,
    [city, pincode].filter(Boolean).length
      ? `*City / PIN:* ${[city, pincode].filter(Boolean).join(" · ")}`
      : null,
    "",
    locationMapsUrl
      ? `*GPS / Maps:* ${locationLabel || "Customer shared location"}\n${locationMapsUrl}`
      : locationLabel
        ? `*Location note:* ${locationLabel}`
        : null,
    notes ? `\n*Customer notes:* ${notes}` : null,
    "",
    "Please confirm stock, final bill, and delivery time. Thank you!",
  ];

  return lines.filter((line) => line !== null).join("\n");
}

export function buildWhatsAppMessage({ productName, productUrl, intent = "inquiry" } = {}) {
  let message = "Hello VELISQA, I'm interested in this jewellery piece. Please assist me with pricing and delivery.";

  if (intent === "consult") {
    message = "Hello VELISQA, I'd like to book a private consultation. Please assist me with scheduling and pricing.";
  }

  if (intent === "enquiry" && productName) {
    message = `Hello VELISQA, I have a query about ${productName} (sold out / made to order). Please advise on availability, pricing, and delivery.`;
  } else if (productName) {
    message = `Hello VELISQA, I have a query about ${productName}. Please assist me with pricing and delivery.`;
  }

  if (productUrl) {
    message += `\n\n${productUrl}`;
  }

  return message;
}
