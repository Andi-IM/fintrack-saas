# ADR-023: Support ATM Receipts in Receipts Table

## Status

Accepted

## Context

Receipts uploaded by users can represent either retail shopping receipts (*resit belanja*) or bank ATM receipts (*resit atm* - penarikan, setor tunai, transfer). We need to support both types of receipts in our database schema while maintaining a clean structure, easy querying, and backward compatibility.

## Decision

We will use the **Single Table Inheritance (STI)** pattern to represent both receipt types in the existing `receipts` table. 

We will apply the following database changes:
1. Add a `type` column to the `receipts` table, default to `'shopping'`, with a check constraint: `'shopping' | 'atm'`.
2. Add nullable columns specific to ATM receipts:
   - `atm_id` (TEXT)
   - `transaction_type` (TEXT with check constraint: `'withdrawal' | 'deposit' | 'transfer'`)
   - `fee` (NUMERIC)

### Field Mapping
- **For Shopping Receipts (`type = 'shopping'`)**:
  - Columns `store_name`, `store_address`, `date`, `total_price`, `payment_method`, `amount_paid`, and `change` function as normal.
  - Child table `receipts_items` contains the list of purchased products.
- **For ATM Receipts (`type = 'atm'`)**:
  - `store_name` stores the Bank Name (e.g., "ATM Bank Mandiri").
  - `store_address` stores the ATM Location/Address.
  - `total_price` stores the transaction amount (withdrawn, deposited, or transferred).
  - `atm_id` stores the terminal ID.
  - `transaction_type` stores `'withdrawal'`, `'deposit'`, or `'transfer'`.
  - `fee` stores the transaction fee.
  - Child table `receipts_items` is left empty.

A new migration `20260611035411_add_atm_receipts_support.sql` has been created and applied.

## Alternatives Considered

- **Class Table Inheritance (Separate Tables)**: Keeping a base `receipts` table and creating child `shopping_receipts` and `atm_receipts` tables. Rejected because it introduces query complexity (requires multiple joins to show a list of receipts) and increases the number of database objects to maintain.
- **JSONB Details Column**: Storing type-specific fields in a single `details` JSONB column. Rejected because it sacrifices SQL-level type safety, constraints, and ease of indexing/aggregating on key columns (such as transaction type or fees).

## Consequences

- **Good**: Unified listing of all receipts with simple queries.
- **Good**: Full backward compatibility (existing records default to `'shopping'`).
- **Good**: Clear separation of items; ATM receipts do not contain rows in `receipts_items`.
- **Trade-off**: The main `receipts` table will contain columns that are nullable and specific only to one type of receipt.
