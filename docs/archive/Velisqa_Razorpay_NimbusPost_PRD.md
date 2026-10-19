# Velisqa E-commerce Payment & Fulfillment PRD

**Product:** Velisqa E-commerce Platform\
**Version:** 1.0\
**Date:** 8 August 2026\
**Status:** Proposed\
**Payment Gateway:** Razorpay Standard Checkout\
**Shipping Partner:** NimbusPost\
**Database:** Supabase / PostgreSQL

------------------------------------------------------------------------

## 1. Executive Summary

Velisqa currently uses a manual UPI QR payment and
screenshot-verification workflow. With Razorpay now approved, the
payment architecture should be replaced with a production-grade
e-commerce payment flow.

The new system will:

-   Accept online payments through Razorpay Checkout.
-   Keep the Razorpay secret key strictly on the backend.
-   Create a Razorpay Order before opening checkout.
-   Verify the Razorpay payment signature server-side.
-   Use Razorpay webhooks as the authoritative payment event mechanism.
-   Automatically move successfully paid orders into fulfillment.
-   Create shipments through NimbusPost after payment is confirmed.
-   Support both prepaid and Cash on Delivery (COD).
-   Store Razorpay and NimbusPost identifiers in the Velisqa database.
-   Provide administrators with complete payment, order, shipment,
    refund, and exception visibility.
-   Make payment and shipment operations idempotent so retries cannot
    create duplicate orders, payments, or shipments.

The core architectural principle is:

> **Velisqa owns the business order state. Razorpay owns payment events.
> NimbusPost owns shipment/tracking events. Velisqa synchronizes all
> three into one customer-facing order lifecycle.**

------------------------------------------------------------------------

# 2. Goals

## 2.1 Primary Goals

1.  Replace manual UPI screenshot verification with Razorpay.
2.  Provide a familiar, secure checkout experience.
3.  Automatically confirm prepaid orders after verified payment.
4.  Automatically create NimbusPost shipments after an order becomes
    eligible for fulfillment.
5.  Support COD without requiring a payment gateway transaction.
6.  Track payment, fulfillment, shipment, delivery, cancellation,
    refund, and RTO states.
7.  Prevent duplicate payment processing and duplicate shipment
    creation.
8.  Give admins a single order-management interface.
9.  Give customers a reliable order confirmation and tracking
    experience.
10. Preserve auditability for all important financial and fulfillment
    actions.

## 2.2 Secondary Goals

-   Reduce manual admin work.
-   Reduce payment-related customer support.
-   Reduce shipping-entry mistakes.
-   Make the system ready for scale.
-   Make future payment methods and courier providers easier to add.

------------------------------------------------------------------------

# 3. Non-Goals

The first version will not include:

-   Marketplace/split payments.
-   Subscription billing.
-   International payments unless separately enabled and approved.
-   Multiple payment gateways simultaneously.
-   Complex warehouse management.
-   Automated accounting/ERP reconciliation.
-   AI-based fraud scoring.
-   Multi-warehouse inventory allocation.

These can be added later.

------------------------------------------------------------------------

# 4. High-Level Architecture

``` text
                         ┌─────────────────────┐
                         │      CUSTOMER       │
                         │   Velisqa Website   │
                         └──────────┬──────────┘
                                    │
                           Checkout / Razorpay
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Velisqa Backend   │
                         │   Secure API Layer  │
                         └──────┬────────┬─────┘
                                │        │
                     ┌──────────┘        └──────────┐
                     ▼                              ▼
             ┌───────────────┐              ┌───────────────┐
             │    Razorpay   │              │    Supabase   │
             │    Gateway    │              │  PostgreSQL   │
             └───────┬───────┘              └───────┬───────┘
                     │                              │
              Webhooks / APIs                       │
                     │                              │
                     └──────────────┬───────────────┘
                                    ▼
                         ┌─────────────────────┐
                         │  Fulfillment Layer  │
                         │  Velisqa Backend    │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │     NimbusPost      │
                         │ Shipping / AWB /    │
                         │ Tracking / NDR / RTO │
                         └─────────────────────┘
```

------------------------------------------------------------------------

# 5. Source of Truth

There should be **one Velisqa order record**, but no single external
service should be treated as the source of truth for every state.

## 5.1 Velisqa

Velisqa is the source of truth for:

-   Order lifecycle
-   Customer
-   Cart snapshot
-   Product snapshot
-   Amounts
-   Shipping address
-   Payment method
-   Fulfillment eligibility
-   Shipment association
-   Cancellation/refund business state

## 5.2 Razorpay

Razorpay is the source of truth for:

-   Payment transaction
-   Payment authorization
-   Payment capture
-   Payment failure
-   Refund transaction
-   Payment identifiers

