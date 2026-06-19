---
name: FinTrack SaaS
description: Localized, high-precision financial tracking and analytics platform.
colors:
  primary: "#4f46e5"
  neutral-bg: "#ffffff"
  neutral-fg: "#0f172a"
  border: "#e2e8f0"
  card: "#ffffff"
typography:
  display:
    fontFamily: "Poppins, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 4rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "#4338ca"
---

# Design System: FinTrack SaaS

## 1. Overview

**Creative North Star: "The Clean Indigo Vault"**

The FinTrack SaaS visual identity is a sleek, highly structured financial workspace built around precision, density, and localized trust. Designed for Indonesian individual users and freelancers, it rejects ambient shadows and "warm-cream" AI templates in favor of a clean indigo color scheme, sharp layout boundaries, and excellent contrast. The interface feels snappy, trustworthy, and highly utilitarian.

**Key Characteristics:**
- Focused Indigo visual identity with dark slate/blue depth.
- Low-elevation, boundary-driven layouts utilizing 1px borders.
- High typographic readability separating numbers (Inter) from branding/headings (Poppins).
- Immediate in-page loader feedback (skeletons) during background processing.

## 2. Colors

FinTrack uses a concentrated, professional indigo color palette for brand accents, combined with highly readable neutral values.

### Primary
- **Clean Indigo** (#4f46e5 / oklch(0.585 0.233 277.117)): Used for primary actions, buttons, focused input rings, and status highlights.

### Neutral
- **Deep Slate Foreground** (#0f172a / oklch(0.145 0 0)): Used for primary headings, body text, and icons to guarantee maximum readability.
- **Pure Canvas Background** (#ffffff / oklch(1 0 0)): Primary clean canvas background for light mode.
- **Muted Border** (#e2e8f0 / oklch(0.922 0 0)): Used for card containers, inputs, and section boundaries.
- **Card Background** (#ffffff / oklch(1 0 0)): Card element color in light mode.

**The Indigo Constraint Rule.** The primary clean indigo color (#4f46e5) is used selectively on <=10% of any given screen. Primary actions and brand markers carry the accent; content tables and standard controls remain neutral to prevent visual clutter.

## 3. Typography

**Display Font:** Poppins (with sans-serif fallback)
**Body Font:** Inter (with sans-serif fallback)

Poppins brings geometric structure to display elements, headlines, and titles, reinforcing brand confidence. Inter is the workhorse for cash flow tables, forms, and financial analytics where maximum number legibility is critical.

### Hierarchy
- **Display** (Bold (700), clamp(2.5rem, 6vw, 4rem), 1.1): Used for big landing page hero headers. Letter spacing floor is (-0.02em).
- **Headline** (Bold (700), 1.875rem, 1.25): Used for primary dashboard and main route page headers (e.g. "Dashboard Overview").
- **Title** (SemiBold (600), 1.25rem, 1.5): Section titles and dialog headers.
- **Body** (Regular (400), 0.875rem, 1.5): Standard prose and transaction cells. Max line length is restricted to (75ch) for readability.
- **Label** (Medium (500), 0.75rem, 0.05em, uppercase): Used for table headers, form labels, and kickers.

## 4. Elevation

FinTrack follows a flat-by-default visual strategy. We reject soft, ambient shadows on cards and page containers at rest. Depth is established through structural 1px borders and distinct container backgrounds rather than blur.

### Shadow Vocabulary
- **Interactive Rise** (box-shadow: 0 4px 12px rgba(79, 70, 229, 0.08)): Subtle shadow added only during hover states on card containers or primary buttons to indicate interactivity.

**The Boundary Rule.** Depth must always be created using solid borders (1px) in combination with layout changes. Ambient drop shadows are prohibited unless explicitly triggered by interactive states (hover/focus).

## 5. Components

### Buttons
- **Shape:** Rounded-md (6px / 0.375rem radius).
- **Primary:** Clean Indigo background (#4f46e5) with white text, using (10px 16px) padding.
- **Hover / Focus:** Shifts to dark indigo (#4338ca), applying a focused indigo ring shadow.

### Cards / Containers
- **Corner Style:** Rounded-lg (10px / 0.625rem radius).
- **Background:** Slate card background (#ffffff).
- **Shadow Strategy:** Flat at rest; subtle shadow applied only on hover.
- **Border:** Solid 1px slate border (#e2e8f0).

### Inputs / Fields
- **Style:** Solid 1px border (#e2e8f0), rounded-md (6px radius).
- **Focus:** Border transitions to clean indigo (#4f46e5) with a subtle ring.

### Navigation
- **Sidebar:** Slate container utilizing Poppins (SemiBold) for brand headings and Inter for navigation items. Icons use clean slate-500, active navigation states use indigo backgrounds with white text.

## 6. Do's and Don'ts

### Do:
- **Do** format all currency amounts explicitly via `Intl.NumberFormat('id-ID')`.
- **Do** use a Calendar-based date picker for manual transactions instead of simple text inputs.
- **Do** provide in-page skeleton loading animations for fields while OCR processing is active.
- **Do** pair Poppins (headings) and Inter (tabular cells) strictly to separate branding from information density.

### Don't:
- **Don't** use warm neutral/beige "SaaS-cream" default background colors.
- **Don't** apply border-radius values greater than 16px to cards or sections.
- **Don't** use border-left/right stripes greater than 1px as accent decorations.
- **Don't** pair a 1px solid border with a drop shadow of 16px or greater blur (no ghost cards).
- **Don't** use text gradient fills (`background-clip: text` with a gradient) for headings.
- **Don't** let table text overflow boundaries; use clean text truncation with tooltips for overflowing items.
