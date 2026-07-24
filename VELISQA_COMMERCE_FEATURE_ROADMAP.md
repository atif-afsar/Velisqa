# Velisqa Commerce Feature Roadmap

## Purpose

This document defines the next conversion and retention features for Velisqa. Each feature includes:

- Current implementation status
- Customer-facing scope
- Database and admin requirements
- Frontend execution plan
- Analytics and SEO considerations
- Acceptance criteria
- Recommended delivery order

The goal is to build these features incrementally without destabilizing checkout, payments, or NimbusPost shipping.

---

## Implementation progress

### Phase 1 — Product data foundation (code complete)

- Added `supabase/add-product-commerce-fields.sql` for per-product MRP, metal, colour, styles, and search keywords.
- Added the new fields and validation to the admin product editor.
- Replaced the fabricated global 30% comparison price with genuine per-product MRP pricing.
- Exposed all eight catalogue categories in the main Collections grid.
- Updated cart stock synchronization to respect the explicit `out_of_stock` flag.
- Kept catalogue reads compatible before the migration is installed.

**Required deployment step:** run `supabase/add-product-commerce-fields.sql` in the Supabase SQL Editor, then edit existing products in Admin → Products to add their MRP and filter metadata. A product only displays a discount when its saved MRP is higher than its selling price.

### Phase 2 — Search and autocomplete (code complete)

- Added search icons to desktop and mobile navigation.
- Added an accessible search dialog with 180 ms client-side autocomplete, keyboard navigation, focus trapping, and up to six product suggestions.
- Added curated popular searches, all product categories, and device-local recent searches.
- Added ranked matching across product name, category, metal, colour, styles, badge, and search keywords.
- Added price-intent matching such as `gifts under 1500`, singular/plural aliases, genuine MRP display, and in-stock-first ordering.
- Added the shareable `/search?q=` results page with loading, empty, and no-result states.
- Corrected the website SEO `SearchAction` to use `/search?q={search_term_string}`.

### Phase 3 — Faceted filters and sorting (code complete)

- Added immediate client-side filters for category, minimum/maximum price, metal, colour, style, availability, and minimum rating.
- Added Featured, Newest, price, rating, and best-selling sort options.
- Added a sticky desktop filter sidebar and full-height mobile filter drawer.
- Added active-filter chips, individual removal, clear-all actions, live result counts, and filtered empty states.
- Stored every filter and sort choice in shareable URL parameters while preserving category and search queries.
- Added the same compatible filter controls to `/search` results.

### Phase 4 — Verified customer reviews (code complete)

- Added `supabase/product-reviews.sql` with review records, verified delivered-purchase checks, RLS, moderation states, and aggregate triggers.
- Added product-page review summaries, approved review cards, verified-purchase badges, and optional customer photos.
- Added signed-in review submission restricted to customers whose order containing the product was delivered.
- Added Admin → Reviews moderation for pending, approved, rejected, and reported reviews.
- Product rating and review count now update automatically from approved reviews only.
- Removed generated ratings, generated review counts, and manual rating/count fields from the product editor.
- Products without approved reviews now display `No reviews yet`.

**Required deployment step:** run `supabase/product-reviews.sql` in the Supabase SQL Editor. Review photo uploads use the existing Cloudinary environment configuration.

### Phase 5 — Mini-cart drawer (code complete)

- Replaced successful add-to-cart toasts with an automatically opened slide-in bag drawer.
- Added recently-added highlighting, product images, genuine unit pricing, quantities, removal, stock warnings, line totals, and live subtotal.
- Added `View bag`, `Continue shopping`, and authenticated `Checkout securely` actions.
- Navbar bag buttons now open the drawer on desktop and mobile.
- Added focus trapping, Escape and overlay closing, focus restoration, and background scroll locking.
- Stock errors still use lightweight toast messages and never open the drawer.

---

## Current verified status

### Search

- Desktop and mobile navigation now open a complete product-search interface.
- Search includes live autocomplete, popular searches, recent local history, category shortcuts, and a shareable results page.
- Version 1 performs ranked browser-side matching against the cached product catalogue without server requests per keystroke.
- The SEO `SearchAction` now points to `/search?q=`.
- Fuzzy typo correction and privacy-safe search analytics remain future enhancements.

### Collection filters

- Collections currently support category tabs and a `category` URL parameter.
- Collections and search results now support price, metal, colour, style, availability, rating, category, and sorting controls.
- Active filters and sorting persist in shareable URL parameters.
- Desktop uses a sticky sidebar; mobile uses a full-height drawer.
- The Phase 1 migration and admin UI now provide normalized metal, colour, styles, search keywords, and MRP fields.
- The main Collections grid now exposes all eight admin catalogue categories.

