---
timestamp: 2026-06-19T03-08-56Z
slug: frontend-components-transactions-cashflowlist-tsx
---
# Critique Report: Table Elements in Mobile Mode

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Transaction list filters apply instantly via URL query states, but active date filter clears lack clear action indicators on small screens. |
| 2 | Match System / Real World | 4/4 | High trust in formatting. Uses localized IDR currency notation and Indonesian labels (`Riwayat Arus Kas`, `Nominal`, `Aksi`) correctly. |
| 3 | User Control and Freedom | 1/4 | **No vertical/horizontal scroll wraps or mobile card fallback in CashFlowList and BankStatementList.** Columns cut off, and actions inside row hovers become completely inaccessible on mobile. |
| 4 | Consistency and Standards | 2/4 | `ReceiptList` uses card layouts on mobile (`md:hidden`) and a table on desktop. However, `CashFlowList` and `BankStatementList` keep the exact same desktop layout structures, breaking alignment across pages. |
| 5 | Error Prevention | 3/4 | Filters are dropdowns/ranges preventing invalid input. Destructive deletions ask for confirmation, though standard inline tooltips are truncated. |
| 6 | Recognition Rather Than Recall | 2/4 | Hover-only action buttons (`opacity-0 group-hover:opacity-100`) make it impossible to see or click edit/delete triggers on touch viewports without guesswork. |
| 7 | Flexibility and Efficiency | 1/4 | Total lack of mobile accelerators. No sweep gestures to delete, and table rows are too dense for precise finger targeting. |
| 8 | Aesthetic and Minimalist Design | 2/4 | Visual density is high, but horizontal scroll clipping and overlapping columns force significant cognitive overload and messy layout breaks on small viewports. |
| 9 | Error Recovery | 3/4 | Quick filter clearing is available via "Bersihkan Filter". Form edit pages preserve ID state on router back-nav. |
| 10 | Help and Documentation | 2/4 | Tooltips explaining Mutasi vs. Resit indicators (`title="..."` attribute) are completely inaccessible to mobile touch gestures. |
| **Total** | | **23/40** | **Acceptable (Significant improvements needed before users are happy)** |

---

## Anti-Patterns Verdict

### LLM Assessment
The mobile display of tabular components suffers from high layout brittleness:
1. **Desktop-First Structure Leak:** While `ReceiptList` correctly implements a dual-layout strategy (switching to clean cards on `< 768px` viewports), both `CashFlowList` and `BankStatementList` rely on raw `<Table>` structures wrapped in `overflow-hidden` blocks. This forces the viewport to clip content or stack lines unpredictably.
2. **Hover-Activated Triggers on Touch:** Table row actions (Edit, Delete) in `CashFlowList` are gated behind CSS hover rules (`group-hover:opacity-100`). Since touch screens have no true hover state, these essential buttons are initially invisible and require random taps to appear.
3. **Severe Density Compression:** Hardcoded cell widths (`min-w-[300px]` for descriptions) combined with high-contrast text force the columns to squeeze together, causing extreme wrap spikes that balloon row heights on small screens.

### Deterministic Scan
The CLI detector identified **7 warnings** across the audited files:
* **Gray text on colored background (`gray-on-color`)**:
  - `CashFlowList.tsx` (Lines 410, 413): Action buttons use `text-slate-400` inside hovered backgrounds like `bg-indigo-50` and `bg-rose-50`, violating contrast guidelines on tinted backgrounds.
  - `ReceiptList.tsx` (Lines 219, 295) and `BankStatementList.tsx` (Lines 293, 304): Identical patterns with neutral slate text overlaid on colored button actions.
* **AI color palette tell (`ai-color-palette`)**:
  - `ReceiptList.tsx` (Line 318): Detection of indigo-based text gradients or AI scaffolding cues in action wrappers.

---

## Overall Impression
The desktop layouts of the financial tables are clean, structured, and professional. However, on mobile viewports, the tables completely fall apart. While `ReceiptList` makes a solid attempt at a mobile card layout, `CashFlowList` and `BankStatementList` are completely broken on mobile because they force desktop tables onto tiny screens. Re-architecting these to follow a responsive card pattern is the single biggest usability opportunity.

