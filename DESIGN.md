---
name: FinTrack SaaS
description: Localized, high-precision financial tracking and analytics platform.
colors:
  primary: "#4f46e5"
  primary-hover: "#4338ca"
  primary-active-surface: "#eef2ff"
  canvas: "#f8fafc"
  surface: "#ffffff"
  foreground: "#0f172a"
  muted-foreground: "#64748b"
  border: "#e2e8f0"
  border-subtle: "#f1f5f9"
  status-positive: "#059669"
  status-positive-surface: "#ecfdf5"
  status-negative: "#e11d48"
  status-negative-surface: "#fff1f2"
  status-warning: "#d97706"
  status-warning-surface: "#fffbeb"
  ink-vault: "#1e1b4b"
typography:
  display:
    fontFamily: "Poppins, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 4rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Poppins, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Poppins, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.05em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  2xl: "18px"
  3xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    height: "40px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    height: "40px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "24px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "40px"
  badge-status:
    backgroundColor: "{colors.status-positive-surface}"
    textColor: "{colors.status-positive}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
---

# Design System: FinTrack SaaS

## Overview

**Creative North Star: "The Clean Indigo Vault"**

FinTrack's visual identity is a dense, high-contrast financial workspace with a single indigo voice: a light slate canvas, crisp white surfaces, 1px boundaries, and one saturated accent that marks *where the user acts* and *where money is brand-owned*. It is built for Indonesian individuals and freelancers who scan numbers all day, so readability of tabular data outranks decoration. The system rejects warm "SaaS-cream" neutrals and ambient-shadow card stacks; depth comes from borders and contrast, and shadows are reserved for state.

The identity is deliberately dual-material. The **operational surface** (dashboard, transactions, statements, receipts) is light, flat, and neutral, with indigo carried only by the active nav item, the primary action, and brand marks. The **vault surface** (login, the investment hero) flips to a deep slate-to-indigo gradient to signal a premium, protected space. Both share one type pairing, one radius scale, and one palette of semantic money colors.

Because the product displays money, color is *meaningful*: emerald reads as gain/verified, rose as loss/error, amber as caution, and indigo as neutral brand action. Those four roles are the only saturated colors, and they never appear as decoration.

