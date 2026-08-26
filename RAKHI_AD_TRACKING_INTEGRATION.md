# Rakhi Festival Ad Tracking & Website Analytics Integration

## Goal

Implement a production-ready analytics and advertising tracking system
for the website before the Rakhi campaign.

The system must let the business measure:

-   Website visitors
-   Traffic source / campaign / ad
-   Landing pages
-   Most visited pages
-   Product views
-   Add to cart
-   Begin checkout
-   Checkout abandonment
-   Purchases
-   Revenue
-   Conversion rate
-   Device type
-   New vs returning visitors
-   Campaign performance
-   Google Ads conversions
-   Meta Ads conversions
-   Retargeting audiences
-   UTM campaign performance

> Important: Do **not** expose personally identifiable visitor
> information such as a person's name, phone number, email, exact
> address, or individual browsing history in an admin dashboard unless
> there is a legitimate first-party business purpose, appropriate
> consent, and the required privacy/legal basis. Analytics should
> primarily use aggregated or pseudonymous data.

------------------------------------------------------------------------

# 1. Recommended Tracking Stack

Use the following architecture:

1.  **Google Analytics 4 (GA4)**
    -   Website traffic
    -   Page views
    -   User journeys
    -   Ecommerce funnel
    -   Revenue
    -   Traffic sources
    -   Campaign attribution
2.  **Google Ads conversion tracking**
    -   Google Ads clicks → website → checkout → purchase
    -   Conversion values
    -   Campaign optimization
3.  **Meta Pixel**
    -   Facebook/Instagram ad attribution
    -   Retargeting
    -   Product and checkout events
4.  **Meta Conversions API**
    -   Server-side backup for important events
    -   Purchase tracking
    -   Better resilience against browser restrictions
5.  **Google Tag Manager (recommended)**
    -   Centralized tag management
    -   Easier future campaign changes
    -   Avoid hard-coding every marketing tag
6.  **Optional Microsoft Clarity**
    -   Session recordings
    -   Heatmaps
    -   Rage/dead clicks
    -   UX investigation
7.  **Optional internal admin dashboard**
    -   Show business KPIs from GA4/API or a first-party event database
    -   Do not build a fake analytics system from browser-only counters

Google recommends standard GA4 ecommerce events such as `begin_checkout`
and `purchase`, with ecommerce item data and transaction information.\
Reference:
https://developers.google.com/analytics/devguides/collection/ga4/ecommerce

Google Ads uses the Google tag and conversion events to connect ad
interactions with website conversions.\
Reference: https://support.google.com/google-ads/answer/7548399

------------------------------------------------------------------------

# 2. Required Environment Variables

Create environment variables.

Example:

``` env
# Google Analytics
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX

# Google Tag Manager
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX

# Google Ads
NEXT_PUBLIC_GOOGLE_ADS_ID=AW-XXXXXXXXX
NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL=XXXXXXXXXXXX

# Meta
NEXT_PUBLIC_META_PIXEL_ID=XXXXXXXXXXXXXXXXX
META_ACCESS_TOKEN=xxxxxxxxxxxxxxxx
META_PIXEL_ID=XXXXXXXXXXXXXXXXX

# Optional server-side tracking
META_TEST_EVENT_CODE=

# Application
NEXT_PUBLIC_SITE_URL=https://example.com
```

Never expose:

``` env
META_ACCESS_TOKEN
```

to client-side JavaScript.

Only variables prefixed with `NEXT_PUBLIC_` should be available in
browser code when using Next.js.

------------------------------------------------------------------------

# 3. Tracking Architecture

