---
target: "arus kas di mode tablet breakpoint: 768px"
total_score: 24
p0_count: 1
p1_count: 0
timestamp: 2026-06-21T15-15-19Z
slug: end-features-cash-flow-components-cashflowlist-tsx
---
#### Design Health Score
| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Actions are invisible on touch devices |
| 2 | Match System / Real World | 3 | |
| 3 | User Control and Freedom | 1 | Cannot edit or delete on tablet devices |
| 4 | Consistency and Standards | 3 | |
| 5 | Error Prevention | 3 | |
| 6 | Recognition Rather Than Recall | 2 | Users must guess where buttons are hidden |
| 7 | Flexibility and Efficiency | 1 | Hover states trap mobile/tablet users |
| 8 | Aesthetic and Minimalist Design | 3 | Clean, but overly aggressive hiding |
| 9 | Error Recovery | 3 | |
| 10| Help and Documentation | 3 | |
| **Total** | | **24/40** | **Acceptable (but functionally broken on touch)** |

#### Anti-Patterns Verdict
**LLM assessment**: The table relies on an aggressive "ghost UI" pattern where primary actions (Edit/Delete) are totally invisible (opacity-0) until hovered. This is a classic desktop-centric design flaw that completely breaks the experience on touch devices (like an iPad at 768px) where hover states don't exist. Users are left trapped without the ability to manage their data.

**Deterministic scan**: Detector found 0 rule violations. This highlights that while the code structure is clean, the core UX interaction is broken for touch devices.

#### Overall Impression
The interface looks clean on desktop but fails catastrophically on tablets. Hiding critical actions behind a hover state prioritizes aesthetics over fundamental usability. 

#### What's Working
1. **Responsive Table Breakpoint**: Switching from mobile cards to a data table at 768px is a smart use of screen real estate.
2. **Visual Hierarchy**: The typography and spacing within the table rows are well-structured and easy to scan.

#### Priority Issues
- **[P0] Hover-trapped Actions**: The action buttons (Edit, Delete) in the Desktop View use opacity-0 group-hover:opacity-100. On tablets (768px breakpoint), touch users cannot trigger a hover state, making it impossible to edit or delete transactions. 
  - *Why it matters*: Users are completely blocked from managing their own data on tablet devices.
  - *Fix*: Remove opacity-0 for touch devices using interaction media queries, or make them always visible but slightly muted until hovered.
  - *Suggested command*: $impeccable adapt

- **[P2] Poor Target Affordance**: Even when visible, the action buttons are small (h-8 w-8) and placed close together. On a 768px touch target, this risks misclicks.
  - *Why it matters*: Destructive actions too close to common actions on touch screens cause accidental data loss.
  - *Fix*: Increase button spacing or size for touch targets, or move destructive actions behind a "More options" dropdown.
  - *Suggested command*: $impeccable layout

#### Persona Red Flags
**Casey (Distracted Mobile/Tablet User)**: Casey is using an iPad (768px) to quickly log a transaction. When they make a typo and try to fix it, they cannot find the Edit button because the table hides it entirely. Casey gets frustrated and abandons the app, thinking the data is permanently locked.

**Sam (Accessibility-Dependent User)**: Sam relies on keyboard navigation. If focus states aren't explicitly managed to override the opacity-0, tabbing through the table might focus an invisible button, completely confusing their screen reader flow.

#### Minor Observations
- The table caption says Riwayat arus kas but is visually hidden (sr-only). Consider moving this summary into a visible header.

#### Questions to Consider
- Does hiding the edit/delete buttons truly make the UI cleaner, or does it just create a "treasure hunt" for the user?
