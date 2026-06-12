-- Refactor transactions table into cash_flow table
-- 1. Rename table
ALTER TABLE public.transactions RENAME TO cash_flow;

-- 2. Rename and Update columns for cash_flow
ALTER TABLE public.cash_flow RENAME COLUMN category TO main_category;
ALTER TABLE public.cash_flow ADD COLUMN sub_category TEXT;
ALTER TABLE public.cash_flow RENAME COLUMN note TO description;
ALTER TABLE public.cash_flow ADD COLUMN income NUMERIC DEFAULT 0;
ALTER TABLE public.cash_flow ADD COLUMN expense NUMERIC DEFAULT 0;
ALTER TABLE public.cash_flow RENAME COLUMN "paymentMethod" TO payment_method;

-- 3. Change date from DATE to TIMESTAMPTZ to support time
ALTER TABLE public.cash_flow ALTER COLUMN date TYPE TIMESTAMPTZ USING date::TIMESTAMPTZ;

-- 4. Add link to receipts
ALTER TABLE public.cash_flow ADD COLUMN receipt_id UUID REFERENCES public.receipts(id) ON DELETE SET NULL;

-- 5. Migrate existing data from (type, amount) to (income, expense)
UPDATE public.cash_flow 
SET income = CASE WHEN type = 'income' THEN amount ELSE 0 END,
    expense = CASE WHEN type = 'expense' THEN amount ELSE 0 END;

-- 6. Drop old columns no longer needed
ALTER TABLE public.cash_flow DROP COLUMN type;
ALTER TABLE public.cash_flow DROP COLUMN amount;
ALTER TABLE public.cash_flow DROP COLUMN "cashPaid";
ALTER TABLE public.cash_flow DROP COLUMN change;
ALTER TABLE public.cash_flow DROP COLUMN items;

-- 7. Update bank_statement_items to reflect the table name change
-- The foreign key constraint itself should automatically follow the table rename in Postgres,
-- but we rename the column for consistency.
ALTER TABLE public.bank_statement_items RENAME COLUMN transaction_id TO cash_flow_id;

-- 8. Add comments for clarity
COMMENT ON TABLE public.cash_flow IS 'Table for manual cash flow entries, linkable to receipts and bank statements.';
COMMENT ON COLUMN public.cash_flow.main_category IS 'Major category for macro financial analysis (e.g. Needs, Wants, Investment)';
COMMENT ON COLUMN public.cash_flow.sub_category IS 'Specific sub-category for detailed tracking';
COMMENT ON COLUMN public.cash_flow.income IS 'Cash inflow amount';
COMMENT ON COLUMN public.cash_flow.expense IS 'Cash outflow amount';