``` text
                         ┌────────────────────┐
                         │    Ads / Social     │
                         │                    │
                         │ Meta / Google Ads  │
                         └─────────┬──────────┘
                                   │
                                   │ UTM + click IDs
                                   ▼
                         ┌────────────────────┐
                         │      Website       │
                         │                    │
                         │ Landing Page       │
                         │ Product Page       │
                         │ Cart               │
                         │ Checkout           │
                         │ Thank You          │
                         └─────────┬──────────┘
                                   │
                    ┌──────────────┼───────────────┐
                    ▼              ▼               ▼
              ┌──────────┐  ┌──────────┐   ┌─────────────┐
              │   GA4    │  │ Meta     │   │ Google Ads  │
              │ Analytics│  │ Pixel    │   │ Conversion  │
              └────┬─────┘  └────┬─────┘   └──────┬──────┘
                   │             │                 │
                   └─────────────┼─────────────────┘
                                 ▼
                       ┌─────────────────────┐
                       │ Analytics / Ads     │
                       │ Dashboards          │
                       └─────────────────────┘
```

For important conversion events, additionally send:

``` text
Browser → Server → Meta Conversions API
```

------------------------------------------------------------------------

# 4. UTM Tracking

All campaign links must use UTMs.

Example:

``` text
https://example.com/rakhi-sale
?utm_source=instagram
&utm_medium=paid_social
&utm_campaign=rakhi_2026
&utm_content=video_01
&utm_term=rakhigift
```

Recommended parameters:

``` text
utm_source
utm_medium
utm_campaign
utm_content
utm_term
```

Examples:

### Instagram Ad

``` text
utm_source=instagram
utm_medium=paid_social
utm_campaign=rakhi_2026
utm_content=video_01
```

### Facebook Ad

``` text
utm_source=facebook
utm_medium=paid_social
utm_campaign=rakhi_2026
utm_content=carousel_01
```

### Google Search Ad

``` text
utm_source=google
utm_medium=cpc
utm_campaign=rakhi_2026
utm_content=search_01
```

Do not overwrite the original campaign parameters when the user
navigates between pages.

Store campaign information in first-party storage/session state where
appropriate.

------------------------------------------------------------------------

# 5. Event Tracking Plan

Implement the following standard event system.

## Core events

``` text
page_view
view_item_list
view_item
select_item
add_to_cart
remove_from_cart
view_cart
begin_checkout
add_shipping_info
add_payment_info
purchase
refund
search
select_promotion
view_promotion
login
sign_up
```

For a simple ecommerce website, the minimum required events are:

``` text
page_view
view_item
add_to_cart
view_cart
begin_checkout
purchase
```

------------------------------------------------------------------------

# 6. Event Data Layer

Create one centralized analytics utility.

Example:

``` ts
type AnalyticsEvent = {
  name: string;
  params?: Record<string, unknown>;
};

export function trackEvent(
  name: string,
  params: Record<string, unknown> = {}
) {
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];

  window.dataLayer.push({
    event: name,
    ...params,
  });

  if (typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
}
```

Do not scatter raw analytics code throughout the application.

Use:

``` text
/lib/analytics.ts
```

as the central tracking layer.

------------------------------------------------------------------------

# 7. Page View Tracking

Track every page.

Example:

``` ts
trackEvent("page_view", {
  page_location: window.location.href,
  page_path: window.location.pathname,
  page_title: document.title,
});
```

For SPA/Next.js route changes, ensure page views are fired when the
route changes.

Avoid duplicate page views.

------------------------------------------------------------------------

# 8. Product View

When a customer opens a product:

``` ts
trackEvent("view_item", {
  currency: "INR",
  value: product.price,
  items: [
    {
      item_id: product.id,
      item_name: product.name,
      price: product.price,
      quantity: 1,
      item_brand: product.brand,
      item_category: product.category,
    },
  ],
});
```

------------------------------------------------------------------------

# 9. Add To Cart

When Add to Cart is clicked:

``` ts
trackEvent("add_to_cart", {
  currency: "INR",
  value: product.price * quantity,
  items: [
    {
      item_id: product.id,
      item_name: product.name,
      price: product.price,
      quantity,
      item_brand: product.brand,
      item_category: product.category,
    },
  ],
});
```

Also fire the corresponding Meta event:

