ALTER TABLE public.bank_statement_items
ADD COLUMN balance NUMERIC;

COMMENT ON COLUMN public.bank_statement_items.balance IS 'Running balance after this transaction';
