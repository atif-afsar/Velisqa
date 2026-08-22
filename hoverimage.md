# Velisqa — Product Hover Image / Touch Image Swap

## 1. Feature Overview

Implement a product-card image interaction where:

* **Desktop:** When the user hovers over a product image, the primary image changes to the configured hover image.
* **Mobile/Touch:** When the user touches/taps the product image, the hover image is displayed.
* **Admin Panel:** Admin can upload a separate hover image for every product.
* **Fallback:** If no hover image is uploaded, the primary image remains visible.
* **Performance:** Hover images should be optimized and lazy-loaded where appropriate.

The feature should work without requiring separate frontend configuration for individual products.

---

# 2. User Experience

## Desktop

Default:

```text
┌──────────────────────┐
│                      │
│    PRIMARY IMAGE     │
│                      │
└──────────────────────┘
```

On mouse hover:

```text
┌──────────────────────┐
│                      │
│     HOVER IMAGE      │
│                      │
└──────────────────────┘
```

When the mouse leaves the image:

```text
PRIMARY IMAGE
```

---

## Mobile

Default:

```text
PRIMARY IMAGE
```

On first tap/touch:

```text
HOVER IMAGE
```

On the next tap/touch:

```text
PRIMARY IMAGE
```

The interaction should not interfere with the product-card click/navigation.

Recommended behavior:

```text
Tap image
    ↓
If hover image exists
    ↓
Toggle primary ↔ hover
```

If the user taps another product, the previously active product should return to its default image.

---

# 3. Admin Panel

Add a new field to the product management form:

```text
Product Images

Primary Image
[ Upload Image ]

Hover Image
[ Upload Image ]

[ Remove Hover Image ]
```

The hover image should be optional.

Example:

```text
Product Name:
Premium Black Shirt

Primary Image:
black-shirt-front.webp

Hover Image:
black-shirt-back.webp
```

---

# 4. Admin Upload Requirements

Admin should be able to:

* Upload primary image.
* Upload hover image.
* Replace hover image.
* Remove hover image.
* Preview hover image before saving.
* See the currently uploaded hover image.
* Save product with or without a hover image.

Recommended image formats:

```text
WEBP
AVIF
JPEG
PNG
```

Prefer WebP/AVIF for optimized delivery.

---

# 5. Database Schema

Add a hover image field to the existing product model.

Example:

```js
images: {
  primary: {
    url: String,
    publicId: String
  },

  hover: {
    url: String,
    publicId: String
  }
}
```

If the existing Velisqa product schema already contains an image structure, extend that structure rather than creating a completely separate image system.

Alternative:

```js
primaryImage: {
  url: String,
  publicId: String
},

hoverImage: {
  url: String,
  publicId: String
}
```

Use whichever structure matches the existing Velisqa backend architecture.

---

# 6. API Changes

## Create Product

The create-product endpoint should accept:

```text
primaryImage
hoverImage
```

Hover image is optional.

Example payload concept:

```json
{
  "name": "Premium Black Shirt",
  "primaryImage": {
    "url": "...",
    "publicId": "..."
  },
  "hoverImage": {
    "url": "...",
    "publicId": "..."
  }
}
```

---

## Update Product

The update endpoint should support:

```text
POST/PUT/PATCH /products/:id
```

Admin should be able to:

* Add hover image.
* Replace hover image.
* Remove hover image.

When replacing an image, delete the previous uploaded asset if the storage provider supports deletion.

---

# 7. Image Storage

Use the existing Velisqa image-storage provider.

For example, if Velisqa currently uses Cloudinary:

```text
products/
    product-id/
        primary.webp
        hover.webp
```

If using S3:

```text
products/
    {productId}/
        primary.webp
        hover.webp
```

Do not introduce a second image-storage provider unless necessary.

---

# 8. Frontend Product Card

The product card should receive:

```js
{
  primaryImage,
  hoverImage
}
```

Example component:

```jsx
<ProductCard product={product} />
```

The product object should contain:

```js
product.images.primary
product.images.hover
```

---

# 9. Desktop Hover Logic

The product image should use:

```text
mouseenter → hover image
mouseleave → primary image
```

Conceptually:

```jsx
const [isHovered, setIsHovered] = useState(false);

const image =
  isHovered && product.images.hover
    ? product.images.hover
    : product.images.primary;
```

Then:

```jsx
<div
  onMouseEnter={() => setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
>
  <img src={image} alt={product.name} />
</div>
```

---

# 10. Recommended Transition

Do not make the image switch feel abrupt.

Use a short transition:

```css
transition: opacity 250ms ease;
```

Recommended visual behavior:

```text
Primary Image
     ↓
fade
     ↓
Hover Image
```

Avoid overly long animations because product grids should feel fast.

Recommended duration:

```text
200ms – 350ms
```

---

# 11. Better Desktop Implementation

For a smoother transition, render both images on top of each other.

Structure:

```jsx
<div className="relative overflow-hidden">
  
  <img
    src={primaryImage}
    className="absolute inset-0 w-full h-full object-cover"
  />

  {hoverImage && (
    <img
      src={hoverImage}
      className="absolute inset-0 w-full h-full object-cover"
    />
  )}

</div>
```

Then control opacity:

```text
Primary:
opacity: 1 → 0

Hover:
opacity: 0 → 1
```

This produces a much smoother product-card experience.

---

# 12. Mobile Touch Behavior

Mobile devices do not have a traditional mouse hover.

Therefore:

```text
touch/click
```

must control the image state.

Recommended logic:

```jsx
const [isTouchActive, setIsTouchActive] = useState(false);

const handleImageTouch = (event) => {
  if (!product.images.hover) return;

  event.stopPropagation();
  setIsTouchActive(prev => !prev);
};
```

Image state:

```jsx
const showHover =
  hasHoverImage &&
  (isHovered || isTouchActive);
```

---

# 13. Mobile Navigation Consideration

The product card itself may already navigate to:

```text
/products/:slug
```

Therefore, avoid making the entire card toggle the image.

Recommended:

```text
Image
  ↓
Tap → Toggle image

Product information / card
  ↓
Tap → Open product
```

If the existing design requires the entire card to be clickable, use a small interaction rule to distinguish the first image tap from navigation.

The implementation must be tested carefully on:

* Android Chrome
* Android Firefox
* iPhone Safari
* iPhone Chrome

---

# 14. Recommended Mobile UX

Use this behavior:

```text
Initial state
     ↓
Primary image
     ↓
User taps image
     ↓
Hover image
     ↓
User taps image again
     ↓
Primary image
```

If the user scrolls away from the product:

```text
Reset → Primary image
```

This prevents multiple product cards from remaining permanently in hover state.

---

# 15. No Hover Image Fallback

This is mandatory.

If:

```js
product.images.hover === null
```

or:

```js
product.images.hover === undefined
```

then:

```text
Desktop → Primary image only
Mobile → Primary image only
```

There should be no broken image and no empty image container.

Example:

```jsx
const hasHoverImage = Boolean(product.images?.hover?.url);
```

---

# 16. Image Validation

Admin upload validation should check:

### File type

Allow:

```text
image/jpeg
image/png
image/webp
image/avif
```

### File size

Recommended maximum:

```text
5 MB
```

Preferably resize/compress the image before final storage.

### Dimensions

Hover image should ideally use the same aspect ratio as the primary image.

Example:

```text
Primary:
1200 × 1500

Hover:
1200 × 1500
```

Avoid:

```text
Primary:
1200 × 1500

Hover:
1920 × 1080
```

because this can cause product-grid layout changes.

---

# 17. Aspect Ratio

Product cards should reserve the image space.

Example:

```css
aspect-ratio: 4 / 5;
```

or whatever ratio the current Velisqa product grid uses.

Both images must use:

```css
width: 100%;
height: 100%;
object-fit: cover;
```

This prevents layout shifting.

---

# 18. Accessibility

Images must contain meaningful alt text.

Example:

```jsx
<img
  src={product.images.primary.url}
  alt={product.name}
/>
```

The hover image should not create confusing duplicate accessibility content.

If both images are rendered simultaneously, consider:

```jsx
aria-hidden="true"
```

on the decorative/secondary hover image.

---

# 19. Performance

Do not load every hover image aggressively on the initial page.

Recommended:

### Primary image