``` ts
fbq("track", "AddToCart", {
  content_ids: [product.id],
  content_name: product.name,
  content_type: "product",
  value: product.price * quantity,
  currency: "INR",
});
```

------------------------------------------------------------------------

# 10. View Cart

Fire when the cart page is opened:

``` ts
trackEvent("view_cart", {
  currency: "INR",
  value: cart.total,
  items: cart.items.map((item) => ({
    item_id: item.id,
    item_name: item.name,
    price: item.price,
    quantity: item.quantity,
  })),
});
```

------------------------------------------------------------------------

# 11. Begin Checkout

This is one of the most important events for the Rakhi campaign.

Fire exactly once when checkout actually begins.

``` ts
trackEvent("begin_checkout", {
  currency: "INR",
  value: cart.total,
  items: cart.items.map((item) => ({
    item_id: item.id,
    item_name: item.name,
    price: item.price,
    quantity: item.quantity,
  })),
});
```

Meta:

``` ts
fbq("track", "InitiateCheckout", {
  content_ids: cart.items.map((item) => item.id),
  content_type: "product",
  value: cart.total,
  currency: "INR",
  num_items: cart.items.length,
});
```

------------------------------------------------------------------------

# 12. Purchase Tracking

Purchase tracking must happen only after a successful order.

Do NOT fire purchase simply because the checkout page loaded.

Use the actual successful order response.

Example:

``` ts
trackEvent("purchase", {
  transaction_id: order.id,
  value: order.total,
  tax: order.tax,
  shipping: order.shipping,
  currency: "INR",
  coupon: order.coupon || undefined,
  items: order.items.map((item) => ({
    item_id: item.id,
    item_name: item.name,
    price: item.price,
    quantity: item.quantity,
  })),
});
```

Meta:

``` ts
fbq("track", "Purchase", {
  value: order.total,
  currency: "INR",
  content_ids: order.items.map((item) => item.id),
  content_type: "product",
});
```

Use the order ID / transaction ID to prevent duplicate purchase events.

------------------------------------------------------------------------

# 13. Google Ads Conversion

Create a Google Ads conversion action for:

``` text
Purchase
```

The conversion should include:

``` text
value
currency
transaction_id
```

Example:

``` ts
gtag("event", "conversion", {
  send_to: `${GOOGLE_ADS_ID}/${GOOGLE_ADS_PURCHASE_LABEL}`,
  value: order.total,
  currency: "INR",
  transaction_id: order.id,
});
```

Do not hard-code the actual account ID in source code.

Use environment variables.

Google recommends using the Google tag site-wide and conversion events
for website conversion measurement.

------------------------------------------------------------------------

# 14. Google Ads Enhanced Conversions

If technically and legally appropriate, enable Google Ads Enhanced
Conversions.

Use first-party customer information only when collected legitimately
and with the required consent/privacy basis.

Google states that Enhanced Conversions can use securely hashed
first-party customer data to improve conversion measurement.

Do not send:

``` text
raw password
raw payment information
card number
CVV
private authentication tokens
```

Never put sensitive payment information into analytics events.

------------------------------------------------------------------------

# 15. Meta Pixel Installation

Create:

``` text
/components/analytics/MetaPixel.tsx
```

Load the Meta Pixel once globally.

Example:

``` tsx
"use client";

import Script from "next/script";

export default function MetaPixel() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  if (!pixelId) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;
        n.push=n;
        n.loaded=!0;
        n.version='2.0';
        n.queue=[];
        t=b.createElement(e);
        t.async=!0;
        t.src=v;
        s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)
        }(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');

        fbq('init', '${pixelId}');
        fbq('track', 'PageView');
      `}
    </Script>
  );
}
```

The implementation should be adapted to the project's framework and
existing analytics architecture.

------------------------------------------------------------------------

# 16. Meta Conversions API

For purchases, send a server-side event.

Recommended architecture:

``` text
Successful Order
       │
       ├── GA4 purchase
       │
       ├── Google Ads conversion
       │
       ├── Meta Pixel Purchase
       │
       └── Meta Conversions API Purchase
