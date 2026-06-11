-- Create receipts table
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    store_name TEXT NOT NULL,
    store_address TEXT,
    date TIMESTAMPTZ NOT NULL,
    total_price NUMERIC NOT NULL,
    payment_method TEXT,
    amount_paid NUMERIC,
    change NUMERIC
);

-- Enable RLS
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Allow public access
CREATE POLICY "Allow public access" ON public.receipts
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create receipts_items table
CREATE TABLE IF NOT EXISTS public.receipts_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    price NUMERIC NOT NULL
);

-- Enable RLS
ALTER TABLE public.receipts_items ENABLE ROW LEVEL SECURITY;

-- Allow public access
CREATE POLICY "Allow public access" ON public.receipts_items
    FOR ALL
    USING (true)
    WITH CHECK (true);
