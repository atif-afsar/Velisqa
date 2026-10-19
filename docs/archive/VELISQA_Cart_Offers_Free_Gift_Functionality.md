# VELISQA — Cart Offers & Free Gift UI/Functionality

## Objective

Add a premium, conversion-focused promotional system to the VELISQA ecommerce website with two offers:

1. **Shop for ₹999 → Get ₹90 OFF**
   - The existing coupon functionality already handles this offer.
   - Do **not** create a second coupon system.
   - The new UI should promote the offer and guide the customer to the existing coupon flow.

2. **Shop for ₹1,299 → Get a FREE Gift worth ₹400+**
   - This is a cart-value-based free-gift offer.
   - When the eligible cart subtotal reaches ₹1,299 or more, the customer should automatically become eligible for the free gift.
   - The gift should be clearly communicated in the cart and during checkout.
   - The gift must not be accidentally charged to the customer.

The overall experience should match VELISQA's current premium fine-jewellery aesthetic: elegant, minimal, luxurious, white/ivory surfaces, black typography, subtle gold accents, generous spacing, and refined micro-interactions.

---

## Existing Brand/UI Direction

Use the current VELISQA website as the visual reference.

### Current visual language

- Premium fine-jewellery appearance
- White/light backgrounds
- Deep black/dark-maroon typography
- Gold accent color
- Thin borders
- Large clean whitespace
- Elegant serif branding for the VELISQA logo
- Modern sans-serif navigation/body typography
- Rounded cards and subtle shadows
- Avoid loud discount-style ecommerce graphics
- Avoid excessive red, green, badges, emojis, or flashing animations

The promotion should feel like a **luxury shopping benefit**, not a mass-market coupon popup.

---

# 1. Offer Progress Notification

Create a reusable promotional notification component that can appear:

- On the homepage
- On collection/product pages
- Inside the cart drawer
- On the cart page
- Near checkout/cart summary where appropriate

Do not show the same notification repeatedly in an annoying way.

### Recommended desktop UI

Create a slim premium offer bar/card with two offer items:

```text
┌─────────────────────────────────────────────────────────────┐
│  ✦ SHOP ₹999  →  GET ₹90 OFF     │     ✦ SHOP ₹1,299 → FREE GIFT ₹400+ │
└─────────────────────────────────────────────────────────────┘
```

Use subtle gold separators/icons.

### Recommended mobile UI

Convert it into a horizontally scrollable or swipeable offer strip:

```text
✦ Shop ₹999 → Get ₹90 OFF     •     ✦ Shop ₹1,299 → FREE ₹400+ Gift
```

Do not let the component create horizontal page overflow.

---

# 2. Smart Cart Progress Bar

The most important UI should be inside the cart.

Show the customer's current progress toward the next meaningful reward.

## State A — Cart below ₹999

Example cart subtotal:

**₹650**

Display:

```text
You're ₹349 away from ₹999

Shop for ₹999 and unlock ₹90 OFF

[██████████░░░░░░░░░░]
```

Use a CTA such as:

**Continue Shopping**

The ₹90 OFF coupon should remain connected to the existing coupon functionality.

---

## State B — Cart between ₹999 and ₹1,298.99

Example:

**₹1,100**

Display:

```text
₹1,100 in your bag

✓ You're eligible for ₹90 OFF

Just ₹199 more to unlock your FREE ₹400+ gift

[██████████████░░░░░░]
```

This is the most important upsell state.

The UI should make the customer feel:

> "I'm already getting the discount, and I'm very close to the free gift."

CTA:

**Add ₹199 More**

Clicking the CTA can take the user to collections/products, but it should not add an arbitrary product automatically.

---

## State C — Cart ₹1,299 or more

Example:

**₹1,499**

Display:

```text
🎁 Congratulations!

You've unlocked a FREE gift worth ₹400+

Your complimentary gift will be added to your order.

[████████████████████]
```

Use a premium success animation such as:

- subtle sparkle
- smooth progress completion
- small gift icon
- no confetti explosion