### Ratings on product cards

- Product cards and product details render aggregate ratings from approved reviews.
- Generated fallback ratings and review counts have been removed.
- Products without approved reviews show `No reviews yet`.
- Only signed-in customers with a delivered order containing the product can submit a review.
- Admin moderation controls whether a review affects the public aggregate.

### Sale and MRP display

- Product cards and product details display the selling price, genuine MRP, and calculated discount when MRP is higher.
- The old derived global 30% comparison price has been removed.
- Products now have individually managed selling price and MRP; scheduled promotion rules remain future work.

### Cart experience

- Adding an available item opens a responsive mini-cart drawer immediately.
- The drawer provides quantities, removal, stock warnings, line totals, subtotal, View bag, and secure checkout.
- Invalid stock actions continue to use lightweight error toasts without opening the drawer.
- Cart state is stored only in local storage and is not synchronized across signed-in devices.
- Cart stock refresh now includes the explicit `out_of_stock` field and blocks admin-disabled products.

### Customer account and addresses

- Signed-in customers can access My Orders and Wishlist.
- There is no full account dashboard.
- There is no saved-address table or address-book UI.
- Checkout does not currently let the customer choose among saved Home, Work, or Other addresses.
- Cart and Wishlist are device-local rather than linked to the customer account.

### Out-of-stock notifications

- Products have sold-out detection.
- Sold-out products open an enquiry form.
- The enquiry is sent through an email service, not stored as a durable restock subscription.
- There is no automated notification when stock becomes available again.
- The existing `orders.is_enquiry` database column is not used by the enquiry form.
- Existing copy promises notification even though no durable subscriber record or automated notification currently exists.

---

# Feature 2 — Search with autocomplete and popular searches

## Customer experience

Add a search icon to desktop and mobile navigation that opens an accessible search panel.

When the field is empty, show:

- Popular searches
- Product categories
- Recently searched terms stored locally
- Optional trending products

As the customer types, show:

- Matching product image
- Product name
- Category
- Sale price and MRP
- Availability
- Up to six immediate product suggestions
- Matching categories and suggested search phrases

Pressing Enter or selecting `View all results` opens:

```text
/search?q=gold+ring
```

## Search matching

Version 1 should match:

- Product name
- Category
- Metal
- Colour
- Style
- Badge
- Search keywords

Normalize text by:

- Converting to lowercase
- Removing punctuation
- Treating singular/plural category names as aliases
- Matching common jewellery synonyms such as `earring` and `earrings`

## Data work

Add product metadata:

- `search_keywords text[]`
- `metal text`
- `colour text`
- `style text`

For a small catalogue, autocomplete can filter the existing cached product list in the browser.

When the catalogue grows, move result ranking to a Supabase full-text search RPC with:

- A generated search document
- `GIN` index
- Prefix matching
- Optional fuzzy matching using `pg_trgm`

## Popular searches

Start with a curated configuration:

- Rings
- Earrings
- Necklace
- Bracelet
- Gold jewellery
- Silver jewellery
- Gifts under ₹1,500
- Everyday jewellery

Later, add a privacy-safe `search_events` table containing:

- Search term
- Result count
- Timestamp
- Anonymous session identifier

Do not store customer email or phone in search analytics.

## Components

Planned:

- `src/Components/Search/SearchDialog.jsx`
- `src/Components/Search/SearchInput.jsx`
- `src/Components/Search/SearchSuggestions.jsx`
- `src/Components/Search/PopularSearches.jsx`
- `src/Pages/SearchResults.jsx`
- `src/lib/productSearch.js`
- `src/lib/popularSearches.js`

Update:

- `src/Components/Navbar.jsx`
- `src/App.jsx`
- Product query fields
- `src/Components/SEO/schemaBuilders.js` so `SearchAction` points to `/search?q=`

## Behaviour requirements

- Debounce input by approximately 150–250 ms.
- Do not request the server on every keystroke in version 1.
- Support keyboard arrows, Enter, Escape, and focus trapping.
- Close when navigating to a selected product.
- Highlight the matched part of a product name.
- Never suggest sold-out products before available products.
- Keep the query in the URL so results can be shared.

## Acceptance criteria

- Search opens from desktop and mobile navigation.
- Empty search displays popular searches.
- Typing two or more characters displays live suggestions.
- Suggestions include image, name, price, and availability.
- Keyboard navigation works without a mouse.
- Enter opens a complete results page.
- Results can be combined with collection filters.
- Empty and no-result states suggest useful alternatives.

