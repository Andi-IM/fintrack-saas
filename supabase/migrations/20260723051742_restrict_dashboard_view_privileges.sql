-- Restrict dashboard view access to read-only.
-- Supabase default grants can give authenticated broad relation privileges on
-- new public views, so make the intended read-only contract explicit.

REVOKE ALL ON public.dashboard_cash_flow_entries FROM anon;
REVOKE ALL ON public.dashboard_cash_flow_entries FROM authenticated;

GRANT SELECT ON public.dashboard_cash_flow_entries TO authenticated;
