# Velisqa — UI Fix List (no functionality removed)

Ground rule for every item below: Velisqa stays a **full e-commerce site**.
Nothing here removes a feature, a page, or a flow — everything is either a
visual/layout fix, a copy fix, or swapping a native browser dialog for an
in-app equivalent that does the exact same job. If an item would need a
product decision that changes behavior, it's called out explicitly.

Priority key: 🔴 Fix first (actively confuses/costs conversions) ·
🟠 Fix soon · 🟡 Nice to have

---

## 1. Checkout & buying

### 1.1 🔴 Give checkout a real, non-dismissable "page" feel
Keep `OrderFormModal` exactly as it is functionally (same fields, same
submit logic, same COD/UPI choice) but:
- On desktop, the current centered modal is fine.
- On mobile, it already goes full-screen (`max-sm:fixed max-sm:inset-0`)
  — good. Just make sure tapping the dimmed backdrop on desktop can't
  silently discard a half-filled form: add a lightweight "Discard your
  order details?" confirmation only when at least one field has been
  typed into, not on every close.
- Optional, additive: also mount the same `OrderFormModal` content at a
  real `/checkout` URL (e.g. render it inline on a `Checkout` page instead
  of only as a portal) so the back button and page refresh behave like a
  real step instead of quietly closing a popup. This is purely
  presentational — reuse the same component and submit logic.

### 1.2 🔴 "Buy Now" icon fixed — double check it shipped
The button used the WhatsApp phone icon even though it opens the on-site
order form. Already swapped for a shopping-bag icon in
`src/Components/WhatsApp/BuyNowButton.jsx` — just confirm this file made it
into the deployed build; the file is genuinely misleading if this change
gets lost in a merge.

### 1.3 🟠 Add a lightweight step indicator inside the checkout form
Right now the checkout modal is one long scroll: contact info → address →
payment method → submit. Add a plain 3-dot or 3-label progress strip at the
top of the form ("Details → Payment → Confirm") purely as a visual anchor —
no actual multi-step logic needed, the form can still submit everything at
once. Helps users on mobile feel like they know how much is left.

### 1.4 🟠 Payment method cards need a clearer selected state
`PAYMENT_OPTIONS` render as two cards (UPI QR / COD) — the "hint" sub-text
is hidden below `sm:` breakpoint (`hidden ... sm:block` in
`OrderFormModal.jsx`), so on mobile the user only sees an emoji and a label,
no explanation of what happens next. Show a one-line hint on mobile too
(e.g. shrink the font instead of hiding it entirely) so people aren't
guessing what "UPI QR payment" actually involves before they tap it.

