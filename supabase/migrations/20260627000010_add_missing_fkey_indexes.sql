-- Migration: Add missing covering indexes for foreign keys
-- This fixes the 'Unindexed foreign keys' warning in the Supabase linter
-- and improves performance on joins and cascading deletes.

-- 1. bank_statement_items.statement_id
-- Constraint: bank_statement_items_statement_id_fkey
CREATE INDEX IF NOT EXISTS idx_bank_statement_items_statement_id 
ON public.bank_statement_items(statement_id);

-- 2. bank_statement_items.cash_flow_id (formerly transaction_id)
-- Constraint: bank_statement_items_transaction_id_fkey
CREATE INDEX IF NOT EXISTS idx_bank_statement_items_cash_flow_id 
ON public.bank_statement_items(cash_flow_id);

-- 3. cash_flow.receipt_id
-- Constraint: cash_flow_receipt_id_fkey
CREATE INDEX IF NOT EXISTS idx_cash_flow_receipt_id 
ON public.cash_flow(receipt_id);

-- 4. cash_flow.source_item_id
-- Constraint: transactions_source_item_id_fkey (from before table was renamed)
CREATE INDEX IF NOT EXISTS idx_cash_flow_source_item_id 
ON public.cash_flow(source_item_id);

-- 5. receipts.bank_statement_item_id
-- Constraint: receipts_bank_statement_item_id_fkey
CREATE INDEX IF NOT EXISTS idx_receipts_bank_statement_item_id 
ON public.receipts(bank_statement_item_id);

-- 6. receipts_items.receipt_id
-- Constraint: receipts_items_receipt_id_fkey
CREATE INDEX IF NOT EXISTS idx_receipts_items_receipt_id 
ON public.receipts_items(receipt_id);
