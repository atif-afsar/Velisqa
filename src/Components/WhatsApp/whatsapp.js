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

export function buildWhatsAppMessage({ productName, productUrl, intent = "inquiry" } = {}) {
  let message = "Hello VELISQA, I'm interested in this jewellery piece. Please assist me with pricing and delivery.";

  if (intent === "consult") {
    message = "Hello VELISQA, I'd like to book a private consultation. Please assist me with scheduling and pricing.";
  }

  if (productName) {
    message = `Hello VELISQA, I'm interested in ${productName}. Please assist me with pricing and delivery.`;
  }

  if (productUrl) {
    message += `\n\n${productUrl}`;
  }

  return message;
}
