-- Remove reference_number column from public.receipts table
-- Keeping bank_statement_item_id as the primary link to transactions
ALTER TABLE public.receipts 
DROP COLUMN IF EXISTS reference_number;
