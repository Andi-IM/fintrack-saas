# Final Design: Receipts Database Schema for Shopping vs ATM Receipts

We selected **Option 1: Single Table with Type Column** to support both shopping receipts and ATM receipts in a unified data model.

---

## Selected Schema

The `receipts` table has been extended with the following columns:

```sql
ALTER TABLE public.receipts 
ADD COLUMN type TEXT NOT NULL DEFAULT 'shopping' CHECK (type IN ('shopping', 'atm')),
ADD COLUMN atm_id TEXT,
ADD COLUMN transaction_type TEXT CHECK (transaction_type IN ('withdrawal', 'deposit', 'transfer')),
ADD COLUMN fee NUMERIC DEFAULT 0;
```

### Data Mapping

1. **Shopping Receipt (`type = 'shopping'`)**
   - `store_name` = Store Name
   - `store_address` = Store Address
   - `total_price` = Total Price
   - `payment_method` = Payment Method (e.g. Cash, Debit, Credit)
   - `amount_paid` = Total Cash Paid
   - `change` = Cash Change Returned
   - `receipts_items` = Populated with individual product items (product name, quantity, price)

2. **ATM Receipt (`type = 'atm'`)**
   - `store_name` = Bank Name (e.g. "ATM Bank Mandiri")
   - `store_address` = ATM Location/Address
   - `total_price` = Transaction Amount (withdrawn or deposited)
   - `payment_method` = Null
   - `amount_paid` = Null
   - `change` = Null
   - `atm_id` = ATM Terminal ID
   - `transaction_type` = Type of transaction (`withdrawal` / `deposit` / `transfer`)
   - `fee` = Transaction Fee
   - `receipts_items` = Empty (no product items)

---

## Consequences

- **Normalized List**: Allows displaying a unified list of all receipts in the UI, regardless of type, with simple queries.
- **Relational Integrity**: `receipts_items` matches shopping receipts perfectly without polluting ATM receipt views.
- **Backward Compatibility**: Existing database records default to type `'shopping'`.
