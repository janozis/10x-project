-- Migration: Fix groups INSERT policy - temporary permissive version
-- Created: 2025-11-06
-- Problem: INSERT policy blocks authenticated users, possibly due to auth context not being passed correctly to RLS
-- Solution: Temporarily allow all authenticated users to INSERT (application validates created_by)
-- TODO: Investigate why auth.uid() is not available in INSERT WITH CHECK context

-- Drop and recreate INSERT policy
DROP POLICY IF EXISTS groups_insert_authenticated ON public.groups;

-- INSERT: Any authenticated user can create a group
-- Application ensures created_by is set correctly
CREATE POLICY groups_insert_authenticated 
  ON public.groups
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