## 5.3 NimbusPost

NimbusPost is the source of truth for:

-   Shipment
-   AWB
-   Courier assignment
-   Pickup
-   In-transit status
-   Out-for-delivery status
-   Delivered status
-   NDR
-   RTO

Velisqa receives and stores these events so the customer and admin
dashboards can show the current status.

------------------------------------------------------------------------

# 6. Order State Model

The order lifecycle should be separated from payment and shipment state.

## 6.1 Order Status

Recommended states:

``` text
placed
   ↓
confirmed
   ↓
packed
   ↓
shipped
   ↓
out_for_delivery
   ↓
delivered
```

Alternative terminal/exception states:

``` text
cancelled
rto_initiated
rto_received
```

### Meaning

  Status             Meaning
  ------------------ --------------------------------------------------
  placed             Order has been created
  confirmed          Order is accepted and eligible for fulfillment
  packed             Package has been packed
  shipped            Shipment has been handed to courier / AWB active
  out_for_delivery   Courier is attempting final delivery
  delivered          Customer received the order
  cancelled          Order was cancelled
  rto_initiated      Shipment is returning to Velisqa
  rto_received       Returned package received

------------------------------------------------------------------------

# 7. Payment State Model

Recommended payment states:

``` text
pending
   ↓
processing
   ↓
paid
```

Failure/exception states:

``` text
failed
cancelled
refunded
partially_refunded
```

For COD:

``` text
pending
   ↓
cod_confirmed
   ↓
paid
```

The exact final COD settlement state should be kept separate from
Razorpay payment states because the customer does not pay Velisqa
through Razorpay for COD.

------------------------------------------------------------------------

# 8. Shipment State Model

Recommended internal shipment states:

``` text
not_created
   ↓
creation_pending
   ↓
created
   ↓
pickup_scheduled
   ↓
picked_up
   ↓
in_transit
   ↓
out_for_delivery
   ↓
delivered
```

Exception states:

``` text
creation_failed
cancelled
ndr
rto
```

NimbusPost's actual event/status names should be mapped into these
internal Velisqa states.

------------------------------------------------------------------------

# 9. Online Payment Flow --- Razorpay

## Step 1: Customer Checkout

Customer enters:

-   Full name
-   Mobile number
-   Email
-   Shipping address
-   State
-   City
-   Pincode
-   Product/cart items
-   Coupon/discount if applicable
-   Payment method

Customer selects:

**Online Payment**

The frontend sends the checkout request to the Velisqa backend.

The frontend must NOT directly create a Razorpay order using the secret
key.

------------------------------------------------------------------------

# 10. Step 2: Create Velisqa Order

The backend validates:

-   Cart contents
-   Product availability
-   Product prices
-   Coupon validity
-   Shipping charge
-   Tax, if applicable
-   Final payable amount
-   Customer information
-   Address
-   Payment method

The backend calculates the final amount itself.

Never trust the final amount sent by the browser.

The backend creates the Velisqa order first.

Example:

``` text
Velisqa Order
-------------
order_id: UUID
order_ref: VEL-2026-000123
payment_method: online
payment_status: pending
order_status: placed
total_amount: ₹1,499
```

The database should also reserve or validate inventory according to the
inventory strategy.

------------------------------------------------------------------------

# 11. Step 3: Create Razorpay Order

After the Velisqa order is created, the backend calls Razorpay Orders
API.

The amount must be sent in paise.

Example:

``` text
₹1,499
=
149900 paise
```

Razorpay returns:

``` text
razorpay_order_id
```

Velisqa stores it against the order.

Example:

``` text
Velisqa Order
-------------
order_ref: VEL-2026-000123
razorpay_order_id: order_xxxxxxxxx
payment_status: pending
```

The Razorpay Key ID can be sent to the frontend.

The Razorpay Key Secret must remain only on the backend.

------------------------------------------------------------------------

# 12. Step 4: Open Razorpay Checkout

Frontend opens Razorpay Standard Checkout using:

-   Razorpay Key ID
-   Razorpay Order ID
-   Amount
-   Currency
-   Customer name
-   Customer email
-   Customer phone
-   Velisqa branding

Customer can complete payment using the payment methods enabled in the
Razorpay account, such as UPI, cards, net banking, and other eligible
methods.

The exact methods available depend on Razorpay configuration and account
eligibility.

------------------------------------------------------------------------

# 13. Step 5: Customer Completes Payment

On successful checkout, Razorpay returns:

``` text
razorpay_payment_id
razorpay_order_id
razorpay_signature
```

The frontend must send these values to the Velisqa backend.

Important:

The frontend response is NOT trusted as proof of payment.

------------------------------------------------------------------------