The free gift should appear as a separate line item/card in the cart.

---

# 3. Free Gift Cart Item

Once the cart qualifies for ₹1,299:

Add the free gift automatically.

Example:

```text
┌────────────────────────────────────────────┐
│ [Gift Image]                               │
│                                            │
│ Your Complimentary Gift                   │
│ Worth ₹400+                                │
│                                            │
│ ₹0                                         │
│ FREE GIFT                                  │
└────────────────────────────────────────────┘
```

### Important

The gift must have:

- Price displayed as `₹0`
- Original/value reference such as `Worth ₹400+`
- `FREE GIFT` badge
- No quantity editing if the business wants exactly one gift
- No remove button if the gift is mandatory while qualifying
- Automatic removal if the qualifying cart subtotal drops below ₹1,299

If the customer removes products and falls below ₹1,299, show a soft warning:

```text
Your cart is now below ₹1,299.

Your FREE ₹400+ gift has been removed.
Add ₹199 more to unlock it again.
```

Do not surprise the customer.

---

# 4. Gift Selection Architecture

Build the functionality so the actual gift product can be configured without rewriting the cart logic.

Use a configuration concept similar to:

```js
const FREE_GIFT_OFFER = {
  threshold: 1299,
  giftProductId: "CONFIGURE_GIFT_PRODUCT_ID",
  giftVariantId: "CONFIGURE_GIFT_VARIANT_ID",
  displayValue: 400,
  title: "Complimentary Gift",
  enabled: true
};
```

Do not hard-code the actual gift product name into the UI.

The gift product/variant should be easy to replace later.

---

# 5. Cart Calculation Logic

Create one centralized offer-calculation function.

Example:

```js
function calculateCartOffers(cartSubtotal) {
  const offers = {
    couponEligible: cartSubtotal >= 999,
    freeGiftEligible: cartSubtotal >= 1299,
    amountToCoupon: Math.max(0, 999 - cartSubtotal),
    amountToGift: Math.max(0, 1299 - cartSubtotal)
  };

  return offers;
}
```

Do not duplicate this logic across components.

Every component should consume the same offer state.

---

# 6. Define the Eligible Cart Value

Use the site's existing cart pricing architecture.

Recommended rule:

**Offer thresholds should be calculated from the merchandise subtotal before shipping charges.**

Do not count:

- Shipping charges
- Taxes
- Gift value
- The free gift itself

For the ₹999 offer, the existing coupon system remains responsible for determining and applying the actual ₹90 discount.

For the ₹1,299 offer, the free-gift eligibility should be based on the qualifying merchandise subtotal.

If the existing ecommerce backend already has a canonical subtotal/discount eligibility value, reuse it instead of creating a competing calculation.

---

# 7. Existing ₹90 Coupon Integration

There is already coupon functionality.

Therefore:

### DO

- Detect whether the cart has reached ₹999.
- Show the customer that the ₹90 offer is available.
- Provide a clear "Apply ₹90 OFF" or equivalent CTA only if the existing coupon system supports programmatic application.
- Otherwise direct the customer to the existing coupon field/functionality.
- Reuse the existing coupon validation, application, discount calculation, error handling, and state.

### DO NOT

- Create another coupon API.
- Hard-code a discount into the cart total.
- Create a second coupon state.
- Apply ₹90 directly without going through the existing coupon mechanism.
- Show the ₹90 discount as applied when the coupon is only eligible but has not actually been applied.

---

# 8. Promotional Toast / Notification

Add a subtle notification system for important offer milestones.

### When cart reaches ₹999

Show:

```text
✦ You unlocked ₹90 OFF

Your cart qualifies for the ₹90 OFF offer.
```

### When cart reaches ₹1,299

Show:

```text
🎁 You've unlocked a FREE ₹400+ gift!

Your complimentary gift has been added to your bag.
```

### When customer is close to ₹1,299

For example, cart = ₹1,199:

