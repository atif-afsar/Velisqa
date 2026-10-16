# Velisqa redesign — deploy notes, image slots, test checklist

## Deploy in this order

1. **Database** — run `supabase/migrations/20261016_consolidated_checkout.sql` once in the Supabase SQL editor (safe to re-run).
   It fixes three security holes (public coupon writes, self-promotion to admin, direct order inserts) and makes the
   server charge exactly what checkout shows (COD fee + GST, free gift at ₹0, guest checkout).
2. **Edge functions** — redeploy `create-razorpay-order`, `verify-razorpay-payment`, `razorpay-webhook`,
   `nimbuspost-webhook` (`supabase functions deploy <name>`); they now use `_shared/security.ts`.
3. **Frontend** — deploy to Vercel as usual. `npm run build` = image pipeline + Vite build + prerender.
   Build needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (already set) to prerender product pages.

If the frontend goes live before step 1, guest shoppers are asked to sign in at checkout (handled gracefully).

## Image slots

Originals live in `media/`. Replace a file with the same name and the next build regenerates AVIF + WebP at
480–2400 px. Product photos stay on Cloudinary (resized/converted automatically).

| Slot (file in `media/`) | Used on | Ratio / minimum size | Shot brief |
|---|---|---|---|
| `campaign-hero-c.jpg` | Homepage hero (full-bleed) | 2:3 portrait, ≥ 2400×3600 | Model, neutral grey studio, soft key light, statement earrings + fine necklace; face centred, darker tones on the left for the headline |
| `editorial-story.jpg` | Homepage "Our story", hero card | 4:5 or square, ≥ 2000×2000 | Profile portrait, drop earrings, plain backdrop |
| `editorial-necklace.jpg` | Homepage reviews/#WearVelisqa block | 4:5, ≥ 1600×2000 | Close crop of a necklace worn on dark clothing |
| `about-hero.jpg` | About — wide banner | 2:1, ≥ 2400×1200 | Flat-lay of pieces on marble/linen, lots of negative space |
| `about-story.jpg`, `about-mission.jpg` | About sections | 4:5, ≥ 1600×2000 | Product detail / studio-desk still life |
| `founder-sameer-shameem.jpg`, `founder-atif-afsar.jpg` | Founders, About, homepage | 4:5, ≥ 1200×1500 | Supplied portraits |
| `campaign-hero-b.jpg` | Spare (not in use) | 2:3 | — |
| `public/og/velisqa-og.jpg` | Social share card | 1200×630 | Campaign crop with the product visible |
| Category tiles (Cloudinary) | Homepage, menus | square packshot on white, ≥ 1200 px | Single piece centred on pure white |

Placeholder credits (Unsplash Licence): Apostolos Vamvouras (hero), Juan Manuel Merino (`campaign-hero-b`),
Etty Fidele (`editorial-story`), Cat Han (`editorial-necklace`). Replace with your own shoot when ready.

## Still to decide (business owner)

- Legal pages (Refund, Shipping) still describe WhatsApp ordering and defect-only refunds, while the site offers
  5-day returns from My Orders. Update the policy text to match what you offer.
- Organization schema lists a Mumbai (Palladium Mall) store with opening hours — keep only if accurate.
- No warranty policy exists, so none is advertised.
- The ₹90-off-at-₹999 offer is switched off (`src/lib/cartOffers.js`) because nothing ever applied it.
- 76 products had admin-entered "mock" review counts; storefront now shows real reviews only.