# 14. Step 6: Server-Side Signature Verification

The backend verifies:

``` text
HMAC_SHA256(
    razorpay_order_id_from_server
    + "|"
    + razorpay_payment_id,
    RAZORPAY_KEY_SECRET
)
```

The generated signature must match the Razorpay signature.

The backend should retrieve the expected Razorpay order ID from the
Velisqa database instead of trusting an order ID supplied by the
browser.

If verification fails:

``` text
payment_status = failed
```

Do not:

-   Confirm the order
-   Create shipment
-   Mark the order paid
-   Release goods

------------------------------------------------------------------------

# 15. Step 7: Razorpay Webhook

A Razorpay webhook must be configured on the backend.

Recommended events include:

-   `payment.captured`
-   `payment.failed`
-   `order.paid`
-   Refund-related events
-   Dispute-related events where applicable

The webhook signature must be verified using the Razorpay webhook
secret.

Webhook processing must be idempotent.

Store the Razorpay event ID so the same webhook cannot be processed
twice.

------------------------------------------------------------------------

# 16. Step 8: Payment Captured

For production e-commerce, use automatic capture unless there is a
specific business reason to manually capture payments.

When Razorpay confirms the payment as captured:

``` text
payment_status = paid
```

Then:

``` text
order_status = confirmed
```

At this point the order becomes eligible for fulfillment.

Important:

An `authorized` payment should not be treated as final settlement. The
order should be fulfilled only after the payment reaches the required
captured state.

------------------------------------------------------------------------

# 17. Step 9: Create NimbusPost Shipment

Once:

``` text
payment_status = paid
AND
order_status = confirmed
```

the backend creates the shipment through NimbusPost.

The shipment request should contain:

-   Velisqa order reference
-   Customer name
-   Customer phone
-   Shipping address
-   Pincode
-   Product/item details
-   Quantity
-   Package value
-   Package weight
-   Package dimensions
-   Payment type
-   COD amount when applicable

For prepaid:

``` text
payment_type = prepaid
cod_amount = 0
```

For COD:

``` text
payment_type = cod
cod_amount = order_total
```

NimbusPost supports API integration through seller-panel API credentials
and provides shipment/tracking workflows for connected stores.

------------------------------------------------------------------------

# 18. Step 10: NimbusPost Returns Shipment Details

NimbusPost should return shipment information such as:

-   Shipment/order identifier
-   AWB
-   Courier partner
-   Label information
-   Tracking information

Velisqa stores these values.

Example:

``` text
shipment_status = created
awb = XXXXXXXXXX
courier = Courier Name
```

Then:

``` text
order_status = shipped
```

depending on the exact NimbusPost event/creation semantics.

Do not assume that "shipment API request accepted" always means the
parcel has physically been picked up.

------------------------------------------------------------------------

# 19. Step 11: Shipping Updates

NimbusPost tracking updates should be synchronized back to Velisqa.

Example:

``` text
created
→ pickup_scheduled
→ picked_up
→ in_transit
→ out_for_delivery
→ delivered
```

Customer tracking page:

``` text
Order Confirmed ✓
Packed ✓
Shipped ✓
Out for Delivery ✓
Delivered ✓
```

------------------------------------------------------------------------

# 20. Step 12: Delivery

When NimbusPost confirms delivery:

``` text
shipment_status = delivered
order_status = delivered
```

For prepaid orders:

``` text
payment_status = paid
```

For COD orders:

The order should be considered financially settled only after the COD
collection/remittance process is confirmed according to Velisqa's
operational policy.

------------------------------------------------------------------------

# 21. COD Flow

COD remains independent of Razorpay.

## COD Checkout

Customer selects:

**Cash on Delivery**

Backend creates:

``` text
payment_method = cod
payment_status = pending
order_status = placed
```

The order can then go through a COD confirmation layer.

Recommended:

``` text
placed
  ↓
cod_verification
  ↓
confirmed
```

Verification can be:

-   Automated rules
-   OTP confirmation
-   Admin confirmation
-   Phone/WhatsApp confirmation
-   Risk-based verification

The exact mechanism can be implemented later.

------------------------------------------------------------------------

# 22. COD Shipment

After COD confirmation:

``` text
order_status = confirmed
```

Then Velisqa creates a NimbusPost COD shipment.

The COD amount must equal the amount the courier is instructed to
collect.

Example:

``` text
Order value: ₹1,499
COD collection: ₹1,499
```

If shipping charges are included in the customer payable amount, they
must be reflected consistently in the COD amount.

------------------------------------------------------------------------

# 23. COD Delivery

Customer receives the package and pays the courier.

NimbusPost records the delivery.

Velisqa:

``` text
order_status = delivered
```

But:

``` text
payment_status
```

