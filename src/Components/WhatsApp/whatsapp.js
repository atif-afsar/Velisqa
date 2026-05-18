export const WHATSAPP_NUMBER = "919336072590";

export function createWhatsAppLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
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
