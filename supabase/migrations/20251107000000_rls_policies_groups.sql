-- Migration: RLS policies for groups table
-- Created: 2025-11-07
-- Replaces all previous group policies with clean, working versions

-- Drop all existing policies
DROP POLICY IF EXISTS groups_select_authenticated ON public.groups;
DROP POLICY IF EXISTS groups_insert_authenticated ON public.groups;
DROP POLICY IF EXISTS groups_update_authenticated ON public.groups;
DROP POLICY IF EXISTS groups_delete_authenticated ON public.groups;

-- SELECT: Users can see groups they are members of
CREATE POLICY groups_select_authenticated 
  ON public.groups
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.group_memberships gm 
      WHERE gm.group_id = groups.id 
        AND gm.user_id = auth.uid()
    )
  );

-- INSERT: Any authenticated user can create a group
-- Application validates created_by field
CREATE POLICY groups_insert_authenticated 
  ON public.groups
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- UPDATE: Only group admin can update
CREATE POLICY groups_update_authenticated 
  ON public.groups
  FOR UPDATE 
  TO authenticated 
  USING (public.user_group_role(auth.uid(), id) = 'admin')
  WITH CHECK (public.user_group_role(auth.uid(), id) = 'admin');

-- DELETE: Only group admin can delete (soft delete)
CREATE POLICY groups_delete_authenticated 
  ON public.groups
  FOR DELETE 
  TO authenticated 
  USING (public.user_group_role(auth.uid(), id) = 'admin');

