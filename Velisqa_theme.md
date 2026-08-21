# PRD: Velisqa Website Theme Conversion
### Maroon/Wine → Premium Sky Blue

**Prepared for:** Fyniq Digital Solutions (Client: Velisqa Jewellery)
**Site:** https://www.velisqa.com/
**Doc owner:** Atif
**Status:** Draft v1.0

---

## 1. Background

Velisqa's current live theme uses a deep maroon/wine as its primary brand color (`meta-theme-color: #3d0a21`), which reads visually as a brown/dark-purple palette — consistent with traditional Indian jewellery branding (rich, warm, heavy).

The client wants to reposition the brand toward a **cooler, more premium, modern aesthetic** using **sky blue** as the new primary theme color — while keeping every other part of the site (images, product photography, logo, layout, content, structure) completely untouched.

This is a **pure re-skin**: colors and color-dependent styling only.

---

## 2. Objective

Replace the existing maroon/brown-purple color system with a sky-blue-led palette across all UI surfaces (backgrounds, text, buttons, borders, icons, hover/active states, badges, forms) to give the site a lighter, more premium, contemporary feel — **without altering imagery, layout, typography scale, copy, or component structure.**

---

## 3. In Scope vs Out of Scope

| In Scope ✅ | Out of Scope ❌ |
|---|---|
| Primary/secondary/accent brand colors | Product & lifestyle images |
| Background colors (page, section, cards) | Logo artwork/file |
| Text colors (headings, body, links) | Layout/grid/spacing structure |
| Button colors (fill, outline, hover, active, disabled) | Page structure / navigation order |
| Border, divider, shadow colors | Copy/content text |
| Icon fill/stroke colors (where CSS-controlled, not baked into image files) | Font family/size/weight scale |
| Form field colors (input borders, focus states) | Animations/interactions logic |
| Badge/tag/label colors (e.g. "Premium", "New", offer tags) | Third-party embeds (WhatsApp widget default styling if externally hosted) |
| Header/footer background & text colors | Image-embedded text/graphics |
| `meta-theme-color` (mobile browser chrome tint) | SEO metadata, alt text, schema |
| Scrollbar/selection color (optional polish) | |

---

## 4. Current Theme Snapshot

| Token | Current Value (observed) | Notes |
|---|---|---|
| Brand/theme color (meta tag) | `#3d0a21` | Deep maroon-wine, drives mobile browser tint & likely primary CTA/accent color |
| Overall palette family | Warm — brown/maroon/purple undertones | Traditional/heavy jewellery aesthetic |
| Likely secondary tones | Gold/cream accents (typical for this category — to confirm in dev) | Common pairing with maroon in jewellery sites |

> Note: Full CSS variable audit (exact hex values for every surface) should be done directly in the codebase/dev tools before implementation, since automated scraping only exposed the meta theme-color. Section 6 below defines the token structure the dev should populate with actual current values as a "before" reference.

---

## 5. Proposed New Theme — Sky Blue (Premium)

**Design intent:** Light, airy, high-trust, modern-luxury — cooler contrast to differentiate from typical warm-toned jewellery sites, while still feeling upscale (not "techy" or "cold").

| Token | Proposed Value | Usage |
|---|---|---|
| Primary (Brand) | `#0EA5E9` (Sky Blue 500) | Primary CTAs, active nav state, key accents |
| Primary Dark | `#0369A1` (Sky Blue 700) | Hover/active button states, headings on light bg |
| Primary Light | `#BAE6FD` (Sky Blue 200) | Section backgrounds, subtle highlights, badges |
| Primary Tint (bg) | `#F0F9FF` (Sky Blue 50) | Page/section background wash for "premium airy" feel |
| Accent (optional pairing) | `#C9A227` muted gold *or* `#0F172A` deep navy | Small accent details only — to retain a touch of luxury contrast against the blue; recommend A/B choice with client |
| Text — Heading | `#0C4A6E` (deep blue-slate) | Replaces maroon heading color |
| Text — Body | `#334155` (slate gray) | Neutral, high readability on light blue bg |
| Text — Muted/Secondary | `#64748B` | Captions, meta text |
| Border/Divider | `#BAE6FD` or `#E2E8F0` | Cards, input borders, section dividers |
| Success/Offer badge | Keep functional colors (green/red) unchanged — only re-tint neutral badges | |
| `meta-theme-color` | `#0EA5E9` | Mobile browser chrome |

*Gold vs navy accent choice, and final shade calibration, should be confirmed with the client via a quick visual mockup/preview before full implementation (see Section 8).*

---

## 6. Implementation Approach

1. **Centralize via CSS variables/design tokens** (if not already in place) — e.g.:
   ```css
   :root {
     --color-primary: #0EA5E9;
     --color-primary-dark: #0369A1;
     --color-primary-light: #BAE6FD;
     --color-bg: #F0F9FF;
     --color-text-heading: #0C4A6E;
     --color-text-body: #334155;
     --color-border: #E2E8F0;
   }
   ```
2. Audit all hardcoded hex/rgb color values in CSS/SCSS/component files that currently reference the maroon palette and map each to the corresponding new token.
3. Update `meta-theme-color` in the HTML head.
4. Check inline styles or CMS theme settings panel (if the site uses a builder/CMS) for a global "brand color" setting — many themes expose this as a single control.
5. Leave all `<img>`, `<svg>` (if brand-drawn/embedded in images), and background-image assets untouched.
6. Re-check icon colors: if icons are SVG with `fill: currentColor` or CSS-controlled fill, they'll auto-update; if they're colored PNG/JPG assets, they are **out of scope** and stay as-is unless client explicitly requests icon recoloring separately.

---

## 7. Accessibility & Quality Checks

- Verify text/background contrast ratios meet WCAG AA (4.5:1 for body text, 3:1 for large text) — light sky-blue backgrounds with dark slate text should pass, but must be tested per component.
- Check button text remains legible against new primary color (white text on `#0EA5E9` passes AA for large text; verify for small text).
- Test hover/focus/active/disabled states for all buttons and links.
- Test forms (input borders, focus rings, placeholder colors) on both desktop and mobile.
- Cross-browser check for `meta-theme-color` rendering on Android Chrome/Samsung Internet.
- Dark-mode consideration: if the site has any dark sections, confirm blue tones don't wash out.

---

## 8. Deliverables & Process

1. **Color mockup/preview** of homepage + 1 product/category page in new theme for client sign-off before full rollout.
2. Full site theme swap across all pages/templates (header, footer, home, category, product detail, cart/enquiry, contact).
3. Before/after screenshot comparison for client record.
4. QA pass on mobile + desktop.
5. Go-live.

---

## 9. Timeline (suggested)

| Phase | Duration |
|---|---|
| CSS/token audit | 0.5 day |
| Mockup + client approval | 1 day |
| Implementation across all pages | 1–2 days |
| QA + accessibility check | 0.5 day |
| Go-live | 0.5 day |
| **Total** | **~3–4 working days** |

---

## 10. Open Questions for Client Confirmation

1. Preferred accent pairing with sky blue — **muted gold** (keeps luxury warmth) or **deep navy** (fully cool/modern)?
2. Should the WhatsApp CTA button also shift to sky blue, or stay WhatsApp-green for brand recognition (recommended: keep green for trust/familiarity)?
3. Any specific hex code the client already has in mind, or is Anthropic/Fyniq's team free to pick the exact shade within "sky blue"?
4. Confirm no icon recoloring is needed (icons embedded as image assets are out of scope per Section 3).