```text
loading="lazy"
```

for products below the fold.

### Hover image

Use lazy loading where possible.

For products immediately visible on screen, the hover image can be preloaded after the primary image has loaded.

Conceptually:

```text
Page loads
    ↓
Primary images load
    ↓
Browser becomes idle
    ↓
Hover images preload
```

This gives fast initial page performance while keeping hover interaction responsive.

---

# 20. Image Optimization

The backend/storage layer should generate optimized variants.

Example:

```text
primary.webp
hover.webp
```

Potential variants:

```text
thumbnail
card
large
```

Example:

```text
product-card-primary.webp
product-card-hover.webp
```

The frontend should request an appropriate size rather than downloading an unnecessarily large 4K image for a 300px product card.

---

# 21. Admin UI Example

Product editor:

```text
┌─────────────────────────────────────┐
│ Product Images                      │
├─────────────────────────────────────┤
│                                     │
│ Primary Image                       │
│ ┌───────────────┐                   │
│ │               │                   │
│ │   IMAGE       │                   │
│ │               │                   │
│ └───────────────┘                   │
│                                     │
│ [ Upload Primary Image ]            │
│                                     │
│ Hover Image                         │
│ ┌───────────────┐                   │
│ │               │                   │
│ │   IMAGE       │                   │
│ │               │                   │
│ └───────────────┘                   │
│                                     │
│ [ Upload Hover Image ]              │
│ [ Remove Hover Image ]              │
│                                     │
└─────────────────────────────────────┘
```

---

# 22. Product Grid Behavior

Example:

```text
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│              │ │              │ │              │
│   Product 1  │ │   Product 2  │ │   Product 3  │
│   Primary    │ │   Primary    │ │   Primary    │
│              │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
```

Hover Product 2:

```text
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│              │ │              │ │              │
│   Product 1  │ │   Product 2  │ │   Product 3  │
│   Primary    │ │    HOVER     │ │   Primary    │
│              │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
```

No card dimensions should change.

---

# 23. API Response

The product API should return something similar to:

```json
{
  "id": "product_123",
  "name": "Premium Black Shirt",
  "images": {
    "primary": {
      "url": "https://cdn.example.com/product-primary.webp"
    },
    "hover": {
      "url": "https://cdn.example.com/product-hover.webp"
    }
  }
}
```

For products without hover images:

```json
{
  "id": "product_456",
  "name": "White Shirt",
  "images": {
    "primary": {
      "url": "https://cdn.example.com/product-primary.webp"
    },
    "hover": null
  }
}
```

---

# 24. Backend Validation

Backend must not trust frontend validation.

Validate:

```text
Primary image
    required

Hover image
    optional

Hover image
    must be a valid image

File size
    within configured limit

Content type
    allowed
```

---

# 25. Admin Permissions

Only authorized admin users should be able to:

```text
Upload hover image
Replace hover image
Delete hover image
```

Normal customers must never have access to these APIs.

Example middleware:

```text
authenticateAdmin
       ↓
validateRequest
       ↓
uploadImage
       ↓
updateProduct
```

---

# 26. Delete / Replace Logic

When admin replaces a hover image:

```text
Existing Hover Image
        ↓
Upload New Image
        ↓
Database Update
        ↓
Delete Old Image
```

Prefer uploading the new image first and deleting the old one only after the database update succeeds.

This reduces the chance of ending up with a broken product image.

---

# 27. Frontend Component Structure

Recommended:

```text
src/
├── components/
│   └── product/
│       ├── ProductCard.jsx
│       ├── ProductImage.jsx
│       └── ProductGrid.jsx
│
├── hooks/
│   └── useProductImageSwap.js
│
└── utils/
    └── imageUtils.js
```

The main logic should preferably live inside:

```text
ProductImage.jsx
```

so the feature can be reused throughout Velisqa.

---

# 28. Recommended Component API

Example:

```jsx
<ProductImage
  primaryImage={product.images.primary}
  hoverImage={product.images.hover}
  alt={product.name}
/>
```

The component handles:

```text
Desktop hover
Mobile touch
Transitions
Fallback
Accessibility
Image loading
```

The parent product card should not need to know how the image swapping works.

---

# 29. State Management

