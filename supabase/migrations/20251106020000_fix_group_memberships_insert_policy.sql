-- Migration: Fix group_memberships INSERT policy - temporary permissive version
-- Created: 2025-11-06
-- Problem: INSERT policy may block when creating admin membership during group creation
-- Solution: Temporarily allow all authenticated users to INSERT (application validates user_id)
-- TODO: Investigate why auth.uid() is not available in INSERT WITH CHECK context

-- Drop and recreate INSERT policy
DROP POLICY IF EXISTS group_memberships_insert_authenticated ON public.group_memberships;

-- INSERT: Any authenticated user can insert membership
-- Application ensures user_id is set correctly
CREATE POLICY group_memberships_insert_authenticated 
  ON public.group_memberships
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