---

## What's Working
1. **Localized Financial Language:** Excellent implementation of `id-ID` formatting rules and local currency symbols, building trust.
2. **Synchronized Query States:** URL query synchronization via `nuqs` keeps filters, searches, and paginated states resilient to browser back/forward and app restarts.

---

## Priority Issues

### [P0] Clipped / Broken Desktop Tables on Mobile Viewports
* **Why it matters:** On screens `< 768px`, the `overflow-hidden` containers on `CashFlowList` and `BankStatementList` tables cut off columns. Users cannot read transaction descriptions or reach edit/delete actions.
* **Fix:** Convert desktop tables to clean, single-column responsive list cards on mobile viewports using CSS media queries or React utilities (e.g., `md:hidden` / `hidden md:table-row-group`), mirroring the pattern used in `ReceiptList.tsx`.
* **Suggested command:** `$impeccable adapt`

### [P1] Inaccessible Hover-Gated Action Controls
* **Why it matters:** Gating action buttons (Edit/Delete) behind `group-hover:opacity-100` makes them invisible and unresponsive on mobile touch targets.
* **Fix:** Remove the opacity gate on mobile screens (`opacity-100 md:opacity-0 md:group-hover:opacity-100`) or replace them with a mobile-friendly touch toggle (e.g., swipe action or a bottom sheet menu trigger).
* **Suggested command:** `$impeccable layout`

### [P1] Low Contrast Button Labels ("Gray-on-Color")
* **Why it matters:** Slate grey text (`text-slate-400`) on tinted buttons (`bg-indigo-50` / `bg-rose-50`) fails contrast checks, making editing and deleting transactions highly frustrating for low-vision or outdoors users.
* **Fix:** Swap out the faded neutral slate coloring for a higher-contrast dark variant of the parent tint (e.g., `text-indigo-600` on `bg-indigo-50`, `text-rose-600` on `bg-rose-50`).
* **Suggested command:** `$impeccable colorize`

### [P2] Inaccessible HTML Desktop Title Tooltips
* **Why it matters:** Extra transaction markers like "Resit" and "Mutasi" rely on native HTML `title` attributes for explanation. Hover titles do not render on mobile touch interactions, hiding contextual details.
* **Fix:** Replace title tooltips with accessible tap-to-reveal tooltips or incorporate text descriptors directly into the mobile card list view.
* **Suggested command:** `$impeccable polish`

---

## Persona Red Flags

### Alex (Power User)
* **Red Flag - Inefficient Batch Actions on Mobile:** When reviewing bulk statements in `BankStatementList`, Alex must click each bank item, drill down into statements, and edit transactions one-by-one. The desktop table demands high precision, and there is no swipe-to-edit or batch classification on mobile.
* **Abandonment Risk:** High when attempting to reconcile statements on the road.

### Casey (Distracted Mobile User)
* **Red Flag - Blocked Interactive Targets:** While trying to quickly delete an erroneous cash flow entry on a mobile screen, Casey cannot see the delete icon because it requires a desktop hover action to show. When tapped blindly, the spacing is so tight that it triggers the adjacent edit form instead.
* **Abandonment Risk:** Very High due to fat-finger layout misfires and hidden actions.

### Sam (Accessibility-Dependent User)
* **Red Flag - Keyboard Tabbing Trap & Text Contrast:** Tab indexing through transaction rows focuses on invisible elements hidden behind hover states. Additionally, gray-on-indigo text buttons on table entries do not meet contrast minimums.
* **Abandonment Risk:** High due to navigation blocks.

---

## Minor Observations
* Column header styling uses `text-slate-400` on `bg-slate-50` which is border-line readable depending on backlight quality.
* `BankStatementList.tsx` balances use generic `toLocaleString('id-ID')` fallback instead of the standardized helper `formatCurrency`, causing small display discrepancies.

---

## Questions to Consider
* *What if transaction tables were completely hidden on mobile viewports, replaced by a densified activity stream card that exposes edit actions directly via long-press or swiping?*
* *How can we leverage bottom drawer sheets to edit or update records instead of forwarding users to a full-page edit form?*