**Key Characteristics:**
- Single indigo accent (#4f46e5 / indigo-600) on a slate canvas; indigo never exceeds ~10% of an operational screen.
- Poppins for headings and brand; Inter for all numbers, tables, and body copy.
- Flat-by-default with 1px borders (`slate-200`) as the primary depth cue.
- Semantic money color: emerald (positive), rose (negative), amber (warning).
- One radius ladder driven by the shadcn `--radius` token (10px base, scaling to 18–24px surfaces).
- Immediate in-page skeleton feedback instead of blocking spinners.

## Colors

A light slate neutral foundation with a single indigo accent and three semantic status colors for financial state.

### Primary
- **Clean Indigo** (#4f46e5 / indigo-600): The brand and action color. Used for the primary button, the active/focused nav item, brand marks in the topbar, and focus rings. Darkens to **Deep Indigo** (#4338ca / indigo-700) on hover.
- **Indigo Tint Surface** (#eef2ff / indigo-50): The resting background of an active navigation item and soft selected states. Always paired with indigo-700 text, never used as a page background.

### Neutral
- **Cool Canvas** (#f8fafc / slate-50): The dashboard application background; the plane everything floats above.
- **Pure Surface** (#ffffff): Cards, panels, topbar, sidebar, and all resting containers.
- **Deep Slate Ink** (#0f172a / slate-900): Primary headings and the highest-emphasis text.
- **Slate Body** (#334155 / slate-700): Default body copy and form labels.
- **Muted Slate** (#64748b / slate-500): Secondary text, inactive nav, placeholders, and units.
- **Hairline Border** (#e2e8f0 / slate-200): All container, input, and divider boundaries.
- **Subtle Divider** (#f1f5f9 / slate-100): Internal separators inside cards and lists.

### Semantic Money Colors
- **Gain Emerald** (#059669 text / #ecfdf5 surface): Positive deltas, verified state, connected account chips. Text uses emerald-600/700; surface uses emerald-50 with an emerald-100 border.
- **Loss Rose** (#e11d48 text / #fff1f2 surface): Negative deltas, validation errors, destructive confirmations. Errors render at rose-500 for small field text.
- **Caution Amber** (#d97706 text / #fffbeb surface): Pending or warning states.
- **Vault Ink** (#1e1b4b / indigo-950): The dark end of the login and investment gradient surfaces.

### Named Rules
**The One Indigo Voice Rule.** Indigo (#4f46e5) is the only saturated brand color and appears on ≤10% of any operational screen: the primary action, the active nav item, and brand marks. Everything else is slate, white, or a semantic status color. Its rarity is what makes it read as "the thing to click."

**The Money-Is-Not-Decoration Rule.** Emerald, rose, and amber exist only to encode financial state (gain/loss/warning). They never appear as arbitrary fills, backgrounds, or accent flourishes.

## Typography

**Display / Heading Font:** Poppins (with sans-serif fallback), exposed as `--font-poppins` and applied via the `font-poppins` utility.
**Body / Numeric Font:** Inter (with sans-serif fallback), exposed as `--font-sans` and applied to `<html>` so it is the default.

**Character:** Poppins' geometric roundness gives brand and headings a confident, structured voice, while Inter's neutral, tabular-friendly letterforms keep dense cash-flow tables legible. The two are strictly separated: Poppins never sets numbers, Inter never sets the brand.

### Hierarchy
- **Display** (Bold 700, clamp(2.5rem, 6vw, 4rem), 1.1): Reserved for hero brand statements such as the login "Private Vault" title. Letter-spacing floor is -0.02em.
- **Headline** (Bold 700, 1.5rem, tracking-tight): Every route's page title ("Dashboard Overview", "Arus Kas", "Bank Statements"), always with `font-poppins`.
- **Title** (SemiBold 600, 1rem, 1.3): Card titles and dialog headers, set with `font-heading`.
- **Body** (Regular 400, 0.875rem, 1.5): Prose, form fields, and transaction table cells. All currency is formatted through `Intl.NumberFormat('id-ID')`.
- **Label** (SemiBold 600, 0.75rem, 0.05em, uppercase): Table headers, section kickers ("Informasi Utama", "Detail Pembayaran"), and field labels.

### Named Rules
**The Numbers-Are-Inter Rule.** Every monetary value, percentage, and tabular cell uses Inter (and `font-mono` for aligned figures where columns must line up). Poppins is forbidden in any numeric context.

**The Poppins-Headings Rule.** All page and card headings opt in explicitly with the `font-poppins` (or `font-heading`) utility; body text inherits Inter from `<html>` and never needs a font class.

## Layout

The application canvas is a full-viewport flex column (`100dvh`, `overflow-hidden`) with a fixed 56px topbar, a left sidebar (80px collapsed / 256px expanded at `lg`), a scrollable main region capped at `max-w-6xl` centered, and a 64px bottom nav shown only below `md`. Main content pads `16px` on mobile and `32px` on desktop, with vertical rhythm delivered by an `space-y-6`/`space-y-8` stack.

Content is organized on a 12-column-feeling responsive grid: dashboard sections pair into `xl:grid-cols-2`, and dense tables scroll horizontally inside a `w-full overflow-x-auto` container rather than compressing. Page headers are a `flex` row that stacks on mobile and splits (title left, primary action right) from `sm` up. The `max-w-6xl` cap keeps line lengths and tables from stretching on ultrawide monitors. Sidebar and bottom-nav states are driven by a shared navigation context so desktop and mobile stay in sync.

## Elevation & Depth

FinTrack is **flat by default**. Resting cards and panels carry no ambient shadow; depth is established by the slate-50 canvas sitting behind white surfaces and by 1px `slate-200` borders. Shadows communicate *state*, not hierarchy, so they appear only on hover, on floating overlays (dialogs, popovers, dropdowns), and on the bottom nav's top edge.

### Shadow Vocabulary
- **Interactive rise** (`shadow-sm`): Subtle lift on hovered cards (`border-slate-200`) and the active sidebar item.
- **Primary action** (`shadow-md shadow-indigo-200`): Under the indigo primary button to seat it above the plane.
- **Floating overlay** (`shadow-xl` / `shadow-2xl`): Dialogs, the login card, and the dark investment hero. The login card pairs it with `backdrop-blur-xl` on a translucent `slate-950/80`.
- **Bottom nav edge** (`shadow-[0_-4px_10px_rgba(0,0,0,0.05)]`): An upward-only shadow marking the fixed mobile nav from content.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. A shadow is only legitimate as a response to state (hover, focus, overlay, elevation), never as a resting decoration on a standard card.

**The No-Ghost-Card Rule.** A resting card never combines a 1px border with a large blurred shadow. Boundary *or* float — not both.

## Shapes

The form language is softly rounded and tuned by a single token, `--radius: 0.625rem` (10px), from which the whole ladder derives: `rounded-lg` ≈ 10px for compact controls, `rounded-xl` ≈ 14px for cards and nav items, and `rounded-2xl` ≈ 18px for buttons, inputs, hero panels, and skeletons. Larger surfaces (dialogs, the login card, receipt dialogs) reach `rounded-3xl`/`rounded-[min(var(--radius-4xl),24px)]` ≈ 24px. Pill shapes are reserved for badges, status chips, and the account pill. Borders are always a solid 1px in `slate-200` (or `ring-1 ring-foreground/10` on shadcn primitives); dashed 1px `slate-200` denotes empty/drop-zone states.

### Named Rules
**The Ladder Rule.** Radius is never hand-picked per component. It is chosen from the `--radius`-derived ladder (lg / xl / 2xl / 3xl) so every surface stays in one family.

**The Capsule Exception.** `rounded-full` is permitted only on badges, status chips, and circular avatars/icons; it is never used for buttons, cards, or inputs.

## Components

For each component: character line, then shape, color, states, and distinctive behavior.

### Buttons
- **Shape:** Softly rounded (`rounded-md`, ~8px) at ~40px height for standard actions; legacy shell actions use `rounded-xl` (~14px).
- **Primary:** Clean Indigo (#4f46e5) with white text, `h-10 px-4 py-2`, seated by `shadow-md shadow-indigo-200`; hover darkens to indigo-700 (#4338ca).
- **Ghost / Icon:** Transparent with `slate-400` icon, brightening to `slate-600` on hover (topbar logout, dialog close at top-right on a `bg-secondary` chip).
- **Destructive:** Rose treatment (`text-rose-600 hover:bg-rose-50`) for row-level delete affordances.
- **States:** `focus-visible:ring-2 ring-ring`, `active:translate-y-px`, `disabled:opacity-50 pointer-events-none`. The shadcn primitive adds `focus-visible:ring-3 ring-ring/30`.

### Badges / Status Chips
- **Style:** `rounded-full`, `px-2.5 py-0.5`, `text-xs font-semibold`. Default is indigo-on-white or indigo/20 on dark; status variants use emerald/rose/amber surfaces with matching borders.
- **Use:** Activation/account pills, gain-loss deltas, category tags.

### Cards / Containers
- **Corner Style:** `rounded-xl` (~14px), rising to `rounded-2xl`/`rounded-3xl` for heroes and dialogs.
- **Background:** Pure white (`bg-card`/`bg-white`); the investment hero uses a slate-900→indigo-950 gradient.
- **Border:** 1px `slate-200` (`border-slate-200`) or `ring-1 ring-foreground/10` on shadcn primitives.
- **Shadow Strategy:** Flat at rest; `shadow-sm` on hover (see Elevation).
- **Internal Padding:** `24px` desktop / `16px` compact, or the shadcn `--card-spacing` (16px, 12px for `size="sm"`).

### Inputs / Fields
- **Style:** 1px `slate-200` border, white background, `rounded-lg`/`rounded-md`, `h-10 px-3 text-sm`. shadcn inputs use `h-8 rounded-2xl` with a translucent `bg-input/50`.
- **Focus:** Border shifts to indigo-500 with a soft ring (`ring-2 ring-indigo-500/20`), or `ring-3 ring-ring/30` on the shadcn primitive.
- **Error:** Rose border + `text-[11px] text-rose-500` message directly beneath the field; `aria-invalid` drives the rose ring on shadcn inputs.
- **Placeholder:** `text-muted-foreground` at ≥4.5:1 contrast.

### Navigation
- **Desktop sidebar:** White, `border-r border-slate-200`, 80px collapsed / 256px expanded. Items are `rounded-xl px-4 py-3 text-sm font-bold`; active is `bg-indigo-50 text-indigo-700 shadow-sm`, inactive is `text-slate-500 hover:bg-slate-50 hover:text-slate-700`. Icons are `w-5 h-5` (`slate-400`, indigo-600 when active), hidden labels below `lg`.
- **Topbar:** 56px white bar, `border-b border-slate-200`; brand lockup is a `bg-indigo-600` rounded icon chip plus Poppins wordmark with an italic indigo "SaaS"; account state is an emerald pill.
- **Mobile bottom nav:** Fixed 64px, `border-t border-slate-200`, upward shadow, 5 items with 10px labels; active is `text-indigo-700`/icon indigo-600. Respects `env(safe-area-inset-bottom)`.

### Loading Skeletons (signature)
- **Style:** `animate-pulse`, `bg-muted`/`bg-slate-200`, `rounded-2xl`, mirroring the real content's layout (topbar lockup, sidebar rail, breadcrumb, cards, transaction rows) so there is no layout shift.
- **Role:** Replaces blocking spinners. Every async route ships a matching `loading.tsx` skeleton; reduced-motion users get a static placeholder instead of the pulse.

## Do's and Don'ts

### Do:
- **Do** format all currency via `Intl.NumberFormat('id-ID')` with the rupiah symbol and correct thousands separators.
- **Do** set every page/card heading in Poppins (`font-poppins`/`font-heading`) and leave body/numeric text in Inter.
- **Do** build depth from a 1px `slate-200` border on a `slate-50` canvas; add a shadow only for hover, focus, or overlay.
- **Do** keep indigo to ≤10% of an operational screen: primary action + active nav + brand mark.
- **Do** pick radii from the `--radius` ladder (`rounded-lg`→`3xl`), not ad hoc values.
- **Do** ship a layout-matching `animate-pulse` skeleton for every async route, and honor reduced-motion.
- **Do** use emerald/rose/amber strictly to encode gain, loss, and warning.

### Don't:
- **Don't** use warm neutral/beige "SaaS-cream" backgrounds; the neutral ramp is cool slate.
- **Don't** apply a large blurred shadow to a resting bordered card (no ghost cards).
- **Don't** use `#4f46e5` hex directly — emit it through the token (indigo-600) so dark-mode and theming stay viable.
- **Don't** set numbers or table cells in Poppins, and don't set the brand in Inter.
- **Don't** use gradient text (`background-clip: text`) for headings.
- **Don't** round buttons, cards, or inputs to full pills; pills are for badges and status chips only.
- **Don't** use saturated status colors as decorative fills or backgrounds.
- **Don't** let table text overflow its cell; use truncation with a tooltip for long values.
- **Don't** replace in-page skeletons with a blocking full-screen spinner.
