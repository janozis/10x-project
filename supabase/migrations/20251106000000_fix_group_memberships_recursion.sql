-- Migration: Fix infinite recursion in group_memberships RLS
-- Created: 2025-11-06
-- Problem: Previous SELECT policy had infinite recursion (EXISTS subquery on same table)
-- Solution: Simplify policy - users can only see their own memberships

-- Drop problematic policy
DROP POLICY IF EXISTS group_memberships_select_authenticated ON public.group_memberships;

-- SELECT: Users can ONLY see their own memberships
-- (Other members will be fetched via application logic or separate view, not RLS)
CREATE POLICY group_memberships_select_authenticated 
  ON public.group_memberships
  FOR SELECT 
  TO authenticated 
  USING (
    (SELECT auth.uid()) = user_id
  );

