-- Migration: Fix activities RLS infinite recursion and add DELETE policy
-- Created: 2025-11-13
-- Purpose: Fix infinite recursion in activities UPDATE policy and add missing DELETE policy
-- Issue: Soft delete (UPDATE with deleted_at) was causing infinite recursion in RLS policies
--        because activity_editors policy checks activities, creating a circular dependency
-- Solution: 
--   1. Add helper function with SECURITY DEFINER to break circular dependency
--   2. Update activity_editors policies to use the helper function
--   3. Add missing DELETE policy for activities

-- ================================
-- HELPER FUNCTION - Break circular dependency
-- ================================

-- Create helper function to check if user can see activity_editors
-- Using SECURITY DEFINER to bypass RLS and avoid recursion
CREATE OR REPLACE FUNCTION public.user_can_see_activity(p_user_id uuid, p_activity_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.activities a
    JOIN public.group_memberships gm ON gm.group_id = a.group_id
    WHERE a.id = p_activity_id 
      AND gm.user_id = p_user_id
  );
$$;

COMMENT ON FUNCTION public.user_can_see_activity IS 
  'Helper function to check activity visibility without RLS recursion. Uses SECURITY DEFINER to bypass RLS on activities table.';

-- ================================
-- ACTIVITY_EDITORS - Fix policies to avoid circular dependency
-- ================================

-- Drop existing policies
DROP POLICY IF EXISTS activity_editors_select_authenticated ON public.activity_editors;
DROP POLICY IF EXISTS activity_editors_insert_authenticated ON public.activity_editors;
DROP POLICY IF EXISTS activity_editors_delete_authenticated ON public.activity_editors;

-- SELECT: Use helper function to avoid circular dependency
CREATE POLICY activity_editors_select_authenticated 
  ON public.activity_editors
  FOR SELECT 
  TO authenticated 
  USING (
    -- Use helper function to avoid circular dependency with activities table
    public.user_can_see_activity((SELECT auth.uid() AS uid), activity_id)
  );

-- INSERT: Only admins can assign editors
CREATE POLICY activity_editors_insert_authenticated 
  ON public.activity_editors
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    -- Using subquery to avoid recursion
    public.user_group_role(
      (SELECT auth.uid() AS uid), 
      (SELECT a.group_id FROM public.activities a WHERE a.id = activity_id)
    ) = 'admin'
  );

-- DELETE: Only admins can remove editors
CREATE POLICY activity_editors_delete_authenticated 
  ON public.activity_editors
  FOR DELETE 
  TO authenticated 
  USING (
    public.user_group_role(
      (SELECT auth.uid() AS uid), 
      (SELECT a.group_id FROM public.activities a WHERE a.id = activity_id)
    ) = 'admin'
  );

-- ================================
-- ACTIVITIES - Fix UPDATE policy and add DELETE policy
-- ================================

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS activities_update_authenticated ON public.activities;

-- UPDATE: Admin or assigned editor can update
-- FIXED: Avoid recursion by checking role first (short-circuit evaluation)
-- The key fix is to check user_group_role first which doesn't recurse into activity_editors
CREATE POLICY activities_update_authenticated 
  ON public.activities
  FOR UPDATE 
  TO authenticated 
  USING (
    -- Admin can always update (checked first, no recursion)
    public.user_group_role((SELECT auth.uid() AS uid), group_id) = 'admin'
    -- OR editor assigned to this activity
    OR (
      -- First verify user is an editor in the group (prevents recursion for non-editors)
      public.user_group_role((SELECT auth.uid() AS uid), group_id) IN ('editor') 
      -- Then check if assigned to this specific activity
      AND EXISTS (
        SELECT 1 
        FROM public.activity_editors ae 
        WHERE ae.activity_id = id 
          AND ae.user_id = (SELECT auth.uid() AS uid)
      )
    )
  )
  WITH CHECK (
    -- Same check for WITH CHECK clause
    public.user_group_role((SELECT auth.uid() AS uid), group_id) = 'admin'
    OR (
      public.user_group_role((SELECT auth.uid() AS uid), group_id) IN ('editor') 
      AND EXISTS (
        SELECT 1 
        FROM public.activity_editors ae 
        WHERE ae.activity_id = id 
          AND ae.user_id = (SELECT auth.uid() AS uid)
      )
    )
  );

-- DELETE: Only admin can hard delete activities
-- Note: Currently soft delete (UPDATE with deleted_at) is used, but this policy
-- is added for completeness and future-proofing
CREATE POLICY activities_delete_authenticated 
  ON public.activities
  FOR DELETE 
  TO authenticated 
  USING (
    public.user_group_role((SELECT auth.uid() AS uid), group_id) = 'admin'
  );

-- Add helpful comments for documentation
COMMENT ON POLICY activities_update_authenticated ON public.activities IS 
  'Admin or assigned editor can update. Soft delete (deleted_at) uses UPDATE. Fixed to avoid infinite recursion by checking user_group_role first.';
  
COMMENT ON POLICY activities_delete_authenticated ON public.activities IS 
  'Only admin can hard delete activities (physical removal). Currently not used - soft delete via UPDATE is preferred.';

COMMENT ON POLICY activity_editors_select_authenticated ON public.activity_editors IS 
  'Members can see activity editors. Uses helper function to avoid circular RLS dependency with activities table.';

COMMENT ON POLICY activity_editors_insert_authenticated ON public.activity_editors IS 
  'Only admin can assign editors. Uses subquery to avoid circular RLS dependency.';

COMMENT ON POLICY activity_editors_delete_authenticated ON public.activity_editors IS 
  'Only admin can remove editors. Uses subquery to avoid circular RLS dependency.';