```

Server-side Meta events should include an event ID so browser and server
events can be deduplicated.

Example conceptual payload:

``` ts
{
  event_name: "Purchase",
  event_time: Math.floor(Date.now() / 1000),
  event_id: order.id,
  action_source: "website",
  event_source_url: order.url,
  user_data: {
    em: hashedEmail,
    ph: hashedPhone
  },
  custom_data: {
    currency: "INR",
    value: order.total,
    content_ids: order.items.map(item => item.id),
    content_type: "product"
  }
}
```

Never expose the Meta access token to the browser.

------------------------------------------------------------------------

# 17. Event Deduplication

This is critical.

A purchase must not be counted multiple times because:

``` text
User refreshes thank-you page
```

or because:

``` text
Meta Pixel + Meta CAPI
```

both send the same conversion.

Use:

``` text
transaction_id = order.id
```

for GA4/Google Ads.

Use:

``` text
event_id = order.id
```

for Meta browser/server deduplication where supported by the
implementation.

Maintain an idempotency check on the server.

------------------------------------------------------------------------

# 18. Checkout Funnel

Create a funnel:

``` text
Ad Impression
      ↓
Ad Click
      ↓
Landing Page
      ↓
Product View
      ↓
Add To Cart
      ↓
View Cart
      ↓
Begin Checkout
      ↓
Shipping
      ↓
Payment
      ↓
Purchase
```

Primary KPIs:

``` text
CTR
CPC
Landing Page View Rate
Product View Rate
Add To Cart Rate
Checkout Rate
Purchase Conversion Rate
Cost Per Purchase
ROAS
Average Order Value
Revenue
```

------------------------------------------------------------------------

# 19. Most Visited Pages

GA4 should show:

``` text
Page path
Page title
Views
Users
Engagement rate
Average engagement time
Conversions
Revenue
```

The business should be able to identify:

``` text
Top Landing Pages
Top Product Pages
Top Category Pages
Top Checkout Pages
Top Exit Pages
```

Do not create a fake "visitor counter" in the frontend.

Use GA4 for analytics-grade reporting.

------------------------------------------------------------------------

# 20. Checkout Abandonment

Create the following funnel:

``` text
view_item
     ↓
add_to_cart
     ↓
begin_checkout
     ↓
add_shipping_info
     ↓
add_payment_info
     ↓
purchase
```

Calculate:

``` text
Checkout Abandonment Rate
=
1 - (Purchases / Begin Checkout)
```

Also calculate:

``` text
Cart Abandonment Rate
=
1 - (Purchases / Add To Cart)
```

These calculations should be performed in the analytics/reporting layer.

------------------------------------------------------------------------

# 21. Campaign Attribution

Every visitor arriving through an ad should retain:

``` text
utm_source
utm_medium
utm_campaign
utm_content
utm_term
```

Also preserve relevant platform click IDs when present.

Examples:

``` text
gclid
fbclid
```

Do not remove these parameters immediately after landing.

Store campaign attribution safely for the duration required by the
analytics strategy.

------------------------------------------------------------------------

# 22. Admin Dashboard

If an internal analytics dashboard is requested, create:

``` text
/admin/analytics
```

Dashboard sections:

### Overview

``` text
Visitors
Sessions
Orders
Revenue
Conversion Rate
Average Order Value
Ad Spend
ROAS
```

### Traffic

``` text
Source
Medium
Campaign
Users
Sessions
Conversions
Revenue
```

### Pages

``` text
Page
Views
Users
Engagement
Conversions
Revenue
```

### Products

``` text
Product
Views
Add To Cart
Checkout
Purchases
Revenue
```

### Funnel

``` text
Visitors
↓
Product Views
↓
Add To Cart
↓
Checkout
↓
Purchase
```

### Campaigns

``` text
Campaign
Spend
Clicks
Sessions
Purchases
Revenue
CPA
ROAS
```

### Device

``` text
Mobile
Desktop
Tablet
```

### Geography

Use only appropriate aggregated geographic reporting.

Do not expose a user's exact home address or unnecessarily precise
location.

------------------------------------------------------------------------

# 23. Admin Dashboard Data Source

Preferred:

``` text
GA4 → reporting
```

For first-party business data:

``` text
Orders Database → revenue/orders
```

For advertising:

``` text
Meta Ads / Google Ads → spend/campaign data
```

Do not attempt to calculate ad spend from browser events.

------------------------------------------------------------------------

# 24. Internal Event Database (Optional)

If the business requires a custom dashboard independent of GA4, create a
server-side event table.

Example schema:

``` sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY,
  event_name VARCHAR(100) NOT NULL,
  event_id VARCHAR(255),
  session_id VARCHAR(255),
  user_pseudo_id VARCHAR(255),
  page_path TEXT,
  page_title TEXT,
  source VARCHAR(100),
  medium VARCHAR(100),
  campaign VARCHAR(255),
  content VARCHAR(255),
  term VARCHAR(255),
  value DECIMAL(12,2),
  currency VARCHAR(10),
  product_id VARCHAR(255),
  transaction_id VARCHAR(255),
  device_type VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Do not store unnecessary personal information.