should not automatically mean bank settlement merely because delivery
occurred.

Recommended COD financial lifecycle:

``` text
pending
→ collected
→ remittance_pending
→ paid
```

This gives Velisqa visibility into the difference between:

-   Order delivered
-   Cash collected
-   Cash remitted
-   Cash received by Velisqa

------------------------------------------------------------------------

# 24. Recommended Database Design

The current `orders` table should remain the central business record.

However, payment and shipment data should be separated into dedicated
tables rather than putting every external field into `orders`.

## 24.1 orders

Recommended fields:

``` text
id
order_ref
user_id / customer_id
customer_name
customer_email
customer_phone

subtotal
discount_amount
shipping_amount
tax_amount
total_amount
currency

payment_method
payment_status

order_status

shipping_address
billing_address

coupon_code

created_at
updated_at
confirmed_at
packed_at
shipped_at
delivered_at
cancelled_at
```

------------------------------------------------------------------------

# 25. order_items

``` text
id
order_id
product_id
product_name
sku
quantity
unit_price
discount
total_price
product_snapshot
created_at
```

The product snapshot is important because the product price/name can
change after the order is placed.

------------------------------------------------------------------------

# 26. payments

Create a dedicated `payments` table.

Recommended fields:

``` text
id
order_id

provider
provider_order_id
provider_payment_id

amount
currency

status

method
email
contact

signature_verified

captured_at
failed_at

failure_code
failure_description

raw_reference / metadata

created_at
updated_at
```

For Razorpay:

``` text
provider = razorpay
provider_order_id = order_xxx
provider_payment_id = pay_xxx
```

Never store the Razorpay Key Secret in this table.

------------------------------------------------------------------------

# 27. payment_events

Store webhook/event history.

Recommended fields:

``` text
id
provider
event_id
event_type
payment_id
order_id
payload
signature_verified
processed
processed_at
created_at
```

`event_id` should have a unique constraint.

This prevents duplicate webhook processing.

------------------------------------------------------------------------

# 28. refunds

Recommended fields:

``` text
id
order_id
payment_id

provider
provider_refund_id

amount
status
reason

initiated_at
processed_at

metadata
created_at
updated_at
```

------------------------------------------------------------------------

# 29. shipments

Create a dedicated shipment table.

Recommended fields:

``` text
id
order_id

provider
provider_order_id
awb
courier_name

shipment_status

cod_amount
shipping_charge

label_url
tracking_url

pickup_at
shipped_at
delivered_at

rto_at

last_tracking_event
last_tracking_at

created_at
updated_at
```

For NimbusPost:

``` text
provider = nimbuspost
```

------------------------------------------------------------------------

# 30. shipment_events

Recommended fields:

``` text
id
shipment_id
provider
event_id
event_type
status
location
description
payload
event_time
created_at
```

Use a unique external event ID whenever NimbusPost provides one.

------------------------------------------------------------------------

# 31. order_status_history

Every important status transition should be auditable.

Recommended fields:

``` text
id
order_id

old_status
new_status

changed_by
source
reason

metadata

created_at
```

Example:

``` text
placed → confirmed
source = razorpay_webhook
reason = payment_captured
```

Another:

``` text
confirmed → shipped
source = nimbuspost
reason = shipment_created
```

------------------------------------------------------------------------

# 32. Payment API Design

Recommended backend endpoints:

``` text
POST /api/checkout/create-order
```

Creates the Velisqa order and Razorpay order.

------------------------------------------------------------------------

``` text
POST /api/payments/razorpay/verify
```

Receives the browser checkout response and verifies the signature.

------------------------------------------------------------------------

``` text
POST /api/webhooks/razorpay
```

Receives Razorpay webhooks.

------------------------------------------------------------------------

``` text
GET /api/orders/:orderRef
```

Returns customer-safe order information.

------------------------------------------------------------------------

``` text
POST /api/orders/:orderId/cancel
```

Handles cancellation when allowed.

------------------------------------------------------------------------

``` text
POST /api/orders/:orderId/refund
```

Admin-only refund initiation.

------------------------------------------------------------------------

# 33. Shipping API Design

Recommended:

``` text
POST /api/shipments/create
```

Creates a NimbusPost shipment.

------------------------------------------------------------------------

``` text
POST /api/webhooks/nimbuspost
```

Receives shipping/tracking updates if supported by the NimbusPost
integration.

------------------------------------------------------------------------

``` text
GET /api/orders/:orderRef/tracking
```

Returns customer-safe tracking information.

------------------------------------------------------------------------

``` text
POST /api/shipments/:shipmentId/retry
```

Admin-only retry when shipment creation fails.

------------------------------------------------------------------------

# 34. Checkout API Contract

