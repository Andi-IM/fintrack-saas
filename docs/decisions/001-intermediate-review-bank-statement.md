# ADR-001: Implementation of Intermediate Review Table for Bank Statement Extraction

## Status
Accepted

## Supersedes
None

## Context
The Finance Tracker application allows users to upload bank statement screenshots to be extracted into transactions. Previously, LLM extraction results went directly into a single-entry form that only supported one transaction direction (Income or Expense). This caused a fundamental issue when a bank statement contained mixed-direction transactions (e.g., an incoming salary credit and an outgoing payment debit on the same page). Furthermore, because it was processed all at once, users could not review and revise OCR/LLM mistakes before the data entered the database.

## Decision
Add an exclusive *intermediate review table workflow* for bank statement imports. Extraction results from one or multiple files will be merged into state memory and rendered in an independent interactive table. In this stage, each transaction row has its own type (Income/Expense), description, date, and category.

## Alternatives Considered
- **Modifying the Main Single-Entry Form**: Changing the daily manual form to accept *array input* formats. Rejected because it would make the daily manual input experience noisy and complex.
- **Auto-import with Later Edit**: Saving all LLM prediction results directly (auto-commit), then asking the user to check the dashboard. Rejected because it makes it difficult to track which transactions are "drafts" and risks polluting real financial data.

## Consequences
- **Positive**: Users can quickly correct the *direction* (IN/OUT) if the LLM guesses the bank statement content incorrectly.
- **Positive**: Accommodates *mixed-direction transactions* so that importing multiple files can be processed smoothly.
- **Trade-off**: Adds one extra screen to the user flow for bank statements (Upload -> Review -> Import).
- **Implementation Implication**: The frontend needs to hold a temporary `bankStatementReview` state.

## Related Notes
- See the `FinanceTracker.tsx` component for the implementation of the `bankStatementReview` tab and the `<Table>` component.
