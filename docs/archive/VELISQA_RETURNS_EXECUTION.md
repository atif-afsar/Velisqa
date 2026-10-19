# Velisqa Returns & RTO — Execution Plan

## Purpose

Close the gaps in the “Today vs tomorrow” returns matrix:

| Step | Target |
|------|--------|
| Customer clicks **Return** after delivery | Self-serve request in **My orders** + **order tracking** (signed-in) |
| Return status on My orders / tracking | Status timeline + reverse AWB when booked |
| Admin approves return in dashboard | **Admin → Returns** queue |
| NimbusPost reverse pickup from Velisqa | v1: manual reverse AWB + tracking URL; v2: API when NimbusPost confirms contract |
| Auto refund when return complete | Admin **Mark refunded** → `payment_status = refunded` for prepaid UPI; COD handled per policy |
| Cancel before delivery | Already live — unchanged |
| Carrier RTO after failed delivery | Webhook + optional `delivered_at` / event history improvements |
| Reviews after delivery | Already live — unchanged |
| Refund policy page | Already live — link from return UI |

Build in phases so checkout, UPI approval, and forward NimbusPost shipping stay stable.

---

## Definitions

- **Customer return (post-delivery):** Buyer received the parcel, requests reverse pickup within the return window, admin approves, parcel comes back, QC, then refund/restock.
- **Carrier RTO:** Forward shipment never delivered; courier sends parcel back. Driven by NimbusPost webhooks (`shipping_status = rto`). Not the same UI flow as customer returns.
- **Return window:** **5 calendar days** after delivery (configurable constant in SQL + `src/lib/orderReturns.js`).

**Eligibility for self-serve return:**

- Order belongs to signed-in customer (`orders.user_id = auth.uid()`).
- Order is **delivered** (`order_status` or `shipping_status` = `delivered`).
- Within return window (uses `orders.delivered_at` when set, else `updated_at` fallback until webhook backfill).
- No other active return on the order (status not in `rejected`, `cancelled`, `refunded`).
- Guest orders (no `user_id`): no self-serve button — policy + Contact/WhatsApp (documented in UI).

---

## Phase 1 — Database & rules (required first)

**File:** `supabase/order-returns.sql`

- Add `orders.delivered_at timestamptz`.
- Create `order_returns` (status machine, reason, notes, reverse AWB, refund amount, timestamps).
- Create `order_return_items` (full-order return in v1 — all line items).
- RLS: customers read own returns; admins read/update all.
- RPC `submit_order_return(p_order_id, p_reason, p_customer_notes)`.
- RPC helpers for eligibility (used by app).
- Backfill `delivered_at` from existing delivered orders where possible.

**Deploy:** Supabase SQL Editor → run `order-returns.sql` once.

**Webhook follow-up:** Update `nimbuspost-webhook` to set `delivered_at = now()` when status maps to `delivered` (idempotent).

---

## Phase 2 — Customer experience

**Files:**

- `src/lib/orderReturns.js` — constants, labels, fetch/submit wrappers, migration hints.
- `src/Components/Orders/OrderReturnPanel.jsx` — request form + status display.
- `src/Pages/MyOrders.jsx` — panel on delivered orders.
- `src/Pages/OrderTracking.jsx` — panel when viewer owns order (session or token + matching user).

**UX:**

- Delivered + eligible → **Request return** (reason dropdown + optional notes).
- After submit → **Pending approval**.
- Approved → **Reverse pickup scheduled** (show AWB/link when admin enters it).
- **Received → Refunded** messaging when admin completes.

Link to `/refund-cancellation` for policy text.

---

## Phase 3 — Admin returns queue

**Files:**

- `supabase/functions/admin-manage-return/index.ts` — approve, reject, set reverse AWB, mark received, QC pass/fail, mark refunded (+ restock on QC pass).
- `src/lib/orderReturnsAdmin.js` — invoke edge actions.
- `src/Pages/AdminReturns.jsx` — filters: pending, active, completed.
- `src/Components/Admin/AdminShell.jsx` — nav item + badge.
- `src/lib/adminInbox.js` + `AdminHome.jsx` — pending return count in overview.

**Admin actions:**

1. **Approve** — status `approved`.
2. **Reject** — status `rejected` + reason (customer sees it).
3. **Book reverse** — enter NimbusPost reverse AWB + tracking URL (manual until API verified); status `pickup_scheduled`.
4. **Mark received** — status `received` at warehouse.
5. **QC pass** — restore product stock from return line items; status `qc_passed`.
6. **QC fail** — status `qc_failed` (no auto refund).
7. **Mark refunded** — for UPI `paid` → `payment_status = refunded`; set return `refunded`; optional `order_status = returned`.

---

## Phase 4 — NimbusPost reverse API (optional upgrade)

**File:** `supabase/functions/_shared/nimbuspost.ts`

- Add `createReverseShipment(...)` only after NimbusPost documents endpoint, auth, and warehouse IDs for your account.
- Edge function flag: if API fails, admin keeps using manual AWB fields.
- Do **not** block Phase 3 on API availability.

---

## Phase 5 — Carrier RTO hardening

- Extend webhook: set `delivered_at` on deliver; avoid downgrading statuses.
- Optional `shipment_events` table for audit (future).
- Admin orders filter: distinguish **carrier RTO** (`shipping_status = rto`) vs **customer return** (`order_returns` row).

---

## Phase 6 — Verification checklist

### Customer

- [ ] Delivered order within 5 days shows **Request return**.
- [ ] Day 6+ hides request; shows support message.
- [ ] Submit creates pending return; second submit blocked.
- [ ] My orders + tracking show status updates after admin actions.
- [ ] Rejected return shows admin reason.

### Admin

- [ ] Pending badge on Returns nav and overview.
- [ ] Approve → enter reverse AWB → customer sees link.
- [ ] QC pass increases product stock.
- [ ] Mark refunded sets UPI order to **refunded**.

### Regression

- [ ] UPI approve + ship still works.
- [ ] Pre-delivery cancel unchanged.
- [ ] Reviews still require delivered purchase.

---

## Implementation progress

| Phase | Status | Notes |
|-------|--------|--------|
| 1 — SQL | Code complete | Run `supabase/order-returns.sql` |
| 2 — Customer UI | Code complete | My orders + tracking (signed-in) |
| 3 — Admin queue | Code complete | `/admin/returns` + `admin-manage-return` |
| 4 — Reverse API | Planned | Manual AWB in admin UI |
| 5 — RTO webhook | Code complete | `delivered_at` on deliver webhook |
| 6 — QA | Planned | Checklist above |

---

## Environment & deploy

After code changes:

```powershell
npx supabase functions deploy admin-manage-return
npx supabase functions deploy nimbuspost-webhook
```

SQL: run `supabase/order-returns.sql` in dashboard.

No new public secrets required for manual reverse AWB workflow.
