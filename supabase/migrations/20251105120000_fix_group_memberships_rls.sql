-- Migration: Fix RLS policies for group_memberships
-- Created: 2025-11-05
-- Purpose: Fix all RLS policies to properly handle auth.uid()
-- Problem: Previous policies had issues with auth.uid() context, causing 500 errors for authenticated users
-- Solution: Use subquery pattern (SELECT auth.uid()) which works reliably in RLS context

-- Drop all existing policies for group_memberships
DROP POLICY IF EXISTS group_memberships_select_authenticated ON public.group_memberships;
DROP POLICY IF EXISTS group_memberships_insert_authenticated ON public.group_memberships;
DROP POLICY IF EXISTS group_memberships_update_authenticated ON public.group_memberships;
DROP POLICY IF EXISTS group_memberships_delete_authenticated ON public.group_memberships;

-- SELECT: Users can see their own memberships + other members in groups they belong to
CREATE POLICY group_memberships_select_authenticated 
  ON public.group_memberships
  FOR SELECT 
  TO authenticated 
  USING (
    -- User can see their own memberships
    ((SELECT auth.uid()) = user_id)
    OR
    -- User can see other members in groups they belong to
    EXISTS (
      SELECT 1 
      FROM public.group_memberships gm2 
      WHERE gm2.group_id = group_memberships.group_id 
        AND gm2.user_id = (SELECT auth.uid())
    )
  );

-- INSERT: Users can add themselves to groups (via invite code)
CREATE POLICY group_memberships_insert_authenticated 
  ON public.group_memberships
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    (SELECT auth.uid()) = user_id
  );

-- UPDATE: Only group admins can update memberships (change roles)
CREATE POLICY group_memberships_update_authenticated 
  ON public.group_memberships
  FOR UPDATE 
  TO authenticated 
  USING (
    public.user_group_role((SELECT auth.uid()), group_id) = 'admin'
  )
  WITH CHECK (
    public.user_group_role((SELECT auth.uid()), group_id) = 'admin'
  );

-- DELETE: Users can remove themselves OR admins can remove others
CREATE POLICY group_memberships_delete_authenticated 
  ON public.group_memberships
  FOR DELETE 
  TO authenticated 
  USING (
    (SELECT auth.uid()) = user_id 
    OR 
    public.user_group_role((SELECT auth.uid()), group_id) = 'admin'
  );