Frontend sends:

``` json
{
  "items": [
    {
      "productId": "uuid",
      "quantity": 2
    }
  ],
  "customer": {
    "name": "Customer Name",
    "email": "customer@example.com",
    "phone": "+91XXXXXXXXXX"
  },
  "shippingAddress": {
    "addressLine1": "Address",
    "city": "Aligarh",
    "state": "Uttar Pradesh",
    "pincode": "202001"
  },
  "paymentMethod": "online"
}
```

The backend calculates the final amount.

The frontend does not decide:

``` text
total_amount
shipping_amount
discount_amount
tax_amount
```

------------------------------------------------------------------------

# 35. Checkout Response

Backend returns only what the frontend needs:

``` json
{
  "orderRef": "VEL-2026-000123",
  "razorpayOrderId": "order_xxxxxxxxx",
  "razorpayKeyId": "rzp_live_xxxxxxxxx",
  "amount": 149900,
  "currency": "INR"
}
```

Never return:

``` text
RAZORPAY_KEY_SECRET
```

------------------------------------------------------------------------

# 36. Security Requirements

## Critical

The following are mandatory:

-   Razorpay Key Secret only on backend.
-   NimbusPost credentials only on backend.
-   Webhook secrets only on backend.
-   HTTPS in production.
-   Server-side amount calculation.
-   Server-side Razorpay signature verification.
-   Razorpay webhook signature verification.
-   Idempotent payment processing.
-   Idempotent shipment creation.
-   Authorization for admin APIs.
-   Customer access limited to their own order information.
-   Never trust payment success from frontend alone.
-   Never expose raw secrets in logs.
-   Never store card numbers, CVV, OTPs, or other sensitive payment
    credentials.

------------------------------------------------------------------------

# 37. Idempotency

This is one of the most important production requirements.

## Payment

If the customer clicks Pay twice or Razorpay retries an event:

``` text
DO NOT create two Velisqa payments.
DO NOT mark the order paid twice.
```

Use unique constraints on:

``` text
provider_payment_id
provider_order_id
webhook_event_id
```

where appropriate.

------------------------------------------------------------------------

# 38. Shipment Idempotency

If the backend receives:

``` text
payment.captured
```

twice, it must not create two NimbusPost shipments.

Before creating a shipment:

``` text
Does shipment already exist for this order?
```

If yes:

``` text
return existing shipment
```

If no:

``` text
create shipment
```

Use a unique constraint such as:

``` text
one active shipment per order
```

unless multi-package shipping is intentionally supported later.

------------------------------------------------------------------------

# 39. Payment Failure Flow

If Razorpay payment fails:

``` text
payment_status = failed
order_status = placed
```

Customer can retry payment.

The same Velisqa order can be associated with another payment attempt
where appropriate.

Do not create a shipment.

Do not confirm fulfillment based on a failed payment.

------------------------------------------------------------------------

# 40. Customer Closes Payment Window

If customer closes Razorpay Checkout:

``` text
order remains pending
```

Customer should see:

``` text
Payment not completed.
You can retry payment.
```

Do not automatically mark the order as cancelled immediately.

A cleanup process can later expire abandoned pending orders.

------------------------------------------------------------------------

# 41. Payment Success but Browser Closes

This is exactly why Razorpay webhooks are required.

Example:

``` text
Customer pays
      ↓
Razorpay captures payment
      ↓
Customer closes browser
      ↓
Frontend never receives success callback
      ↓
Razorpay webhook reaches Velisqa
      ↓
Velisqa marks payment paid
      ↓
Velisqa confirms order
      ↓
NimbusPost shipment created
```

The order should still be fulfilled.

------------------------------------------------------------------------

# 42. Refund Flow

Admin can initiate a refund according to Velisqa's refund policy.

Example:

``` text
Customer requests cancellation
          ↓
Check whether shipment has started
          ↓
Check refund eligibility
          ↓
Create Razorpay refund
          ↓
Store refund ID
          ↓
Track refund status
```

Recommended payment states:

``` text
paid
→ partially_refunded
```

or:

``` text
paid
→ refunded
```

depending on the amount refunded.

The order status and refund status should not be confused.

------------------------------------------------------------------------

# 43. Cancellation Rules

Example policy:

### Before payment

Order can be cancelled.

### Paid but not shipped

Admin can cancel and initiate refund.

### Packed

Cancellation may require manual approval.

### Shipped

Cancellation becomes a shipment/return process.

### Delivered

Use return/refund workflow instead of normal cancellation.

The exact business rules should be configurable.

------------------------------------------------------------------------

# 44. Shipment Creation Failure

Payment can succeed while NimbusPost shipment creation fails.

This is a normal distributed-system failure and must be handled.

Example:

``` text
Razorpay payment = paid
Order = confirmed
NimbusPost = creation_failed
```

Do NOT:

``` text
refund automatically
```

unless Velisqa's business policy explicitly requires it.

Instead:

``` text
shipment_status = creation_failed
```

Admin dashboard should show:

> Payment received --- shipment creation requires attention.

Admin can retry shipment creation.

------------------------------------------------------------------------

# 45. Webhook Processing Architecture

Webhook endpoint should be lightweight.

Recommended:

``` text
Razorpay
   ↓
POST /api/webhooks/razorpay
   ↓
Verify webhook signature
   ↓
Check event ID
   ↓
Store event
   ↓
Return HTTP 200
   ↓
Process event asynchronously
```

Heavy operations such as:

-   database workflows
-   shipment creation
-   notifications
-   emails

should not block the webhook response.

------------------------------------------------------------------------

# 46. Admin Dashboard

The admin dashboard should have:

## Orders

-   All orders
-   Pending
-   Confirmed
-   Packed
-   Shipped
-   Delivered
-   Cancelled
-   RTO

## Payments

-   Pending
-   Paid
-   Failed
-   Refunded
-   Partially refunded

Display:

-   Order reference
-   Amount
-   Payment method
-   Razorpay Order ID
-   Razorpay Payment ID
-   Payment timestamp
-   Payment status

## Shipments

Display:

-   Order
-   AWB
-   Courier
-   Shipment status
-   Tracking
-   Pickup date
-   Delivery date
-   NDR
-   RTO

## Exceptions

Important operational queue:

-   Payment successful but shipment failed
-   Payment pending for long time
-   Shipment creation failed
-   NDR
-   RTO
-   Refund pending
-   Webhook processing failure

------------------------------------------------------------------------

# 47. Customer Order Page

Customer should see:

``` text
Order #VEL-2026-000123

Payment
✓ Payment received

Order
✓ Order confirmed
✓ Packed
✓ Shipped
✓ Out for delivery
✓ Delivered
```

For COD:

``` text
Payment
Cash on Delivery

Order
✓ Order confirmed
✓ Packed
✓ Shipped
✓ Out for delivery
✓ Delivered

COD payment
Cash collected
```

If the tracking provider supports it, show:

-   AWB
-   Courier
-   Estimated delivery
-   Tracking timeline

------------------------------------------------------------------------

# 48. Notifications

Recommended events:

## Customer

-   Order placed
-   Payment successful
-   Payment failed
-   Order confirmed
-   Order packed
-   Order shipped
-   Out for delivery
-   Delivered
-   Cancellation
-   Refund initiated
-   Refund completed
-   NDR / delivery issue

Channels can be:

-   Email
-   WhatsApp
-   SMS

The first release can use email and WhatsApp where available.

------------------------------------------------------------------------

# 49. Inventory Handling

Inventory should be checked server-side.

Recommended approach:

### At checkout

Validate stock.

### After order creation

Reserve stock.

### Payment failure / order expiry

Release reserved stock.

### Payment success

Convert reservation into committed sale.

### Cancellation

Return stock when appropriate.

The exact reservation strategy depends on the existing Velisqa inventory
schema.

------------------------------------------------------------------------

# 50. Recommended End-to-End Prepaid Flow

``` text
Customer
   ↓
Add products to cart
   ↓
Checkout
   ↓
Backend validates cart + price + stock
   ↓
Create Velisqa order
   ↓
Create Razorpay order
   ↓
Open Razorpay Checkout
   ↓
Customer pays
   ↓
Razorpay returns payment details
   ↓
Backend verifies signature
   ↓
Razorpay webhook confirms capture
   ↓
payment_status = paid
   ↓
order_status = confirmed
   ↓
Create NimbusPost shipment
   ↓
Receive AWB
   ↓
shipment_status = created
   ↓
Pack order
   ↓
Courier pickup
   ↓
in_transit
   ↓
out_for_delivery
   ↓
delivered
```

------------------------------------------------------------------------

# 51. Recommended End-to-End COD Flow

``` text
Customer
   ↓
Checkout
   ↓
Select COD
   ↓
Backend validates cart + price + stock
   ↓
Create Velisqa order
   ↓
payment_status = pending
   ↓
COD verification
   ↓
order_status = confirmed
   ↓
Create NimbusPost COD shipment
   ↓
AWB generated
   ↓
Pack
   ↓
Courier pickup
   ↓
In transit
   ↓
Out for delivery
   ↓
Customer pays courier
   ↓
Delivered
   ↓
COD collection
   ↓
COD remittance
   ↓
payment_status = paid
```

------------------------------------------------------------------------