---

# Feature 3 — Faceted collection filters

## Customer experience

Add filter and sort controls to collection/category pages.

Filters:

- Price range
- Metal
- Colour
- Style or occasion
- Availability
- Rating
- Category

Sorting:

- Featured
- Newest
- Price: low to high
- Price: high to low
- Highest rated
- Best selling

Desktop should use a filter sidebar or toolbar. Mobile should use a bottom sheet or full-height drawer.

## Product taxonomy

Use controlled admin values rather than arbitrary free text.

Suggested metal values:

- Gold plated
- Rose gold plated
- Silver plated
- 925 silver
- Stainless steel
- Brass
- Alloy

Suggested colour values:

- Gold
- Rose gold
- Silver
- Oxidised
- Multicolour

Suggested style values:

- Everyday
- Office
- Party
- Wedding
- Minimal
- Statement
- Traditional
- Contemporary

## Database work

Add to `products`:

- `metal text`
- `colour text`
- `style text[]`
- `mrp numeric`
- Optional `is_featured boolean`
- Optional `sales_count integer`

Add indexes for:

- Category
- Price
- Metal
- Colour
- Availability

Update the admin product form so these fields are maintained at the source.

## URL state

Filters must be represented in the URL:

```text
/collections?category=rings&metal=925-silver&maxPrice=1500&style=everyday&sort=price-asc
```

Benefits:

- Browser Back works
- Filtered pages can be shared
- Search and category navigation remain consistent
- Analytics can identify high-intent combinations

## Filtering approach

Version 1:

- Fetch the catalogue once.
- Filter and sort with memoized client-side functions.
- Show active-filter chips.
- Include a single `Clear all` action.

Version 2, when catalogue size requires it:

- Send filters to Supabase.
- Add pagination or cursor-based loading.
- Return facet counts from an RPC.

## Components

Planned:

- `src/Components/Collections/ProductFilters.jsx`
- `src/Components/Collections/FilterDrawer.jsx`
- `src/Components/Collections/ActiveFilterChips.jsx`
- `src/Components/Collections/ProductSort.jsx`
- `src/lib/productFilters.js`

Update:

- `SignatureCollection.jsx`
- `HomeShopGrid.jsx` where appropriate
- Admin product form
- Product query selection

## Acceptance criteria

- A shopper can find a silver ring under ₹1,500.
- Multiple facets can be combined.
- Product count updates immediately.
- Active filters are visible and individually removable.
- `Clear all` restores the category.
- Sort and filters persist in the URL.
- Mobile controls remain usable with one hand.
- Empty filtered results recommend removing one filter.

---

# Feature 4 — Ratings and review count on product grids

## Current state

This feature is already visually present:

- Product cards render `ProductRating`.
- Product detail pages also render it.
- Rating and review count are included in product-list queries.

The next work is review authenticity and management.

## Required improvement

Create a real review system:

- Verified purchaser reviews
- Star rating from 1 to 5
- Review title and body
- Optional customer image
- Moderation status
- Product-level aggregate rating
- Product-level approved-review count

## Database work

Create `product_reviews`:

- `id`
- `product_id`
- `user_id`
- `order_id`
- `rating`
- `title`
- `body`
- `image_urls`
- `is_verified_purchase`
- `status`
- `created_at`

Only customers who purchased a delivered order should receive a verified-purchase badge.

Use an aggregate function or trigger to update:

- `products.rating`
- `products.review_count`

## Admin work

Add a review moderation section:

- Pending
- Approved
- Rejected
- Reported

Do not allow arbitrary review counts to be used as permanent substitutes for real reviews.

## Acceptance criteria

- Every product card shows rating and review count.
- Values match approved reviews.
- Products with no reviews show `New` or `No reviews yet`, not fabricated trust data.
- Only approved reviews affect the aggregate.
- Verified-purchase status is derived from order data.

---

# Feature 5 — Product-specific MRP, sale price, and discount

## Current state

Velisqa already displays:

- Sale price
- Struck-through comparison price
- Global 30% discount label

The comparison MRP is currently calculated from the sale price, so it is not product-specific.

## Required improvement

Store pricing explicitly:

- `price` — current selling price
- `mrp` — genuine maximum retail price
- Optional sale start/end timestamps

Calculate:

```text
discount percentage = round((mrp - price) / mrp × 100)
```

Only display a discount when:

- MRP is greater than sale price
- Both amounts are valid
- The discount is genuine and legally supportable