Do not put hover state into global Redux/Zustand state.

This state is local UI state.

Use:

```jsx
useState()
```

inside the image component.

Example:

```text
ProductImage
    │
    ├── isHovered
    └── isTouchActive
```

Global product state should only contain the image URLs/data.

---

# 30. Edge Cases

The implementation must handle:

### No hover image

```text
Primary image remains.
```

### Hover image fails to load

```text
Fallback → Primary image.
```

### Admin deletes hover image

```text
Frontend automatically uses primary image.
```

### User changes device orientation

```text
Image container remains stable.
```

### Slow network

```text
Primary image should remain usable while hover image loads.
```

### Product has only one image

```text
Normal product card.
```

---

# 31. Error Handling

If the hover image cannot be loaded:

```jsx
onError={(event) => {
  event.currentTarget.style.display = "none";
}}
```

The primary image should remain visible underneath.

Do not show:

```text
Broken image icon
```

to customers.

---

# 32. Acceptance Criteria

The feature is considered complete when:

* [ ] Admin can upload a primary product image.
* [ ] Admin can upload an optional hover image.
* [ ] Admin can replace the hover image.
* [ ] Admin can remove the hover image.
* [ ] Hover image is stored correctly.
* [ ] Product API returns hover image information.
* [ ] Desktop mouse hover displays the hover image.
* [ ] Mouse leaving the card returns to primary image.
* [ ] Mobile tap toggles primary/hover image.
* [ ] Product without hover image works normally.
* [ ] Broken hover image falls back to primary image.
* [ ] Image aspect ratio remains stable.
* [ ] Product grid does not jump during image switching.
* [ ] Images are optimized.
* [ ] Admin-only image modification APIs are protected.
* [ ] Feature works on Android.
* [ ] Feature works on iOS.
* [ ] Feature works on desktop Chrome.
* [ ] Feature works on desktop Edge.
* [ ] Feature works on desktop Safari.
* [ ] Feature does not interfere with product navigation.
* [ ] Existing products continue working without migration issues.

---

# 33. Implementation Flow

Complete architecture:

```text
                    ADMIN PANEL
                         │
                         ▼
               Product Image Manager
                    │          │
                    │          │
              Primary Image   Hover Image
                    │          │
                    └────┬─────┘
                         ▼
                  Image Storage
                         │
                         ▼
                    Product DB
                         │
                         ▼
                    Product API
                         │
                         ▼
                  Frontend Product
                         │
                         ▼
                    ProductImage
                    /          \
                   /            \
              Desktop          Mobile
                │                 │
           Mouse Hover         Tap/Touch
                │                 │
                └────────┬────────┘
                         ▼
                    Hover Image
```

---

# 34. Recommended Development Order

## Phase 1 — Database

Add:

```text
hoverImage
```

to the product model.

## Phase 2 — Backend

Update:

```text
Create Product
Update Product
Delete Product
Get Product
Get Products
```

to support the hover image.

## Phase 3 — Admin Panel

Add:

```text
Hover Image Upload
Preview
Replace
Delete
```

## Phase 4 — Frontend

Create:

```text
ProductImage
```

component.

Implement:

```text
Desktop hover
Mobile touch
Fallback
Transition
```

## Phase 5 — Optimization

Implement:

```text
Image compression
Responsive images
Lazy loading
Preloading
CDN optimization
```

## Phase 6 — Testing

Test:

```text
Desktop
Mobile
Tablet
Slow network
No hover image
Broken hover image
Product navigation
Admin upload/delete
```

---

# 35. Final Expected Behavior

The final Velisqa experience should be:

```text
ADMIN
  │
  ├── Upload Product Image
  │
  └── Upload Hover Image
          │
          ▼
       DATABASE
          │
          ▼
      PRODUCT API
          │
          ▼
       FRONTEND
          │
     ┌────┴────┐
     │         │
 Desktop     Mobile
     │         │
  Hover      Touch
     │         │
     └────┬────┘
          ▼
     HOVER IMAGE
```

The key principle is:

> **The admin controls the hover image; the frontend controls when it is displayed.**

This keeps the feature scalable and allows every Velisqa product to have its own custom hover image without hardcoding anything in the frontend.
