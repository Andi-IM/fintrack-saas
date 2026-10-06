-- ==============================================================================
-- Migration: Create cash_wallets table for physical cash tracking
-- Description:
--   Introduces a first-class entity for cash on hand. Each wallet stores a
--   user-chosen name, currency, and an explicit opening_balance (cash held when
--   the wallet was created). The current balance is DERIVED in the application
--   as: opening_balance + sum(cash_flow.income) - sum(cash_flow.expense) where
--   payment_method matches the wallet name and date >= wallet.created_at.
--   See ADR-087.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE public.cash_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'IDR',
    opening_balance NUMERIC(20, 2) NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, name)
);

CREATE INDEX idx_cash_wallets_user ON public.cash_wallets(user_id);

-- Row Level Security
ALTER TABLE public.cash_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cash wallets" ON public.cash_wallets
    FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own cash wallets" ON public.cash_wallets
    FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own cash wallets" ON public.cash_wallets
    FOR UPDATE USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own cash wallets" ON public.cash_wallets
    FOR DELETE USING (user_id = (SELECT auth.uid()));

-- Auto-fill user_id on insert (reuses the shared trigger function)
CREATE TRIGGER trg_set_user_id_cash_wallets
    BEFORE INSERT ON public.cash_wallets
    FOR EACH ROW EXECUTE FUNCTION private.set_user_id();

-- Maintain updated_at
CREATE TRIGGER update_cash_wallets_updated_at
    BEFORE UPDATE ON public.cash_wallets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