## Admin work

Update product creation/editing with:

- Selling price
- MRP
- Automatically calculated saving
- Validation preventing `mrp < price`
- Optional promotional dates

## Display work

Use the same shared component everywhere:

- Product cards
- Product detail
- Cart
- Mini-cart
- Checkout
- Wishlist
- Search suggestions

## Acceptance criteria

- Each product can have an independent MRP and discount.
- Products without a discount show only one price.
- Cart and checkout always charge `price`, never `mrp`.
- The displayed discount is calculated consistently.
- Admin cannot save invalid pricing.

---

# Feature 6 — Mini-cart drawer

## Customer experience

Replace the success toast for normal add-to-cart actions with a slide-in mini-cart drawer.

The drawer should show:

- Recently added product highlighted
- Product image and name
- Unit price
- Quantity controls
- Remove action
- Stock warning
- Bag subtotal
- `View bag`
- Primary `Checkout securely` action
- Continue shopping / close action

Errors such as insufficient stock should continue using lightweight toast messaging.

## State work

Extend `CartContext` with:

- `isCartDrawerOpen`
- `openCartDrawer`
- `closeCartDrawer`
- `lastAddedProductId`

Adding a valid product should:

1. Persist the cart.
2. Track `AddToCart`.
3. Set the last-added item.
4. Open the drawer.

## Components

Planned:

- `src/Components/Cart/MiniCartDrawer.jsx`
- `src/Components/Cart/MiniCartLine.jsx`
- `src/Components/Cart/MiniCartSummary.jsx`

Update:

- `CartContext.jsx`
- `App.jsx`
- `CartToast.jsx`
- Navbar bag button

## Accessibility

- Trap focus while open.
- Close with Escape.
- Restore focus to the triggering button.
- Prevent background scrolling.
- Provide an accessible drawer title and close button.

## Acceptance criteria

- Adding a product opens the drawer immediately.
- The correct product is visible.
- Quantity updates recalculate subtotal.
- Sold-out or insufficient-stock errors do not open the drawer.
- Checkout button opens `/checkout`.
- Drawer works on mobile and desktop.
- Cart persists after refresh.

---

# Feature 7 — Account dashboard and saved addresses

## Customer experience

Create `/account` with:

- Overview
- Personal information
- My orders
- Saved addresses
- Wishlist
- Sign out

Saved addresses should support:

- Home, Work, or Other label
- Recipient name
- Primary phone
- House/flat/building
- Street/road/locality
- Landmark
- City/district
- State/union territory
- PIN code
- Optional delivery directions
- Default address

## Database work

Create `customer_addresses`:

- `id uuid`
- `user_id uuid`
- `label text`
- `recipient_name text`
- `phone text`
- `address_line1 text`
- `address_line2 text`
- `landmark text`
- `city text`
- `state text`
- `pincode text`
- `delivery_directions text`
- `is_default boolean`
- `created_at`
- `updated_at`

RLS requirements:

- Customers can only read their own addresses.
- Customers can only insert/update/delete their own addresses.
- At most one default address per user.
- Admin service-role operations remain possible when required.

## Checkout integration

At checkout:

- Load saved addresses for the signed-in customer.
- Preselect the default address.
- Allow choosing another saved address.
- Allow `Use a new address`.
- Optionally save the new address after successful order creation.
- Copy address values into the order record so old orders remain historically accurate even if the saved address changes.

## Personal information

Extend the profile experience with:

- Full name
- Phone
- Email display
- Optional birthday
- Communication preferences

Email changes should use Supabase Auth’s secure email-change flow.

## Components and pages

Planned:

- `src/Pages/AccountDashboard.jsx`
- `src/Pages/AccountProfile.jsx`
- `src/Pages/AccountAddresses.jsx`
- `src/Components/Account/AccountShell.jsx`
- `src/Components/Account/AddressCard.jsx`
- `src/Components/Account/AddressForm.jsx`
- `src/lib/customerAddresses.js`

Update:

- `App.jsx`
- Account navigation
- Checkout address section
- Login return paths

## Acceptance criteria

- Customer can create, edit, delete, and set a default address.
- Another customer cannot access those addresses.
- Checkout preselects the default address.
- Customer can choose a different address.
- Editing a saved address does not alter historical orders.
- My Orders and Wishlist remain accessible from the account navigation.

---

# Feature 8 — Durable restock notifications

## Current state

- Sold-out products show a sold-out state.
- Customers can submit an enquiry.
- Enquiries are emailed but not stored as reliable restock subscriptions.

## Customer experience

