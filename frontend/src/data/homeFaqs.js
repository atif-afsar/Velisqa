import { COD_FEE } from '../lib/checkoutPricing'
import { RETURN_WINDOW_DAYS } from '../lib/orderReturns'

/**
 * Homepage questions & answers — shown on the page and published as FAQPage JSON-LD
 * (scripts/prerender.mjs). Answers must match how the shop actually works:
 * fees from checkoutPricing.js, the return window from orderReturns.js, delivery
 * estimate from DeliveryEstimate.jsx.
 */
export const HOME_FAQS = [
  [
    'What is Velisqa?',
    'Velisqa is an Indian jewellery brand from Aligarh, Uttar Pradesh. It designs modern fashion jewellery for women — necklaces, earrings, rings, bracelets and bangles — sold online at velisqa.com and delivered across India.',
  ],
  [
    'Is Velisqa jewellery real gold?',
    'No. Velisqa makes fashion (artificial) jewellery in gold-tone and silver-tone finishes, designed to look polished and be worn every day at an accessible price. It does not sell solid gold or real diamonds.',
  ],
  [
    'Is shipping free?',
    `Yes — shipping is free on every prepaid order across India (UPI, cards, net banking or wallets). Cash on delivery is also available for a ₹${COD_FEE} fee plus 2% GST.`,
  ],
  [
    'How long does delivery take?',
    'Most orders arrive within 3–5 days. Every order ships with tracking, and you can follow it any time from My Orders.',
  ],
  [
    'Can I return my order?',
    `Yes. Request a return from My Orders within ${RETURN_WINDOW_DAYS} days of delivery. Approved returns are picked up and refunded to your original payment method.`,
  ],
  [
    'How do I care for my Velisqa jewellery?',
    'Put your jewellery on last — after perfume, lotion and hairspray — and take it off before swimming, bathing or exercise. Wipe it with a soft dry cloth after wear and store each piece in its pouch, away from moisture.',
  ],
]
