REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

REVOKE EXECUTE ON FUNCTION public.admin_exists() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_exists() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_exists() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO service_role;