# 52. Error Handling Matrix

  --------------------------------------------------------------------------------------------
  Scenario       Payment             Order                 Shipment             Action
  -------------- ------------------- --------------------- -------------------- --------------
  Checkout       Pending             Placed                None                 Expire later
  abandoned                                                                     

  Payment failed Failed              Placed                None                 Allow retry

  Signature      Failed/Review       Placed                None                 Security alert
  invalid                                                                       

  Payment        Paid                Confirmed             Pending              Create
  captured                                                                      shipment

  Shipment       Paid                Confirmed             Failed               Admin retry
  creation fails                                                                

  Shipment       Paid                Shipped/fulfillment   Created              Continue
  created                                                                       

  NDR            Paid/COD pending    Shipped               NDR                  Follow up

  Delivered      Paid                Delivered             Delivered            Complete
  prepaid                                                                       

  Delivered COD  Pending/Collected   Delivered             Delivered            Await
                                                                                remittance

  Refund         Paid                Cancelled/return      Cancelled/return     Track refund
  initiated                                                                     

  Refund         Refunded            Cancelled/returned    Cancelled/returned   Complete
  completed                                                                     
  --------------------------------------------------------------------------------------------

------------------------------------------------------------------------

# 53. Admin Permissions

Recommended roles:

## Super Admin

Can:

-   View everything
-   Refund
-   Cancel
-   Retry shipments
-   Change order states with audit log
-   Manage payment configuration

## Order Manager

Can:

-   View orders
-   Confirm COD
-   Pack
-   Create/retry shipments
-   Track shipments

Cannot:

-   Change payment configuration
-   Initiate unrestricted refunds

## Support

Can:

-   View customer/order details
-   View payment status
-   View tracking
-   Add internal notes

Cannot:

-   Refund
-   Modify financial data
-   Change payment status manually without authorization

------------------------------------------------------------------------

# 54. Important Rule: Do Not Manually Mark Online Payments as Paid

For Razorpay orders, the admin should not simply have a button:

``` text
Mark Paid
```

Instead, the admin should see the actual Razorpay payment state.

If an exceptional manual reconciliation is required, it should be a
special audited action with:

-   Admin identity
-   Reason
-   Evidence/reference
-   Timestamp

Normal payment confirmation should always come from Razorpay
verification/webhooks.

------------------------------------------------------------------------

# 55. Observability

The backend should log:

-   Order creation
-   Razorpay order creation
-   Payment verification
-   Webhook receipt
-   Webhook processing
-   Shipment creation
-   Shipment failure
-   Refund request
-   Refund completion
-   Admin actions

Do NOT log:

-   Razorpay secret
-   API secrets
-   Card data
-   CVV
-   OTP
-   Full payment credentials

------------------------------------------------------------------------

# 56. Environment Variables

Example backend environment:

``` env
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

NIMBUSPOST_API_KEY=
NIMBUSPOST_API_SECRET=
NIMBUSPOST_BASE_URL=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

FRONTEND_URL=
```

Frontend should contain only public configuration such as:

``` env
VITE_RAZORPAY_KEY_ID=
```

Never put:

``` env
RAZORPAY_KEY_SECRET
NIMBUSPOST_API_SECRET
SUPABASE_SERVICE_ROLE_KEY
```

inside frontend environment variables.

------------------------------------------------------------------------

# 57. Migration From Current Velisqa System

The existing manual payment system should be retired gradually.

## Remove

-   Manual UPI QR checkout
-   Payment screenshot upload
-   `payment-screenshots` dependency
-   Manual payment proof submission
-   Manual approve-payment flow for online payments
-   Manual reject-payment flow for online payments
-   `create_manual_payment_order`
-   `submit_manual_payment_proof`
-   `admin-approve-payment`
-   `admin-reject-payment`

The exact removal should happen only after the Razorpay flow is fully
tested.

## Keep

-   Existing orders concept
-   Customer data
-   Order items
-   Product inventory
-   Admin dashboard
-   NimbusPost integration
-   Order tracking
-   COD

------------------------------------------------------------------------

# 58. Migration Strategy

Recommended:

### Phase 1

Build Razorpay integration in test mode.

### Phase 2

Create new payment/shipment database structures.

### Phase 3

Connect Razorpay to the existing order system.

### Phase 4

Test payment scenarios.

### Phase 5

Connect the fulfillment trigger to NimbusPost.

### Phase 6

Test complete payment → shipment → delivery flow.

### Phase 7

Enable live Razorpay keys.

### Phase 8

Disable manual UPI payment.

### Phase 9

Monitor errors for the first production orders.

------------------------------------------------------------------------

# 59. Test Cases

The following must pass before launch.

## Razorpay