------------------------------------------------------------------------

# 25. Privacy

Implement a consent mechanism appropriate to the website's users and
applicable law.

Marketing/advertising tracking should respect the user's consent choices
where required.

The consent system should control:

``` text
Analytics
Advertising
Personalization
```

Do not load optional marketing tags before the appropriate consent
signal if consent is legally required.

Never collect:

``` text
Passwords
Card numbers
CVV
Authentication tokens
Private messages
```

Do not send raw customer emails or phone numbers to analytics events
unless the specific platform's documented, consented mechanism requires
it and the implementation is designed for that purpose.

------------------------------------------------------------------------

# 26. Route Structure

Recommended:

``` text
/src
  /lib
    analytics.ts
    attribution.ts
    google-ads.ts
    meta-pixel.ts

  /components
    /analytics
      AnalyticsProvider.tsx
      GoogleAnalytics.tsx
      GoogleTagManager.tsx
      MetaPixel.tsx
      ConsentManager.tsx

  /app
    /admin
      /analytics
        page.tsx

  /api
    /analytics
      route.ts

    /meta
      /conversions
        route.ts
```

Adapt this structure if the project uses a different architecture.

------------------------------------------------------------------------

# 27. Analytics Utility

Create one unified API:

``` ts
export const analytics = {
  pageView: (data) => {
    trackEvent("page_view", data);
  },

  viewItem: (data) => {
    trackEvent("view_item", data);
  },

  addToCart: (data) => {
    trackEvent("add_to_cart", data);
  },

  viewCart: (data) => {
    trackEvent("view_cart", data);
  },

  beginCheckout: (data) => {
    trackEvent("begin_checkout", data);
  },

  purchase: (data) => {
    trackEvent("purchase", data);
  },
};
```

Application code should call:

``` ts
analytics.addToCart(...)
```

instead of directly calling:

``` ts
gtag(...)
fbq(...)
```

everywhere.

------------------------------------------------------------------------

# 28. Type Safety

Create event types.

Example:

``` ts
type ProductAnalyticsItem = {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  item_brand?: string;
  item_category?: string;
};

type EcommerceEvent = {
  currency: string;
  value: number;
  items: ProductAnalyticsItem[];
};

type PurchaseEvent = EcommerceEvent & {
  transaction_id: string;
  tax?: number;
  shipping?: number;
  coupon?: string;
};
```

Do not use `any` for analytics payloads unless absolutely necessary.

------------------------------------------------------------------------

# 29. Avoid Duplicate Tracking

Before firing an event, make sure the same event isn't fired twice.

Common causes:

``` text
React Strict Mode
route re-renders
button double-click
checkout page refresh
thank-you page refresh
server retry
Meta Pixel + CAPI
```

Use event IDs and transaction IDs.

For purchases, server-side idempotency is preferred.

------------------------------------------------------------------------

# 30. Campaign Landing Page

Create a dedicated Rakhi campaign landing page if one doesn't exist.

Example:

``` text
/rakhi-sale
```

The landing page should contain:

``` text
Hero
↓
Rakhi offer
↓
Best-selling products
↓
Trust / reviews
↓
Urgency
↓
CTA
↓
Products
↓
FAQ
↓
Final CTA
```

All campaign traffic should preferably land on this page instead of the
generic homepage when appropriate.

------------------------------------------------------------------------

# 31. Rakhi Campaign Naming Convention

Use:

``` text
Campaign:
rakhi_2026

Ad Set:
rakhi_2026_interest_women

Creative:
rakhi_video_01

Landing:
rakhi-sale
```

For Meta:

``` text
utm_source=meta
utm_medium=paid_social
utm_campaign=rakhi_2026
utm_content=video_01
```

For Google:

``` text
utm_source=google
utm_medium=cpc
utm_campaign=rakhi_2026
utm_content=search_01
```

------------------------------------------------------------------------

# 32. Testing Checklist

Before running the campaign, test every event.

## Google Analytics

-   [ ] GA4 measurement ID installed
-   [ ] Realtime users appear
-   [ ] Page views appear
-   [ ] Product views appear
-   [ ] Add to cart appears
-   [ ] Begin checkout appears
-   [ ] Purchase appears
-   [ ] Purchase value is correct
-   [ ] Currency is INR
-   [ ] Transaction ID is present
-   [ ] Ecommerce items are visible

## Google Ads

-   [ ] Google tag installed
-   [ ] Conversion action created
-   [ ] Purchase conversion fires
-   [ ] Transaction ID is sent
-   [ ] Value is sent
-   [ ] Currency is INR
-   [ ] Conversion is not duplicated

## Meta

-   [ ] Pixel installed
-   [ ] PageView fires
-   [ ] ViewContent fires
-   [ ] AddToCart fires
-   [ ] InitiateCheckout fires
-   [ ] Purchase fires
-   [ ] CAPI Purchase fires
-   [ ] Browser/server deduplication works
-   [ ] Test events appear correctly

## Website

-   [ ] Mobile tracking works
-   [ ] Desktop tracking works
-   [ ] SPA route changes track
-   [ ] Checkout tracking works
-   [ ] Thank-you page does not duplicate purchases
-   [ ] Refreshing thank-you page does not create a second purchase
-   [ ] UTM parameters persist
-   [ ] Consent settings work
-   [ ] No sensitive data is sent

------------------------------------------------------------------------

# 33. Debug Mode

During development, expose a development-only logger:

``` ts
if (process.env.NODE_ENV === "development") {
  console.debug("[Analytics]", name, params);
}
```

Never log:

``` text
password
card data
CVV
access tokens
payment secrets
```

Remove verbose analytics logs from production.

------------------------------------------------------------------------

# 34. Definition of Done

The implementation is complete only when:

``` text
Visitor
   ↓
Campaign attribution captured
   ↓
Landing page tracked
   ↓
Product view tracked
   ↓
Add to cart tracked
   ↓
Checkout tracked
   ↓
Payment tracked
   ↓
Purchase tracked
   ↓
Revenue recorded
   ↓
Google Ads conversion recorded
   ↓
Meta conversion recorded
   ↓
Meta server conversion recorded
   ↓
Duplicate events prevented
```

And the business can answer:

1.  How many people visited the website?
2.  Where did they come from?
3.  Which campaign brought them?
4.  Which page was visited the most?
5.  Which product was viewed the most?
6.  Which product received the most add-to-carts?
7.  How many people started checkout?
8.  How many completed payment?
9.  Where are customers abandoning?
10. How much revenue came from the Rakhi campaign?
11. What is the cost per purchase?
12. What is ROAS?
13. Which creative generated the most purchases?
14. Which device converts better?
15. Which landing page converts better?