```text
Almost there ✦

Add just ₹100 more to unlock your FREE ₹400+ gift.
```

### Rules

- Do not show the same toast on every cart update.
- Trigger milestone notifications only when crossing a threshold.
- Store a lightweight session/local state if necessary to avoid repetitive notifications.
- Toast should be dismissible.
- Do not block navigation or checkout.
- Respect reduced-motion preferences.

---

# 9. Cart Drawer Design

If VELISQA has a cart/bag drawer, place the offer module near the top of the drawer.

Recommended order:

```text
YOUR BAG

[Offer Progress Card]

--------------------------------

Product 1
Product 2
Product 3

--------------------------------

Complimentary Gift
₹0 | FREE

--------------------------------

Subtotal
₹1,349

[CHECKOUT]
```

The promotional card should remain visible without occupying most of the cart drawer.

---

# 10. Premium Offer Card Design

Create a reusable component:

```text
OfferProgressCard
```

Suggested states:

```text
<OfferProgressCard
  subtotal={cartSubtotal}
  couponEligible={...}
  freeGiftEligible={...}
  amountToGift={...}
/>
```

### Visual behavior

#### Before ₹999

Neutral premium state.

#### ₹999 unlocked

Gold-accent success state.

#### Near ₹1,299

Use a stronger but still elegant gold highlight.

#### ₹1,299 unlocked

Use a subtle celebratory treatment.

Avoid:

- Bright neon colors
- Large flashing text
- Aggressive urgency
- Fake countdown timers
- Excessive animation

---

# 11. Progress Bar

Use a smooth progress bar.

Suggested milestone labels:

```text
₹0                 ₹999                 ₹1,299
│──────────────────│─────────────────────│
                   ₹90 OFF               🎁 FREE GIFT
```

For mobile, simplify:

```text
₹999                    ₹1,299
₹90 OFF                 FREE GIFT 🎁
───────────────●───────────────
```

The bar should animate smoothly when the subtotal changes.

Use `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` where appropriate.

---

# 12. Smart Copy

Use dynamic copy based on cart value.

### ₹0–₹998

```text
You're ₹X away from ₹999.
Unlock ₹90 OFF on your order.
```

### ₹999–₹1,298

```text
✓ ₹90 OFF unlocked

You're only ₹X away from a FREE ₹400+ gift.
```

### ₹1,299+

```text
🎁 FREE GIFT UNLOCKED

Your order qualifies for a complimentary gift worth ₹400+.
```

Do not use misleading language such as:

- "Only today" unless the offer is actually time-limited
- "Last chance"
- "Limited stock" unless inventory is genuinely limited
- "Everyone gets this"

---

# 13. Product Page Mini-Offer

On product pages, add a compact promotional module near the Add to Bag CTA.

Example:

```text
✦ SPECIAL SHOPPING BENEFITS

Shop ₹999  →  Get ₹90 OFF
Shop ₹1,299 →  Get a FREE ₹400+ Gift

[View Bag]
```

If the current product price means the customer is close to a threshold, make the message dynamic.

Example:

```text
Add this to your bag and you're ₹149 away
from unlocking your FREE ₹400+ gift.
```

Do not manipulate the product price or automatically add unrelated products.

---

# 14. Homepage Promotion

Add a premium promotional strip/banner below the hero or in another visually appropriate location.

Suggested layout:

```text
              SHOP MORE, GET MORE

     ₹999+                         ₹1,299+
   ₹90 OFF                    FREE ₹400+ GIFT

         Discover pieces you'll love
```

CTA:

**SHOP COLLECTION**

Keep the section visually consistent with the current VELISQA homepage rather than making it look like a generic sale banner.

---

# 15. Responsive Design

The feature must work on:

- Desktop
- Tablet
- Mobile

### Mobile requirements

- No horizontal page scrolling
- No clipped offer text
- Cart drawer must remain usable
- Progress bar should fit narrow screens
- Toast should not cover checkout buttons
- Gift card should use compact spacing
- Buttons must have comfortable touch targets
- Offer cards should stack when necessary

