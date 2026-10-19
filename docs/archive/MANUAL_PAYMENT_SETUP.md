# Manual UPI Payment Deployment

The application code is implemented, but payment and shipment credentials must be configured before enabling UPI QR checkout in production.

## 1. Database and private storage

Run these files in Supabase SQL Editor, in order:

1. `supabase/create-orders-table.sql` (skip if already applied)
2. `supabase/manual-qr-payments.sql`
3. `supabase/fix-cod-checkout.sql` (if you already ran step 2 earlier — updates COD checkout to use Supabase)

The payment script adds payment review fields, token-gated guest order lookup, review logs, and the private `payment-screenshots` bucket. COD and UPI both create orders in Supabase; FormSubmit is only used for sold-out enquiries.

## 2. Frontend variables

Copy the required values from `.env.example` into the deployment environment:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_META_PIXEL_ID=...
VITE_UPI_ID=your-business@upi
VITE_UPI_PAYEE_NAME=VELISQA
VITE_UPI_QR_IMAGE_URL=/payment-qr.png
```

Place the verified business QR image at `public/payment-qr.png`, or set `VITE_UPI_QR_IMAGE_URL` to its HTTPS URL. The payment submit button remains disabled if `VITE_UPI_ID` is absent.

## 3. Edge Function secrets

Never put these in Vite variables:

```powershell
supabase secrets set NIMBUSPOST_EMAIL="your-nimbuspost-login-email"
supabase secrets set NIMBUSPOST_PASSWORD="your-nimbuspost-login-password"
supabase secrets set NIMBUSPOST_PICKUP_NAME="VELISQA"
supabase secrets set NIMBUSPOST_PICKUP_ADDRESS="your exact warehouse address from NimbusPost"
supabase secrets set NIMBUSPOST_PICKUP_CITY="Aligarh"
supabase secrets set NIMBUSPOST_PICKUP_STATE="UP"
supabase secrets set NIMBUSPOST_PICKUP_PINCODE="202001"
supabase secrets set NIMBUSPOST_PICKUP_PHONE="9389030329"
supabase secrets set NIMBUSPOST_CREATE_SHIPMENT_URL="https://api-v2.nimbuspost.com/v2/shipments"
supabase secrets set NIMBUSPOST_API_KEY="npk_..."
supabase secrets set NIMBUSPOST_API_SECRET="..."
supabase secrets set NIMBUSPOST_WAREHOUSE_ID="your-velisqa-warehouse-id"
supabase secrets set NIMBUSPOST_DEFAULT_STATE="UP"
supabase secrets set NIMBUSPOST_WEBHOOK_SECRET="..."
supabase secrets set META_PIXEL_ID="..."
supabase secrets set META_CONVERSIONS_API_TOKEN="..."
```

The integration tries **NimbusPost v1 first** (email/password + pickup address). Set `NIMBUSPOST_API_MODE=v2` only if NimbusPost support confirms your account is v2-only.

Optional Meta test mode:

```powershell
supabase secrets set META_TEST_EVENT_CODE="TEST..."
```

The NimbusPost URL is configurable because the enabled NimbusPost API product/account contract determines the exact shipment endpoint. Verify the request/response mapping in `supabase/functions/_shared/nimbuspost.ts` against the account documentation before production.

## 4. Deploy functions

```powershell
supabase functions deploy admin-approve-payment
supabase functions deploy admin-reject-payment
supabase functions deploy admin-create-shipment
supabase functions deploy nimbuspost-webhook --no-verify-jwt
```

Configure NimbusPost to POST status updates to:

```text
https://YOUR_PROJECT.supabase.co/functions/v1/nimbuspost-webhook?secret=YOUR_NIMBUSPOST_WEBHOOK_SECRET
```

NimbusPost does not send custom headers from its dashboard, so the secret goes in the URL query string.
You can also send header `x-velisqa-webhook-secret` if your integration supports it.

## 5. Test before ads

1. Add an in-stock product to the bag.
2. Checkout with **UPI QR payment**.
3. Confirm `InitiateCheckout` in Meta Test Events.
4. Upload a screenshot smaller than 5 MB.
5. Confirm `PaymentProofSubmitted`.
6. Sign in as admin and open `/admin/payments`.
7. Reject once and verify re-upload works.
8. Approve a test payment and confirm:
   - NimbusPost returns an AWB.
   - Order becomes paid/shipped.
   - Meta CAPI receives one `Purchase` event using the order reference as `event_id`.
   - `/orders/{orderRef}?token=...` shows shipment status.

Do not approve a real payment until NimbusPost credentials and payload mapping have passed this test.