------------------------------------------------------------------------

# 35. Important Implementation Rule

Do **not** build separate random tracking snippets inside individual
pages.

Implement a single analytics architecture:

``` text
AnalyticsProvider
        ↓
analytics.ts
        ↓
Google Analytics
Google Ads
Meta Pixel
Meta CAPI
Optional Clarity
```

The website's business logic should only call:

``` ts
analytics.pageView(...)
analytics.viewItem(...)
analytics.addToCart(...)
analytics.viewCart(...)
analytics.beginCheckout(...)
analytics.purchase(...)
```

This keeps the tracking maintainable and makes future campaigns much
easier.

------------------------------------------------------------------------

# 36. Deliverables For The IDE Agent

The coding agent should:

1.  Inspect the existing project structure before changing anything.
2.  Identify the framework and routing system.
3.  Identify the ecommerce/product/cart/checkout/order flow.
4.  Identify the existing analytics code, if any.
5.  Avoid installing duplicate analytics libraries unnecessarily.
6.  Create the centralized analytics layer.
7.  Add GA4.
8.  Add Google Ads conversion tracking.
9.  Add Meta Pixel.
10. Add Meta Conversions API server integration.
11. Add UTM/campaign attribution.
12. Add ecommerce event tracking.
13. Add purchase deduplication.
14. Add consent-aware loading.
15. Add development debug logging.
16. Add environment variable documentation.
17. Test the entire purchase funnel.
18. Confirm that no sensitive customer/payment data is being sent.
19. Preserve the existing website UI and functionality.
20. Do not break checkout or payment functionality.

------------------------------------------------------------------------

# 37. Do Not Hard-Code Credentials

Never write actual production credentials into source files.

Use:

``` env
NEXT_PUBLIC_GA4_MEASUREMENT_ID=
NEXT_PUBLIC_GTM_ID=
NEXT_PUBLIC_GOOGLE_ADS_ID=
NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL=
NEXT_PUBLIC_META_PIXEL_ID=
META_ACCESS_TOKEN=
```

Add `.env.example` to the project.

Never commit:

``` text
.env
.env.local
production access tokens
API secrets
Meta access tokens
payment secrets
```

------------------------------------------------------------------------

# 38. Final Campaign Dashboard

The final dashboard/reporting setup should make it possible to monitor
this funnel:

``` text
Rakhi Campaign
      │
      ├── Spend
      ├── Impressions
      ├── Reach
      ├── Clicks
      ├── CTR
      ├── CPC
      │
      ▼
Website
      │
      ├── Users
      ├── Sessions
      ├── Landing Page Views
      ├── Product Views
      ├── Add To Cart
      ├── Begin Checkout
      ├── Purchases
      ├── Revenue
      ├── Conversion Rate
      ├── CPA
      └── ROAS
```

The key business objective is not simply to count visitors.

The system must connect:

``` text
AD → VISIT → PRODUCT → CART → CHECKOUT → PURCHASE → REVENUE
```

so campaign decisions can be based on actual conversions rather than
clicks alone.

------------------------------------------------------------------------

# Official Documentation

-   Google Analytics ecommerce measurement:
    https://developers.google.com/analytics/devguides/collection/ga4/ecommerce

-   Google Analytics recommended events:
    https://developers.google.com/analytics/devguides/collection/ga4/reference/events

-   Google Ads website conversion tracking:
    https://support.google.com/google-ads/answer/7548399

-   Google Ads conversion tracking:
    https://support.google.com/google-ads/answer/6331314

-   Google Ads Enhanced Conversions:
    https://support.google.com/google-ads/answer/13258081

-   Google Tag Manager: https://tagmanager.google.com/

-   Meta Business: https://business.facebook.com/
