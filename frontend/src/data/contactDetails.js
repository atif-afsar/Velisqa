import {
  CONTACT_EMAIL,
  INSTAGRAM_URL,
  SITE_URL,
  WHATSAPP_PHONE,
} from "../Components/SEO/siteConfig";
import { createWhatsAppLink, buildWhatsAppMessage } from "../Components/WhatsApp/whatsapp";

export const SALON_ADDRESS_LINES = [
  "Palladium Mall, Level 2",
  "Senapati Bapat Marg",
  "Lower Parel, Mumbai — 400 013",
];

export const SALON_HOURS = "Mon – Sat, 11am – 8pm";
export const SALON_NOTE = "By appointment only";
export const BRAND_ORIGIN = "Aligarh, Uttar Pradesh, India";
export const AREA_SERVED = "India-wide";
export const PAYMENT_METHODS = "Cash on delivery (Aligarh), UPI, bank transfer, and online payment";
export const LANGUAGES = "English, Hindi";

export const SOCIAL_LINKS = [
  {
    id: "instagram",
    label: "Instagram",
    handle: "@velisqa.in",
    href: INSTAGRAM_URL,
  },
  {
    id: "facebook",
    label: "Facebook",
    handle: "Velisqa Jewellery",
    href: "https://facebook.com",
  },
  {
    id: "pinterest",
    label: "Pinterest",
    handle: "Velisqa",
    href: "https://pinterest.com",
  },
];

export const CONTACT_CHANNELS = [
  {
    id: "whatsapp",
    label: "WhatsApp Concierge",
    value: WHATSAPP_PHONE,
    href: createWhatsAppLink(buildWhatsAppMessage({ intent: "consult" })),
    description:
      "Fastest way to order, check stock, confirm pricing, and get styling help. Available for pan-India buyers.",
    external: true,
  },
  {
    id: "email",
    label: "Email",
    value: CONTACT_EMAIL,
    href: `mailto:${CONTACT_EMAIL}`,
    description: "For order support, privacy requests, and detailed product questions.",
    external: false,
  },
  {
    id: "website",
    label: "Website",
    value: "www.velisqa.com",
    href: SITE_URL,
    description: "Browse collections, product details, and place enquiries online.",
    external: false,
  },
  {
    id: "order",
    label: "Order Page",
    value: "Order on WhatsApp",
    href: "/order",
    description: "Dedicated page to start a WhatsApp order or private consultation.",
    internal: true,
  },
];

export const CONTACT_PAGE = {
  path: "/contact",
  title: "Contact Us",
  eyebrow: "Concierge & Salon",
  description:
    "Reach the Velisqa team for orders, salon appointments, delivery updates, returns, and styling assistance across India.",
  updated: "July 2026",
};
