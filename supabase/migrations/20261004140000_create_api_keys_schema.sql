-- Create API Keys table for scoped authentication (browser extension, automated ingestion)
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'Browser Extension Sync',
    key_hash VARCHAR(64) NOT NULL UNIQUE,       -- SHA-256 hex digest
    key_prefix VARCHAR(16) NOT NULL,            -- e.g. "ft_sync_7e8d..." for identification
    scopes TEXT[] NOT NULL DEFAULT ARRAY['investments:sync'],
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance and lookup indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON public.api_keys(user_id);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own api keys" ON public.api_keys;
CREATE POLICY "Users can view own api keys" ON public.api_keys
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own api keys" ON public.api_keys;
CREATE POLICY "Users can insert own api keys" ON public.api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own api keys" ON public.api_keys;
CREATE POLICY "Users can update own api keys" ON public.api_keys
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own api keys" ON public.api_keys;
CREATE POLICY "Users can delete own api keys" ON public.api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- Atomic verification & usage function running with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.verify_and_use_api_key(
    p_key_hash TEXT,
    p_required_scope TEXT
)
RETURNS TABLE (
    valid BOOLEAN,
    user_id UUID,
    key_id UUID,
    name VARCHAR(100)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_record RECORD;
BEGIN
    SELECT k.id, k.user_id, k.name, k.scopes, k.is_active, k.expires_at
    INTO v_record
    FROM public.api_keys k
    WHERE k.key_hash = p_key_hash
      AND k.is_active = true
      AND (k.expires_at IS NULL OR k.expires_at > now())
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::VARCHAR(100);
        RETURN;
    END IF;

    -- Validate scope
    IF NOT (p_required_scope = ANY(v_record.scopes)) THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::VARCHAR(100);
        RETURN;
    END IF;

    -- Update last_used_at atomically
    UPDATE public.api_keys
    SET last_used_at = now(), updated_at = now()
    WHERE id = v_record.id;

    RETURN QUERY SELECT true, v_record.user_id, v_record.id, v_record.name;
END;
$$;

-- Grant execution to anon, authenticated, and service_role
GRANT EXECUTE ON FUNCTION public.verify_and_use_api_key(TEXT, TEXT) TO anon, authenticated, service_role;
