# ADR-002: Recording Cash Payment Details and Receipt Line Items Structure

## Status
Accepted

## Supersedes
None

## Context
The receipt scanning feature previously could only capture the total expense value and pre-fill a single category (single-entry total). In real-world scenarios (e.g., supermarkets), a single receipt often contains various item categories (groceries, toiletries), and when paid with Cash, there are concepts like cash handed over (Cash Paid) and change received (Change). Transactions that do not record change result in inaccurate tracking of physical cash circulation.

## Decision
Expand the standard transaction form structure and *receipt data extraction* results to accommodate:
1. `items`: An array displaying specific item details (Line Items) that can be edited. The total nominal amount will automatically accumulate from these items if they exist.
2. `paymentMethod`, `cashPaid`, `change`: Conditional fields specific to the cash payment method that intuitively calculate the estimated change/remaining money based on the cash handed over.

## Alternatives Considered
- **Splitting Transactions**: Forcing each item on the receipt to be recorded as a separate transaction entity in the database table. Rejected because users generally view 1 physical shopping receipt as 1 historical record ("Grocery Run").

## Consequences
- **Positive**: High flexibility resulting in rich financial records that closely reflect reality.
- **Positive**: Facilitates a predictive wallet balance correction/audit system when the "Cash" option is selected.
- **Trade-off**: Increases the `Transaction` payload structure per data entry, but this is handled by making them *optional* fields so that simple historical data can still coexist without breaking.

## Related Notes
- See the `Transaction` structure and automatic change calculation logic inside `handleManualAddSubmit` in `FinanceTracker.tsx`.
