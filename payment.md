# PRD: Manual QR Payment + Delivery Partner + Ad Pixel Tracking

**Product:** Velisqa (React + Supabase e-commerce)
**Author:** Atif Afsar
**Status:** Draft — for Cursor implementation
**Context:** Instamojo application is under review. This is a temporary manual payment flow to keep selling while waiting for gateway approval. Delivery is fulfilled via NimbusPost. Once built, Meta Ads + Meta Pixel will drive traffic to this flow, so tracking must be wired in from day one.

---

## 1. Problem Statement

Velisqa currently has no working automated payment gateway (Razorpay/Cashfree rejected due to jewellery category misclassification, Instamojo pending approval). We need a way to accept payments **today** using a static UPI QR code, verify payment manually via screenshot review, and only then trigger delivery via NimbusPost. This entire flow must be trackable by Meta Pixel so ad spend can be measured (add-to-cart, initiate checkout, purchase events).

---

## 2. Goals

1. Let a customer complete an order using UPI QR + screenshot upload, with zero third-party payment gateway dependency.
2. Give admin a simple, fast approval screen to confirm real payments and reject fake/wrong ones.
3. Automatically create a NimbusPost shipment the moment admin approves a payment.
4. Fire Meta Pixel events at every key step so ad campaigns can optimize for real purchases.
5. Keep the whole thing swappable — when Instamojo is approved, this manual step should be easy to remove/replace without touching the rest of the codebase.

## 3. Non-Goals

