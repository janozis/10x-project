-- Migration: Add debug function to check current role
-- Created: 2025-11-06
-- Purpose: Debug helper to see what role Supabase is using in database context

CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'current_user', current_user,
    'session_user', session_user,
    'auth_uid', auth.uid(),
    'auth_role', auth.role()
  );
$$;

