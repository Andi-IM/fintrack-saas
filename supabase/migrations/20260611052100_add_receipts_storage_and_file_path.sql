ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS file_path TEXT;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true) 
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow uploads to receipts bucket" ON storage.objects
    FOR INSERT TO public WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Allow reads from receipts bucket" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'receipts');

CREATE POLICY "Allow deletes from receipts bucket" ON storage.objects
    FOR DELETE TO public USING (bucket_id = 'receipts');
