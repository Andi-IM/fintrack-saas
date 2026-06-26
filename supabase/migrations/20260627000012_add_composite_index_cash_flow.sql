-- Migration: Add composite index for dashboard query optimization
-- The dashboard frequently queries: 
-- SELECT * FROM cash_flow WHERE user_id = auth.uid() ORDER BY date DESC
-- This composite index eliminates the need for an in-memory sort 
-- and speeds up the query significantly.

CREATE INDEX IF NOT EXISTS idx_cash_flow_user_id_date 
ON public.cash_flow (user_id, date DESC);
