# Velisqa — test cases

Every feature, what is checked, and where the automated test lives. Last full run: **19 Oct 2026 — all automated cases passed**
(backend 7 unit + 85 integration, browser 33).

| Layer | Command | Runs against | Count |
|---|---|---|---|
| API unit | `cd backend && npm test` | pure functions | 7 |
| API integration | `cd backend && npm run test:integration` | real Express app + temporary MongoDB replica set | 85 |
| Browser (E2E) | `cd e2e && npm test` | real storefront + API + temporary MongoDB (`backend/scripts/e2e-server.mjs`) | 33 |
| Razorpay live (optional) | `cd backend && npm run check:razorpay` | Razorpay **test** API with your `rzp_test_` keys | 7 checks |
| Manual | this document, section M | staging/production | 10 |

No automated test touches your real database or real money. In the API and browser suites only the outside
providers are replaced: Razorpay's Orders API, NimbusPost's courier API and Meta. Signature checks, stock,
pricing and payment state changes all run for real. The Razorpay popup is replaced by a stand-in that signs
the payment with the test secret, in the same way Razorpay does.

---

## 1. Storefront browsing — `e2e/tests/storefront.spec.js`

| ID | Case | Expected |
|---|---|---|
| SF-01 | Open home page | Hero shows; products come from the API; no page errors, no Supabase calls |
| SF-02 | Open `/collections` | All in-stock products listed with price and MRP |
| SF-03 | Open `/collections/rings` | Only rings |
| SF-04 | Search "Celeste", then nonsense | Matching product only; empty state for nonsense |
| SF-05 | Product page → Add to bag | Name, price, discount shown; item appears in bag |
| SF-06 | Sold-out product | "Sold out"; cannot be added |
| SF-07 | Wishlist save / view / remove | Saved item appears on `/wishlist`, removal clears it |
| SF-08 | Unknown URL and info pages | 404 page "This page has moved on"; About/FAQ/Contact/Shipping/Refund/Privacy/Terms render without errors |

API side (`backend/tests/integration/catalog.test.js`): newest-first listing, detail and batch lookup, server-side search, category filter, sort, field projection.

## 2. Bag, pricing and Cash-on-Delivery — `e2e/tests/checkout.spec.js`

| ID | Case | Expected |
|---|---|---|
| CO-01 | Bag: +1, −1, remove | Summary ₹498 → ₹249 → "Your bag is empty" |
| CO-02 | COD order | Total = price + ₹50 + 2%; confirmation page shows order ref; stock −1 |
| CO-03 | Coupons | Unknown and inactive codes refused with a message; `E2E10` gives 10% (whole-rupee rounding); COD fee on discounted subtotal |
| CO-04 | Private tracking + cancel | Tracking link works; customer cancels → status cancelled, stock restored; wrong token shows nothing |
| CO-05 | Last unit | Can be bought once; product then shows sold out (page revalidates, no stale stock) |
| CO-06 | Free gift | Progress bar below ₹1,299; gift chooser at ₹1,299 |
| CO-07 | Missing details | No order is created |

API side (`checkout.test.js`, `orders.test.js`): client prices ignored; coupon min-subtotal; gift rules (₹1,299 threshold, gift ≤ ₹400, one gift); stock on aggregated quantities; **20 concurrent buyers of the last unit → exactly one succeeds**; idempotency key; signed-in orders linked to the account; order history; cancellation rules (no cancel after dispatch); admin cancel restores stock and is audited.

## 3. Razorpay online payment — `e2e/tests/razorpay.spec.js`

| ID | Case | Expected |
|---|---|---|
| RZ-01 | Pay successfully | Popup gets key `rzp_test_…`, server amount in paise, INR; signature verified; order **paid**; stock −1 once; confirmation says "Order Successfully Placed" |
| RZ-02 | Close popup, pay later from `/pay/<ref>` link | Order saved as awaiting payment, stock untouched; retry pays it; stock −1 |
| RZ-03 | Forged signature | Never marked paid; stock untouched; page says **"Payment not confirmed yet"** with a "Complete payment" link (not a success screen) |
| RZ-04 | Webhook only (shopper never returns) | Bad webhook signature → 400; valid `payment.captured` → paid; replay → ignored as duplicate; stock −1 once |
| RZ-05 | Pay link after payment | Paid orders cannot be charged again |

API side (`payments.test.js`): provider order reused on retry; COD and paid orders refused; a valid signature for another order cannot pay this one; webhook-then-verify-then-replay = one paid transition and one stock decrement; amount mismatch not paid; `payment.failed` keeps the order payable; `refund.processed` records one refund; admin approve/reject of manual payments (second approve 409, reject needs reason); Meta Purchase event only for paid orders, once.

Live check (`npm run check:razorpay`, needs your keys in `backend/.env`): keys present · test-mode key (live keys refused) · ₹1 test order created on Razorpay · checkout signature accepted · forged signature rejected · webhook signature accepted · forged webhook rejected.

