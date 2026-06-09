-- Create bank_statements table
CREATE TABLE IF NOT EXISTS public.bank_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    bank_name TEXT NOT NULL,
    statement_period TEXT NOT NULL,
    file_path TEXT NOT NULL,
    total_items INTEGER DEFAULT 0,
    metadata JSONB
);

-- Enable RLS for bank_statements
ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;

-- Create bank_statement_items table
CREATE TABLE IF NOT EXISTS public.bank_statement_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id UUID REFERENCES public.bank_statements(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    type TEXT CHECK (type IN ('income', 'expense')),
    category TEXT,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    metadata JSONB
);

-- Enable RLS for bank_statement_items
ALTER TABLE public.bank_statement_items ENABLE ROW LEVEL SECURITY;

-- Add source_item_id to transactions for bidirectional linking
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS source_item_id UUID REFERENCES public.bank_statement_items(id) ON DELETE SET NULL;

-- Add basic RLS policies
-- Note: In a production environment with auth, these should be restricted to authenticated users or specific user_ids
CREATE POLICY "Enable read access for all users" ON public.bank_statements FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.bank_statements FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON public.bank_statement_items FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.bank_statement_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.bank_statement_items FOR UPDATE USING (true);
;
