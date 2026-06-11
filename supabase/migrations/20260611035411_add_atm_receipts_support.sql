ALTER TABLE public.receipts 
ADD COLUMN type TEXT NOT NULL DEFAULT 'shopping' CHECK (type IN ('shopping', 'atm')),
ADD COLUMN atm_id TEXT,
ADD COLUMN transaction_type TEXT CHECK (transaction_type IN ('withdrawal', 'deposit', 'transfer')),
ADD COLUMN fee NUMERIC DEFAULT 0;
