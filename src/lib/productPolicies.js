import { RETURN_WINDOW_DAYS } from './orderReturns'

/** Product-page policy copy. Keep in step with checkout (fees) and the returns system. */
export const PRODUCT_POLICY_SECTIONS = [
  {
    id: 'shipping',
    title: 'Shipping & returns',
    items: [
      'Free shipping on all prepaid orders across India. Cash on delivery is available for a ₹50 handling fee.',
      'Every order ships with tracking — follow it any time from My Orders.',
      `Changed your mind? Request a return from My Orders within ${RETURN_WINDOW_DAYS} days of delivery. Approved returns are picked up and refunded to your original payment method.`,
      'Please record an unboxing video — it helps us resolve any transit damage quickly.',
    ],
  },
  {
    id: 'care',
    title: 'Materials & care',
    items: [
      'Store each piece in the pouch provided, away from moisture and direct sunlight.',
      'Put jewellery on last — after perfume, lotion and hairspray — and take it off before swimming, bathing or exercise.',
      'Wipe gently with a soft, dry cloth after wear to keep the finish and stones bright.',
    ],
  },
]

/** Measuring guidance by category (no fabricated size charts — products are single-size unless stated). */
export const SIZE_GUIDES = {
  Rings: [
    'Wrap a thin strip of paper around the base of your finger, mark where it overlaps and measure the length in millimetres — that is your finger circumference.',
    'Measure at the end of the day, when fingers are slightly larger, and allow for your knuckle.',
    'Unsure? Message us on WhatsApp with your measurement and we will help you choose.',
  ],
  Bracelet: [
    'Measure your wrist just below the wrist bone with a soft tape and add 1–2 cm for a comfortable fit.',
    'Adjustable pieces note their extension chain in the description.',
  ],
  Bangles: [
    'Bring your thumb and little finger together and measure around the widest part of your hand — this is the circumference a bangle must pass over.',
    'Open and crossover bangles flex slightly for an easier fit.',
  ],
  Necklace: [
    'A 40–45 cm chain sits at the collarbone; 50–55 cm falls just below it and layers well with shorter chains.',
    'The chain length for each piece is given in the description where available.',
  ],
  Earrings: ['Earrings are designed for standard pierced ears. Drop length is noted in the description where relevant.'],
}
