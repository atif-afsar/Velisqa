import { RETURN_WINDOW_DAYS } from '../lib/orderReturns'

const SHIPPING = [
  'Is delivery free?',
  `Shipping is free on all prepaid orders across India, and most orders arrive within 3–5 days with tracking. You can return a piece within ${RETURN_WINDOW_DAYS} days of delivery from My Orders.`,
]

/**
 * Buying questions per category, shown on each category page and published as FAQPage
 * JSON-LD. Sizing answers mirror SIZE_GUIDES in lib/productPolicies.js.
 */
export const CATEGORY_FAQS = {
  necklaces: [
    [
      'Which necklace length should I choose?',
      'A 40–45 cm chain sits at the collarbone; 50–55 cm falls just below it and layers well with a shorter chain. The length of each piece is given in its description where available.',
    ],
    [
      'Can I wear a Velisqa necklace every day?',
      'Yes — the pieces are designed for everyday wear. Put your necklace on after perfume and lotion, take it off before bathing or exercise, and store it in its pouch to keep the finish bright.',
    ],
    SHIPPING,
  ],
  earrings: [
    [
      'Are Velisqa earrings for pierced ears?',
      'Yes. Velisqa earrings are designed for standard pierced ears. Drop length is noted in the product description where relevant.',
    ],
    [
      'Which earrings are best for everyday wear?',
      'Studs and small hoops are the easiest to wear every day; drops and statement earrings work best for evenings and occasions.',
    ],
    SHIPPING,
  ],
  rings: [
    [
      'How do I find my ring size?',
      'Wrap a thin strip of paper around the base of your finger, mark where it overlaps and measure the length in millimetres — that is your finger circumference. Measure at the end of the day and allow for your knuckle.',
    ],
    [
      'Can I stack Velisqa rings?',
      'Yes. Slim solitaire and band styles are designed to be worn alone or stacked together on one or more fingers.',
    ],
    SHIPPING,
  ],
  bracelets: [
    [
      'How do I choose a bracelet size?',
      'Measure your wrist just below the wrist bone with a soft tape and add 1–2 cm for a comfortable fit. Adjustable pieces note their extension chain in the description.',
    ],
    [
      'Can I wear bracelets together?',
      'Yes. Fine chains and tennis-style bracelets are designed to stack, and pair well with a bangle or watch.',
    ],
    SHIPPING,
  ],
  bangles: [
    [
      'How do I choose a bangle size?',
      'Bring your thumb and little finger together and measure around the widest part of your hand — that is the circumference a bangle must pass over. Open and crossover bangles flex slightly for an easier fit.',
    ],
    [
      'Are Velisqa bangles suitable for festive wear?',
      'Yes. Sculpted gold-tone bangles and kadas work for everyday outfits and festive or wedding looks alike, alone or stacked.',
    ],
    SHIPPING,
  ],
}
