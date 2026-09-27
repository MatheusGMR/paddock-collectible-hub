REVOKE EXECUTE ON FUNCTION public.get_admin_kpis(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_marketplace_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_push_audience(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_push_audience(jsonb) TO service_role;
REVOKE EXECUTE ON FUNCTION public.mark_push_clicked(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_push_clicked(uuid) TO authenticated;