ALTER TABLE public.bank_statements
ADD COLUMN opening_balance NUMERIC DEFAULT 0,
ADD COLUMN closing_balance NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.bank_statements.opening_balance IS 'Saldo awal (Initial balance)';
COMMENT ON COLUMN public.bank_statements.closing_balance IS 'Saldo akhir (Final balance)';
;
