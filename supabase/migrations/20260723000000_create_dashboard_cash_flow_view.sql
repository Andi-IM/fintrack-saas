-- Create a narrow, RLS-respecting dashboard read model.
-- security_invoker ensures the underlying cash_flow RLS policies are evaluated
-- as the authenticated caller instead of the view owner.

CREATE OR REPLACE VIEW public.dashboard_cash_flow_entries
WITH (security_invoker = true)
AS
SELECT
  id,
  date,
  main_category,
  description,
  income,
  expense,
  payment_method
FROM public.cash_flow;

REVOKE ALL ON public.dashboard_cash_flow_entries FROM anon;
GRANT SELECT ON public.dashboard_cash_flow_entries TO authenticated;