Recommended mobile layout:

```text
SHOPPING BENEFITS

┌─────────────────────────────┐
│ ✓ ₹90 OFF unlocked          │
│                             │
│ ₹100 more → FREE ₹400+ Gift │
│                             │
│ ███████████████░░░          │
└─────────────────────────────┘
```

---

# 16. Accessibility

Follow WCAG-friendly interaction patterns.

Requirements:

- Semantic buttons
- Keyboard accessible controls
- Visible focus states
- Sufficient contrast
- Screen-reader-friendly offer messages
- `aria-live="polite"` for important cart eligibility changes
- Reduced-motion support
- Do not rely only on color to communicate eligibility

Example:

```html
<div aria-live="polite">
  You're ₹100 away from unlocking your free gift.
</div>
```

---

# 17. Animation

Animations should feel luxurious and subtle.

Recommended:

- 250–400ms progress-bar transition
- Soft fade/slide for toast
- Gentle scale/fade for gift unlock
- Small sparkle effect when the free gift is unlocked

Avoid:

- Continuous pulsing
- Flashing
- Large confetti
- Bouncing product cards
- Auto-playing distracting animations

Respect:

```css
@media (prefers-reduced-motion: reduce) {
  /* Disable non-essential animations */
}
```

---

# 18. Edge Cases

Handle all of the following:

### Customer adds product and crosses ₹1,299

→ Automatically add the configured free gift.

### Customer removes product and falls below ₹1,299

→ Remove the free gift automatically.

### Customer is exactly ₹1,299

→ Eligible.

### Customer is exactly ₹999

→ Eligible for the ₹90 coupon offer.

### Customer is ₹998.99

→ Not eligible for ₹999 offer.

### Customer is ₹1,298.99

→ Not eligible for free gift.

### Customer already has the free gift in cart

→ Do not add a duplicate gift.

### Customer refreshes page

→ Eligibility must be recalculated correctly.

### Customer changes quantity

→ Recalculate offers immediately.

### Customer applies/removes a coupon

→ Recalculate using the site's established pricing/eligibility architecture.

### Checkout

→ Verify the free gift remains correctly associated with the order.

### Gift becomes unavailable

Gracefully handle inventory failure.

Example:

```text
We're sorry — the complimentary gift is currently unavailable.

Your order can still be completed without the gift.
```

Do not charge the customer for an unavailable free gift.

---

# 19. Backend / Commerce Safety

Do not rely only on frontend JavaScript to enforce the free gift.

The final order/cart system should validate:

```text
subtotal >= ₹1,299
        ↓
gift variant is valid
        ↓
gift price = ₹0
        ↓
gift quantity = 1
```

Frontend UI is for the customer experience.

Server/backend/cart platform validation should remain the source of truth for the final order.

If the ecommerce platform supports automatic discounts, automatic cart items, Functions, Scripts, Flow, or equivalent mechanisms, use the platform's native mechanism where appropriate.

---

# 20. Suggested Component Structure

Use reusable components rather than placing everything inside one page.

Suggested structure:

```text
components/
├── offers/
│   ├── OfferAnnouncementBar
│   ├── OfferProgressCard
│   ├── OfferProgressBar
│   ├── OfferToast
│   ├── FreeGiftCard
│   └── OfferSummary
│
├── cart/
│   ├── CartDrawer
│   └── CartItem
│
└── product/
    └── ProductOfferBanner
```

Suggested utility:

```text
utils/
└── cartOffers
```

The offer calculation should live in one place.

---

# 21. Suggested Data Model

Keep offer configuration centralized:

```js
const CART_OFFERS = {
  coupon: {
    threshold: 999,
    discount: 90,
    type: "coupon",
    label: "₹90 OFF"
  },

  freeGift: {
    threshold: 1299,
    value: 400,
    type: "free-gift",
    title: "Complimentary Gift",
    giftProductId: "CONFIGURE_PRODUCT_ID",
    giftVariantId: "CONFIGURE_VARIANT_ID"
  }
};
```