## 4. Customer accounts — `e2e/tests/account.spec.js`

| ID | Case | Expected |
|---|---|---|
| AC-01 | Sign up → sign in → reload → sign out | Session survives reload; sign-out ends it |
| AC-02 | Wrong password / duplicate sign-up | Refused with a message |
| AC-03 | Order while signed in | Appears in My Orders |
| AC-04 | Customer tries admin | Admin API 403; admin login refused |
| AC-05 | Forgot password | Same message whether or not the account exists; fake reset link refused |

API side (`auth.test.js`): register/login/logout/session; role cannot be chosen at sign-up; imported Supabase bcrypt passwords work and are upgraded; reset rotates password and ends sessions; **every admin route returns 401 to guests and 403 to customers**; CSRF token and allowed Origin required; Mongo operator injection rejected; CORS allow-list; Google sign-in: friendly message when not configured, forged callback rejected, open redirects blocked.

## 5. Admin console — `e2e/tests/admin.spec.js`

| ID | Case | Expected |
|---|---|---|
| AD-01 | All 10 admin pages, desktop and phone | No blank pages, errors or sideways scroll; store header/footer hidden; phone menu opens and closes |
| AD-02 | Dashboard date ranges | Today / 7 days / 30 days / This month reload the summary; new orders counted |
| AD-03 | Products | Add without image is blocked; edit price → storefront shows new price; delete → gone from storefront |
| AD-04 | Bulk CSV import | Valid row published, bad row reported |
| AD-05 | Coupons | Create → works at checkout → switch off → refused |
| AD-06 | Homepage banners | Upload 2, rotation 3 s, publish → homepage shows them and rotates; built-in banners never load |
| AD-07 | Full order lifecycle | Ship via NimbusPost (AWB shown) → courier webhook "delivered" → customer reviews (pending) → admin approves → review public, rating count updates → customer requests return → admin approves |

API side (`admin.test.js`, `shipping.test.js`, `returns.test.js`, `reviews.test.js`, `siteTools.test.js`): product CRUD; coupon create/duplicate/toggle/delete; order and payment lists beyond 50 rows with exact counts; soft delete; inbox counts; live new-order event stream (SSE); dashboard summary and invalid ranges; analytics; signed uploads by role; **concurrent ship clicks book one shipment**; unpaid/cancelled orders cannot ship; cancel shipped order cancels on NimbusPost (RTO); reset stuck AWB keeps history; courier webhook secret enforced, statuses only move forward, delivered never regresses; returns: 5-day window, one request, approve → reverse AWB → received → QC (stock once) → refunded, reject needs reason; reviews: verified delivered buyers only, once, pending until approved, reports hide; image uploads deduplicated and type-sniffed; hero banner validation and rotation interval (2–60 s); bulk import; AI drafting reports missing key.

## 6. Data and operations — `backend/tests/integration/migration.test.js`, `dataTransfer.test.js`

| ID | Case | Expected |
|---|---|---|
| OPS-01 | Supabase export → Mongo import | Dry run writes nothing; ids, references and money preserved; second run is a no-op; reconciliation report; old order links and passwords keep working |
| OPS-02 | `data:export` → empty DB → `data:import` | Products, coupons, banners restored; self-hosted image links point to the new server; Cloudinary links untouched; dates stay dates; re-import never overwrites edits unless `--overwrite` |

---

## M. Manual checks (need real keys or a real server)

Run these on staging before going live. Use **test** keys only until the go-live sign-off.

| ID | Case | Steps | Expected |
|---|---|---|---|
| M-01 | Razorpay test payment, card | Online checkout, card `4111 1111 1111 1111`, any future expiry, any CVV, OTP from the test page | Order paid in admin → Payments; stock −1 |
| M-02 | Razorpay test payment, UPI | UPI `success@razorpay` | Paid |
| M-03 | Razorpay failure | UPI `failure@razorpay` | Order stays unpaid; "Complete payment" works later |
| M-04 | Razorpay webhook | Dashboard → Webhooks → `https://api.<domain>/api/v1/webhooks/razorpay`, events `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`; close the tab right after paying | Order still becomes paid |
| M-05 | Google sign-in | After adding `GOOGLE_CLIENT_ID/SECRET` | Sign in returns to the same page, signed in |
| M-06 | Password reset email | After SMTP is configured | Email arrives; link sets a new password once |
| M-07 | NimbusPost real booking | Ship one test order (cancel it right after) | AWB in admin; cancel succeeds |
| M-08 | NimbusPost tracking webhook | Point NimbusPost webhook at `/api/v1/webhooks/nimbuspost` with `X-Webhook-Secret` | Status updates appear on the tracking page |
| M-09 | Phone check | Real Android + iPhone: browse, bag, checkout, admin menu | Usable, no sideways scroll |
| M-10 | Deploy smoke | `GET /api/v1/health/ready` on the VPS; Vercel build with `VITE_API_BASE_URL` | `ok` with transactions; build prerenders all products |
