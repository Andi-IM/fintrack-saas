CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    type text NOT NULL CHECK (type IN ('income', 'expense')),
    amount numeric NOT NULL,
    category text NOT NULL,
    date date NOT NULL DEFAULT current_date,
    note text,
    "paymentMethod" text,
    "cashPaid" numeric,
    change numeric,
    items jsonb
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Allow public access for now (Development/Prototype phase)
CREATE POLICY "Allow public access" ON public.transactions
    FOR ALL
    USING (true)
    WITH CHECK (true);
;