### 1.5 🟡 "Next: scan the UPI QR…" helper text is easy to miss
The line under the submit button in `OrderFormModal.jsx`
(`paymentMethod === 'online' && !isEnquiry ? "Next: scan the UPI QR..."`)
is small, gray, and below the button — the least-noticed spot on the
screen for the single most important expectation-setting sentence in the
whole flow (that this isn't an instant card payment). Move this line
**above** the submit button, or bold the first few words.

---

## 2. Sign-in

### 2.1 🟠 Unify the look of the two sign-in forms
`src/Pages/Login.jsx` (full page) and `src/Components/Auth/SignInForm.jsx`
(inside the modal) currently have slightly different copy and layout since
they're two separate implementations (see bug 1.2 in the bugs file). Once
that's merged into one shared component, the visual result is that
sign-in looks identical whether it's reached via `/login` or via the
"sign in required" popup — right now a user could notice they look/behave
slightly differently and wonder if something's wrong.

### 2.2 🟡 Replace `alert()` styling, not just the mechanism
Once the `alert()` calls in `SignInForm.jsx` and `AdminLogin.jsx` are
swapped for inline messages (bug fix, see bugs file 1.3), style them
consistently with the pattern already used in `Login.jsx`: red-bordered box
for errors, green-bordered box for success notices. Keep the same wording,
just move it into the page instead of a browser popup.

---

## 3. Cart page

### 3.1 🟠 Stock-issue banner and "request out-of-stock pieces" link is buried
`Cart.jsx` shows stock issues in an amber box with a link to `/order` — but
it's positioned above the item list rather than next to the specific line
that's the problem. Move the specific stock warning to render directly
under the affected item (it's already computed per-line as `lineIssue`,
just not visually connected to the general banner) so users don't have to
match up which item has the issue.

### 3.2 🟡 Empty cart state is very sparse
"Your cart is empty" + one button is fine functionally, but for a jewellery
brand this is a good spot for 3–4 small product thumbnails ("You might
like...") using data you already have via `CatalogContext`. Purely additive
— doesn't change any existing cart logic.

### 3.3 🟡 "Only X left" and quantity stepper crowd each other on small screens
In `Cart.jsx`, the stock warning, "Only N left" text, quantity stepper, and
"Remove" button all sit in one `flex-wrap` row per item. On narrow phones
this wraps awkwardly. Give the stepper + remove button their own row below
the price/stock text on small screens (`flex-col sm:flex-row` instead of
`flex-wrap`).

---

## 4. Product page

### 4.1 🟡 Desktop "Add to bag" button is hidden on mobile, relies only on sticky bar
`ProductPurchasePanel.jsx` has `className="... hidden ... lg:flex"` on the
main Add to Bag button, relying entirely on `ProductStickyBar` for mobile.
Not a bug, but worth confirming the sticky bar always matches the same
quantity selected above it — if a user changes quantity in the panel body
and then taps "Add to bag" in the sticky bar, verify both reference the
same `quantity` state (check `ProductStickyBar.jsx` isn't holding its own
separate copy).

### 4.2 🟡 Wishlist heart icon and "Buy now" are visually equal weight
On the product page, "Wishlist" and "Buy now" sit in the same 2-column grid
with equal visual weight (`grid-cols-2 gap-2.5`). For a purchase-focused
page, "Buy now" should be the visually dominant action. Keep both buttons
and both actions exactly as they are — just make "Buy now" wider (e.g.
`grid-cols-[1fr_1.5fr]`) or give it the stronger fill color it already has
even more contrast against the wishlist outline button.

---

## 5. Admin panel

### 5.1 🟠 Native `confirm()` dialogs across Admin Orders / Payments / Dashboard
Once these are swapped for real code fixes (see bugs file 1.3), give them
one shared, reusable `<ConfirmDialog>` component (title, body text, confirm/
cancel buttons) instead of writing a bespoke inline confirmation UI in each
page. This keeps every "are you sure?" moment (delete product, cancel
order, approve payment, reset shipment) visually consistent instead of
each admin action looking like a slightly different one-off.

### 5.2 🟡 "Ready to ship" / "In transit" / "Delivered" filter tabs have no counts
`AdminOrders.jsx` FILTERS render as plain tab labels. `adminInbox.js`
already computes `needsShipment`, `awaitingUpi`, `inTransit` counts for the
dashboard summary — surface those same numbers as small badges on the
Admin Orders tabs too, so an admin can see "Ready to ship (6)" without
switching tabs to count manually.

### 5.3 🟡 Payment proof review has no image zoom
`AdminPayments.jsx` shows the uploaded screenshot for review — confirm
there's a way to view it full-size / zoomed before approving, since typos
in UTR numbers or blurry amounts are easy to miss in a small thumbnail.
Purely additive (a "view full size" link/lightbox), no existing behavior
changes.

---

## 6. Order tracking (customer-facing)

### 6.1 🟡 Timeline steps don't visually distinguish "active" from "complete"
`buildTrackingTimeline()` in `orderTracking.js` already returns `complete`
and `active` flags per step — just confirm the rendered timeline component
gives them genuinely different visual treatment (filled circle + color for
complete, pulsing/outlined for active, greyed for upcoming) rather than
all steps looking the same weight. This is pure styling on top of data
that already exists.

### 6.2 🟡 "Auto-refresh every 25s" copy could show a visible countdown
Small trust-building touch: instead of only stating the refresh interval in
text, show a subtle countdown ring/progress bar next to "Refresh status" so
users can see the page is actually live, not stalled.

---

## 7. General / cross-cutting

### 7.1 🟠 Accessibility pass on icon-only and color-only signals
Spot-check: stock badges, payment-status colors, and the new/old NimbusPost
courier badges appear to rely on color alone (amber/red/green) in a few
places. Add a short text label alongside color everywhere it's used for
meaning (most already do — e.g. "Only 3 left" — just verify every instance,
including the Admin dashboard's shipment status chips).

### 7.2 🟡 Loading skeletons exist on Product/Home but check Collections & Wishlist
`ProductDetailSkeleton` in `ProductDetail.jsx` is nicely done. Confirm
`Collections.jsx` and `Wishlist.jsx` show an equivalent skeleton/placeholder
while their data loads, rather than a blank flash, for visual consistency
across the site.

### 7.3 🟢 Toasts (cart/wishlist) — confirm stacking behavior
`CartContext` and `WishlistContext` each manage a single `toast` at a time.
If a user rapid-fires "add to cart" on multiple products, confirm the toast
replaces cleanly rather than flickering. If it already replaces cleanly,
no change needed — just worth a manual click-through check.

---

## Suggested order to tackle these
1. 1.2 (confirm Buy Now icon fix shipped) — zero effort, just verify.
2. 1.5 and 1.4 (payment method clarity) — small copy/CSS changes, high
   impact on trust during the one payment step that already feels risky.
3. 5.1 (shared ConfirmDialog) — do this alongside the bug-list alert/confirm
   sweep so it's one pass, not two.
4. 3.1 (stock warning placement) and 1.3 (step indicator) — medium effort,
   noticeable improvement to the actual checkout feel.
5. Everything else — batch as general polish once the above are live.
