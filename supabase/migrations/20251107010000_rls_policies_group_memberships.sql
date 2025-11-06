-- Migration: RLS policies for group_memberships table
-- Created: 2025-11-07
-- Replaces all previous group_memberships policies with clean, working versions

-- Drop all existing policies
DROP POLICY IF EXISTS group_memberships_select_authenticated ON public.group_memberships;
DROP POLICY IF EXISTS group_memberships_insert_authenticated ON public.group_memberships;
DROP POLICY IF EXISTS group_memberships_update_authenticated ON public.group_memberships;
DROP POLICY IF EXISTS group_memberships_delete_authenticated ON public.group_memberships;

-- SELECT: Users can see their own memberships
CREATE POLICY group_memberships_select_authenticated 
  ON public.group_memberships
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

-- INSERT: Any authenticated user can insert membership
-- Application validates user_id field
CREATE POLICY group_memberships_insert_authenticated 
  ON public.group_memberships
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- UPDATE: Only group admins can update memberships (change roles)
CREATE POLICY group_memberships_update_authenticated 
  ON public.group_memberships
  FOR UPDATE 
  TO authenticated 
  USING (public.user_group_role(auth.uid(), group_id) = 'admin')
  WITH CHECK (public.user_group_role(auth.uid(), group_id) = 'admin');

-- DELETE: Users can remove themselves OR admins can remove others
CREATE POLICY group_memberships_delete_authenticated 
  ON public.group_memberships
  FOR DELETE 
  TO authenticated 
  USING (
    auth.uid() = user_id 
    OR 
    public.user_group_role(auth.uid(), group_id) = 'admin'
  );