- Building a permanent payment gateway integration (that's a separate future PRD).
- Auto-verifying payment authenticity via OCR/bank API (out of scope for v1 — admin does it manually).
- Refund automation.

---

## 4. User Roles

| Role | Access |
|---|---|
| Customer | Checkout, QR payment, screenshot upload, order tracking |
| Admin (Atif) | Approve/reject payments, view screenshots, trigger shipment |

---

## 5. Order Status Lifecycle

```
awaiting_payment → payment_submitted → paid → shipped → delivered
                                      → rejected (loops back to awaiting_payment)
```

Add a `payment_status` enum column separate from `shipping_status` so both can be tracked independently:
- `payment_status`: `awaiting_payment | payment_submitted | paid | rejected`
- `shipping_status`: `not_shipped | shipped | out_for_delivery | delivered | rto`

---

## 6. Database Schema Changes (Supabase)

### `orders` table — add/confirm these columns
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | existing |
| order_number | text | short human-readable ID shown to user, e.g. `VLQ1042` |
| customer_name | text | |
| phone | text | |
| address | jsonb | line1, line2, city, state, pincode |
| items | jsonb | product id, name, qty, price |
| amount | numeric | total payable |
| payment_status | text | default `awaiting_payment` |
| payment_screenshot_url | text | nullable, set on upload |
| payment_utr | text | nullable, optional field for user to type UTR/txn ID |
| shipping_status | text | default `not_shipped` |
| awb_number | text | nullable |
| courier_name | text | nullable |
| rejection_reason | text | nullable |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-update trigger |

### `payment_review_logs` table (new, optional but recommended)
Tracks admin actions for accountability.
| Column | Type |
|---|---|
| id | uuid |
| order_id | uuid (FK → orders) |
| action | text (`approved` / `rejected`) |
| admin_note | text |
| reviewed_at | timestamptz |

### Supabase Storage
- Create bucket `payment-screenshots` (private, not public) — admin-only read access via signed URL.

---

## 7. Pages & Components to Build

### 7.1 Checkout Page (`/checkout`)
- Existing address form stays as-is.
- On submit → create order row with `payment_status: awaiting_payment` → redirect to `/pay/[order_number]`.
- **Fire Meta Pixel `InitiateCheckout` event** here with order value.

### 7.2 Payment Page (`/pay/[order_number]`)
- Fetch order by `order_number`.
- Show:
  - Static UPI QR image (your business UPI ID)
  - Amount to pay (large, clear)
  - Order number (tell user to add it in UPI app "remarks" field)
  - Optional input: "Enter UTR / Transaction ID" (helps admin match faster)
  - File upload input for screenshot (image only, max 5MB)
  - "Submit Payment Proof" button
- On submit:
  - Upload image to Supabase Storage `payment-screenshots/{order_number}.jpg`
  - Update order: `payment_status: payment_submitted`, save `payment_screenshot_url`, `payment_utr`
  - Redirect to `/order-confirmation/[order_number]`
  - **Fire Meta Pixel custom event `PaymentProofSubmitted`**

### 7.3 Order Confirmation Page (`/order-confirmation/[order_number]`)
- Simple message: "We've received your payment proof. Your order will be confirmed within a few hours."
- Show order summary + current status badge.

### 7.4 Order Tracking Page (`/orders/[order_number]` or under user account)
- Shows a status stepper: Payment submitted → Confirmed → Shipped → Out for delivery → Delivered
- If `awb_number` exists, show "Track Shipment" button linking to NimbusPost tracking or your own tracking view.
- If `payment_status: rejected`, show reason + re-upload option.

### 7.5 Admin Review Panel (`/admin/payments`, protected route)
- Table of orders where `payment_status = payment_submitted`, sorted oldest first.
- Each row expandable to show:
  - Screenshot (full view/zoom)
  - Amount expected vs UTR entered
  - Order details
  - Approve / Reject buttons
- On **Approve**:
  - Set `payment_status: paid`
  - Call NimbusPost "create shipment" API (server-side function)
  - Save `awb_number`, `courier_name`, set `shipping_status: shipped`
  - Insert row in `payment_review_logs`
  - **Fire Meta Pixel `Purchase` event server-side via Conversions API** (see Section 9)
- On **Reject**:
  - Set `payment_status: rejected`, save `rejection_reason` (dropdown: "Amount mismatch", "Screenshot unclear", "No payment found", custom text)
  - Insert row in `payment_review_logs`
  - Send WhatsApp/email notification to customer (can be manual link-click for v1, e.g. `wa.me` prefilled message)

---

## 8. Backend / API Endpoints (Supabase Edge Functions)

| Endpoint | Purpose |
|---|---|
| `POST /create-order` | Creates order row, returns `order_number` |
| `POST /submit-payment-proof` | Handles screenshot upload + order update |
| `POST /admin/approve-payment` | Approves order, triggers NimbusPost shipment creation, fires server-side Purchase event |
| `POST /admin/reject-payment` | Rejects order with reason |
| `POST /nimbuspost-webhook` | Receives shipment status updates from NimbusPost, updates `shipping_status` |

All admin endpoints must check `auth.role = admin` before executing — do not trust frontend-only route protection.

---

## 9. Meta Pixel + Ads Tracking Integration

Since ads will point to this flow, tracking must cover both **browser-side Pixel** and **server-side Conversions API** (server-side is important because payment approval happens later, in the admin panel — not at the moment the user is on the page).

### 9.1 Events to fire

| Event | Where | Trigger | Method |
|---|---|---|---|
| `PageView` | All pages | On load | Pixel (browser) |
| `ViewContent` | Product page | On product view | Pixel (browser) |
| `AddToCart` | Product page | On "Add to Bag" | Pixel (browser) |
| `InitiateCheckout` | Checkout page | On order creation | Pixel (browser) |
| `PaymentProofSubmitted` (custom) | Payment page | On screenshot submit | Pixel (browser) |
| `Purchase` | Admin approval action | On admin "Approve" click | **Conversions API (server-side)** — most reliable, since real payment confirmation happens here, not client-side |

### 9.2 Why server-side Purchase event matters
The customer submits a screenshot, but the **actual confirmed sale** only happens when admin approves — potentially hours later, on a different device (your admin panel), with the customer's browser long closed. A browser Pixel event can't fire at that point. So the `Purchase` event must be sent via **Meta Conversions API** directly from your `admin/approve-payment` backend function, including:
- `event_name: Purchase`
- `value`, `currency: INR`
- Hashed customer email/phone (for match quality)
- `order_number` as `event_id` (deduplication key if you ever add a browser-side Purchase event too)

### 9.3 Implementation checklist
- Add Meta Pixel base code to root layout (fires `PageView` automatically).
- Add Pixel events at each browser-side trigger point listed above.
- Store Meta Pixel ID and Conversions API access token in environment variables — never hardcode.
- Test using Meta Events Manager "Test Events" tool before going live with ads.

---

## 10. NimbusPost Integration (recap, triggered from Section 7.5)

- Call happens only after admin approval, never before.
- Send: buyer name, address, phone, pincode, item details, `payment_mode: prepaid` (since money is already collected manually), order value.
- Store returned `awb_number` and `courier_name`.
- Set up `/nimbuspost-webhook` to auto-update `shipping_status` as parcel moves.

---

## 11. Acceptance Criteria

- [ ] Customer can complete checkout → see QR → upload screenshot → see "pending confirmation" screen
- [ ] Order does not get shipped until admin explicitly approves
- [ ] Admin can view all pending screenshots and approve/reject in under 30 seconds per order
- [ ] Approved orders automatically get a NimbusPost AWB number, no manual shipment creation needed
- [ ] Rejected orders show reason to customer and allow re-upload
- [ ] Meta Pixel fires `InitiateCheckout` and `PaymentProofSubmitted` correctly (verify in Meta Events Manager)
- [ ] `Purchase` event fires server-side on admin approval with correct value and currency
- [ ] All admin routes are protected and inaccessible to normal users

## 12. Future Removal Plan (once Instamojo is approved)

- Keep the QR/screenshot logic isolated in its own components/functions (`PaymentQR.jsx`, `submit-payment-proof` function) so it can be swapped for Instamojo checkout without touching order schema, NimbusPost integration, or Pixel tracking logic.
- `payment_status` values stay the same; only the way `paid` gets set changes (Instamojo webhook instead of admin approval).