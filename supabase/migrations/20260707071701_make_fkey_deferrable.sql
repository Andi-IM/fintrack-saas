-- Make transactions_source_item_id_fkey deferrable to allow before insert triggers to sync cash_flow
ALTER TABLE public.cash_flow
  DROP CONSTRAINT IF EXISTS transactions_source_item_id_fkey,
  ADD CONSTRAINT transactions_source_item_id_fkey FOREIGN KEY (source_item_id) REFERENCES public.bank_statement_items(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
