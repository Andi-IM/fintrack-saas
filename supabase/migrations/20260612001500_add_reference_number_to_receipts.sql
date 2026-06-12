-- Add reference_number and bank_statement_item_id columns to public.receipts table
ALTER TABLE public.receipts 
ADD COLUMN IF NOT EXISTS reference_number TEXT,
ADD COLUMN IF NOT EXISTS bank_statement_item_id UUID REFERENCES public.bank_statement_items(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.receipts.reference_number IS 'Reference number of the transaction (e.g. from ATM slip or OCR)';
COMMENT ON COLUMN public.receipts.bank_statement_item_id IS 'Direct reference to the matched bank statement item';
