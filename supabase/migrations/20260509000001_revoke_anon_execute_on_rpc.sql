-- Revoke EXECUTE from PUBLIC and anon on all SECURITY DEFINER functions.
-- These functions perform auth checks internally via auth.uid(),
-- but unauthenticated users should not even be able to invoke them.
-- Authenticated users retain EXECUTE permission.

DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN
    SELECT p.proname::text AS name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC;',
                   func_record.name, func_record.args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon;',
                   func_record.name, func_record.args);
  END LOOP;
END $$;