-   Successful UPI payment
-   Successful card payment
-   Successful net banking payment
-   Payment failure
-   Customer closes checkout
-   Customer retries payment
-   Duplicate success callback
-   Duplicate webhook
-   Invalid signature
-   Payment captured
-   Payment not captured
-   Refund
-   Partial refund
-   Webhook arrives before browser callback
-   Browser callback arrives but webhook is delayed

## Orders

-   Stock available
-   Stock unavailable
-   Price changed after cart creation
-   Coupon expired
-   Invalid coupon
-   Duplicate checkout submission
-   Customer refreshes payment page

## NimbusPost

-   Shipment creation success
-   Shipment creation failure
-   Duplicate shipment creation request
-   AWB received
-   Pickup update
-   In-transit update
-   Out-for-delivery update
-   Delivered update
-   NDR
-   RTO

## COD

-   COD order creation
-   COD confirmation
-   COD rejection
-   COD shipment
-   COD delivery
-   COD remittance
-   COD RTO

------------------------------------------------------------------------

# 60. Acceptance Criteria

The implementation is considered complete when:

1.  Customer can place a prepaid order.
2.  Backend creates a Velisqa order before Razorpay Checkout.
3.  Backend creates a Razorpay Order.
4.  Razorpay Checkout opens successfully.
5.  Payment signature is verified server-side.
6.  Razorpay webhook signatures are verified.
7.  Duplicate webhook events are safely ignored.
8.  Captured payments automatically become `paid`.
9.  Paid orders become eligible for fulfillment.
10. NimbusPost shipment is created automatically.
11. AWB/tracking information is stored.
12. Shipment updates update the Velisqa order.
13. Delivered orders become `delivered`.
14. Failed payments never create shipments.
15. Shipment failures do not falsely mark the payment as failed.
16. COD remains independent of Razorpay.
17. COD shipments contain the correct collection amount.
18. Refunds are tracked separately from order status.
19. Admin can see payment and shipment exceptions.
20. No secret keys are exposed to the frontend.
21. No online payment is marked paid manually during normal operations.
22. Payment and shipment operations are idempotent.
23. All important status changes are auditable.
24. Production HTTPS is enabled.
25. Live Razorpay webhooks are configured and tested.

------------------------------------------------------------------------

# 61. Final Recommended Business Flow

## Prepaid

``` text
Checkout
   ↓
Create Velisqa Order
   ↓
Create Razorpay Order
   ↓
Razorpay Checkout
   ↓
Payment
   ↓
Server Signature Verification
   ↓
Razorpay Webhook
   ↓
Payment Captured
   ↓
Payment = PAID
   ↓
Order = CONFIRMED
   ↓
NimbusPost Shipment
   ↓
AWB
   ↓
Packed
   ↓
Picked Up
   ↓
In Transit
   ↓
Out for Delivery
   ↓
Delivered
```

## COD

``` text
Checkout
   ↓
Create Velisqa Order
   ↓
COD Verification
   ↓
Order = CONFIRMED
   ↓
NimbusPost COD Shipment
   ↓
AWB
   ↓
Packed
   ↓
Picked Up
   ↓
In Transit
   ↓
Out for Delivery
   ↓
Customer Pays Courier
   ↓
Delivered
   ↓
COD Remittance
   ↓
Payment = PAID
```

------------------------------------------------------------------------

# 62. Implementation Priority

## P0 --- Must Have

-   Razorpay Orders API
-   Razorpay Checkout
-   Server-side signature verification
-   Razorpay webhook
-   Payment capture handling
-   Supabase payment records
-   Idempotency
-   NimbusPost shipment creation
-   AWB storage
-   Shipment status synchronization
-   Prepaid order lifecycle
-   COD lifecycle
-   Admin exception handling
-   Refund support
-   Security controls

## P1 --- Important

-   Email notifications
-   WhatsApp notifications
-   Customer tracking page
-   COD verification
-   Shipment retry queue
-   Payment reconciliation dashboard
-   Order status history

## P2 --- Future

-   Automated fraud scoring
-   Advanced analytics
-   Multiple courier rules
-   Multiple payment gateways
-   Partial shipments
-   Multi-warehouse inventory
-   Automated accounting integration

------------------------------------------------------------------------

# 63. External Integration References

Implementation should follow the current official documentation for:

-   Razorpay Standard Checkout
-   Razorpay Orders API
-   Razorpay Payment Signature Verification
-   Razorpay Webhooks
-   Razorpay Refund APIs
-   NimbusPost API integration and seller-panel API credentials

Do not hard-code assumptions about NimbusPost endpoint names or request
payloads. Confirm the exact API version, authentication mechanism,
shipment endpoint, webhook/event mechanism, and required fields from the
NimbusPost credentials/documentation available to Velisqa at
implementation time.