If the project already has a configuration or environment system, use that instead of introducing a new configuration pattern.

---

# 22. Important UX Priority

Do not show both offers with equal visual weight at all times.

The UI should intelligently promote the **next achievable reward**.

Example:

### Cart ₹700

Primary:

```text
₹299 more → ₹90 OFF
```

### Cart ₹1,050

Primary:

```text
₹249 more → FREE ₹400+ GIFT
```

### Cart ₹1,299+

Primary:

```text
🎁 FREE ₹400+ GIFT UNLOCKED
```

This makes the offer system feel personalized and reduces visual clutter.

---

# 23. Final UX Flow

Implement this complete flow:

```text
Customer visits VELISQA
        ↓
Sees premium offer announcement
        ↓
Browses products
        ↓
Adds product to bag
        ↓
Cart calculates subtotal
        ↓
OfferProgressCard updates
        ↓
Customer approaches ₹999
        ↓
Shows remaining amount
        ↓
Customer reaches ₹999
        ↓
₹90 coupon offer becomes eligible
        ↓
Existing coupon functionality handles ₹90 OFF
        ↓
Customer approaches ₹1,299
        ↓
UI says "₹X more to unlock your FREE ₹400+ gift"
        ↓
Customer reaches ₹1,299
        ↓
Free gift is automatically added
        ↓
Gift displays as ₹0 / FREE
        ↓
Customer proceeds to checkout
        ↓
Backend/cart validation confirms gift eligibility
```

---

# 24. Acceptance Criteria

The implementation is complete only when:

- [ ] ₹999 threshold is detected correctly.
- [ ] Existing ₹90 coupon functionality is reused.
- [ ] No duplicate coupon logic is created.
- [ ] ₹1,299 threshold is detected correctly.
- [ ] Free gift is automatically added when eligible.
- [ ] Free gift displays ₹0.
- [ ] Gift cannot accidentally be charged.
- [ ] Gift is removed when the cart drops below ₹1,299.
- [ ] Duplicate gifts cannot be added.
- [ ] Progress messaging updates dynamically.
- [ ] "₹X more" amount is always accurate.
- [ ] Milestone toast does not repeatedly spam the customer.
- [ ] Cart drawer contains the offer progress UI.
- [ ] Cart page contains the offer progress UI.
- [ ] Product pages contain a compact offer message.
- [ ] Homepage contains a premium promotional presentation.
- [ ] Desktop and mobile layouts are polished.
- [ ] No horizontal overflow exists on mobile.
- [ ] Accessibility requirements are implemented.
- [ ] Reduced-motion behavior is supported.
- [ ] Existing checkout functionality is not broken.
- [ ] Existing coupon functionality is not broken.
- [ ] Final gift eligibility is validated by the commerce/backend layer where possible.
- [ ] Gift product/variant can be changed through configuration.
- [ ] No fake urgency or misleading claims are introduced.

---

# 25. Implementation Instruction for the IDE

Before changing code:

1. Inspect the existing VELISQA project structure.
2. Identify the current cart/bag implementation.
3. Identify how cart subtotal is calculated.
4. Identify the existing coupon functionality and reuse it.
5. Identify the ecommerce/backend API used for cart updates.
6. Identify how products/variants are added to the cart.
7. Identify whether the project already has a toast/notification system.
8. Identify the existing design system, typography, spacing, buttons, colors, and reusable components.
9. Implement the offer system using the existing architecture instead of creating duplicate infrastructure.
10. Preserve all current functionality.

### Do not blindly replace existing components.

Modify the current implementation in the smallest maintainable way necessary.

### Before finalizing

Test these cart totals manually:

```text
₹650
₹998
₹999
₹1,000
₹1,198
₹1,199
₹1,298
₹1,299
₹1,300
₹1,499
```

Verify that every UI state and gift transition is correct.

The final result should feel like a native part of the VELISQA luxury ecommerce experience—not a generic promotional widget.