Replace or supplement the generic enquiry with:

- `Notify me when available`
- Email field for guests
- Email and optional phone for signed-in customers
- Clear consent text
- Success state confirming subscription
- Duplicate-subscription handling

The existing bespoke/product enquiry flow may remain available separately.

## Database work

Create `restock_subscriptions`:

- `id uuid`
- `product_id uuid`
- `user_id uuid null`
- `email text`
- `phone text null`
- `status text`
- `created_at`
- `notified_at`
- `unsubscribed_at`

Recommended statuses:

- Active
- Notified
- Unsubscribed

Prevent duplicate active subscriptions for the same product and normalized email.

## Notification execution

When stock changes from sold out to available:

1. Detect the transition in the admin update flow.
2. Queue active subscribers.
3. Send email through a transactional email provider.
4. Mark successful subscriptions as notified.
5. Include a private unsubscribe link.

Do not send restock emails directly from the browser.

Recommended providers:

- Resend
- Postmark
- Brevo
- Another transactional provider with delivery logs

## Admin work

Add:

- Subscriber count per product
- Active waitlist count
- Notification status
- Manual `Send restock notification` action
- Delivery/error reporting

## Components

Planned:

- `src/Components/Product/RestockNotifyForm.jsx`
- `src/lib/restockSubscriptions.js`
- `supabase/functions/subscribe-restock/index.ts`
- `supabase/functions/send-restock-notifications/index.ts`

## Acceptance criteria

- Sold-out products show `Notify me`.
- Subscription is persisted in Supabase.
- Duplicate submissions do not create duplicate active records.
- Restocking can trigger one notification per subscriber.
- Failed notifications remain retryable.
- Unsubscribe works without requiring login.
- Consent and privacy copy are visible.

---

# Recommended execution order

## Phase 1 — Product data foundation

1. Add product MRP, metal, colour, style, and search keywords.
2. Add fields to the admin product editor.
3. Align visible shop categories with all admin-supported categories.
4. Backfill existing catalogue products.
5. Update shared product queries and pricing helpers.
6. Include `out_of_stock` in cart stock synchronization and use one sold-out helper across every add-to-cart entry point.

This phase unlocks accurate search, filters, and product-specific discounts.

## Phase 2 — Search

1. Add search utilities and aliases.
2. Build search dialog and popular-search state.
3. Add navbar triggers.
4. Build `/search`.
5. Correct the website SEO `SearchAction`.
6. Add analytics events.

## Phase 3 — Collection filters

1. Add URL filter parsing.
2. Add filtering and sorting utilities.
3. Build desktop controls.
4. Build mobile filter drawer.
5. Add active chips and empty states.

## Phase 4 — Product-card trust and pricing

1. Switch from derived MRP to stored MRP.
2. Confirm consistent card/detail/cart/checkout pricing.
3. Build the real review schema.
4. Add review submission and moderation.
5. Replace fallback review values with real aggregates.

## Phase 5 — Mini-cart

1. Add drawer state to CartContext.
2. Build drawer UI and line controls.
3. Open it after successful add-to-cart.
4. Keep toast only for errors.
5. Add direct checkout action.

## Phase 6 — Account and address book

1. Create address schema and RLS.
2. Build account shell and profile page.
3. Build address CRUD.
4. Integrate default address into checkout.
5. Add optional save-new-address flow.

## Phase 7 — Restock notifications

1. Create subscription schema and RLS/RPC.
2. Persist current sold-out enquiries or migrate them into the new subscription flow.
3. Replace notification promises until persistence is live.
4. Build customer subscription UI.
5. Add transactional email provider.
6. Connect stock transitions to notifications.
7. Add admin monitoring and retries.

---

# Shared quality requirements

Every feature must include:

- Mobile-first responsive design
- Keyboard accessibility
- Loading, empty, error, and success states
- Supabase RLS where customer data is involved
- No service-role keys in frontend code
- Analytics events without personal data
- Reusable components rather than duplicate page logic
- Build and targeted lint verification
- Manual testing on mobile and desktop
- No regression to cart, checkout, UPI payment, COD, admin orders, or NimbusPost

---

# Definition of completion

This roadmap is complete when a customer can:

1. Search for a product and receive useful live suggestions.
2. Filter jewellery by budget and product attributes.
3. See trustworthy ratings and genuine promotional pricing before opening a product.
4. Review their bag and start checkout from a mini-cart.
5. Reuse saved delivery addresses.
6. Subscribe to reliable restock notifications.

Each feature should be implemented and verified as an independent milestone before moving to the next.
