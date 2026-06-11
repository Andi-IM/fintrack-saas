# ADR-021: Introduce Receipts and Receipt Items Schema

## Status

Accepted

## Context

The application needs to support tracking retail receipts and the specific product items purchased. This includes storing store information (name, address), transaction details (date and time, total price, payment method, amount paid, change), and a list of individual items (product name, quantity, price per item).

To implement this structured data model, we need to create database tables with appropriate constraints, foreign key relationships, and Row Level Security (RLS) policies to allow development access.

## Decision

We will create two new tables in the `public` schema:

1. **`receipts`**
   - `id` (UUID, PRIMARY KEY, default `gen_random_uuid()`)
   - `created_at` (TIMESTAMPTZ, default `now()`)
   - `store_name` (TEXT, NOT NULL)
   - `store_address` (TEXT, nullable)
   - `date` (TIMESTAMPTZ, NOT NULL) - Stores the transaction date and time
   - `total_price` (NUMERIC, NOT NULL) - Aggregated total cost
   - `payment_method` (TEXT, nullable)
   - `amount_paid` (NUMERIC, nullable)
   - `change` (NUMERIC, nullable)

2. **`receipts_items`**
   - `id` (UUID, PRIMARY KEY, default `gen_random_uuid()`)
   - `receipt_id` (UUID, NOT NULL, REFERENCES `receipts(id) ON DELETE CASCADE`) - Links the item to its parent receipt
   - `product_name` (TEXT, NOT NULL)
   - `quantity` (NUMERIC, NOT NULL) - Uses `NUMERIC` to support fractional counts/weights (e.g., kilograms)
   - `price` (NUMERIC, NOT NULL) - Price per unit of the product

Both tables will:
- Have Row Level Security (RLS) enabled.
- Include a public access policy (`"Allow public access"` for all operations) to align with the application's current development/prototype phase.

A new migration `20260611020819_create_receipts_tables.sql` has been created and the tables have been applied directly to the database.

## Alternatives Considered

- **Storing items in a JSONB column in `receipts`**: While simpler to write initially, this approach was rejected because it makes running analytics on specific products (e.g. price trends, product category summaries, or item-level search) much more complex and less performant in SQL. A normalized relational model provides better query flexibility.

## Consequences

- **Good**: Clean relational structure that supports complex queries and indexing on individual products.
- **Good**: Automatically deletes all associated `receipts_items` when a parent `receipt` is deleted via `ON DELETE CASCADE`.
- **Good**: Support for fractional quantities allows correct tracking of items priced by weight (e.g. groceries).
- **Trade-off**: Querying a full receipt requires joining two tables, but this is a standard relational database operation and is highly optimized.
