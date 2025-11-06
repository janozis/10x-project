-- Migration: Fix ALL RLS policies to use (SELECT auth.uid() AS uid) pattern
-- Created: 2025-11-05
-- Purpose: Ensure all RLS policies work correctly with Supabase SSR
-- Pattern: Use (SELECT auth.uid() AS uid) instead of auth.uid() directly

-- ================================
-- GROUPS
-- ================================

-- Drop existing policies
DROP POLICY IF EXISTS groups_select_authenticated ON public.groups;
DROP POLICY IF EXISTS groups_insert_authenticated ON public.groups;
DROP POLICY IF EXISTS groups_update_authenticated ON public.groups;
DROP POLICY IF EXISTS groups_delete_authenticated ON public.groups;

-- SELECT: User can see groups they are a member of
CREATE POLICY groups_select_authenticated 
  ON public.groups
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.group_memberships gm 
      WHERE gm.group_id = id 
        AND gm.user_id = (SELECT auth.uid() AS uid)
    )
  );

-- INSERT: Any authenticated user can create a group
CREATE POLICY groups_insert_authenticated 
  ON public.groups
  FOR INSERT 
  TO authenticated 
  WITH CHECK ((SELECT auth.uid() AS uid) IS NOT NULL);

-- UPDATE: Only group admin can update
CREATE POLICY groups_update_authenticated 
  ON public.groups
  FOR UPDATE 
  TO authenticated 
  USING (
    public.user_group_role((SELECT auth.uid() AS uid), id) = 'admin'
  )
  WITH CHECK (
    public.user_group_role((SELECT auth.uid() AS uid), id) = 'admin'
  );

-- DELETE: Only group admin can delete
CREATE POLICY groups_delete_authenticated 
  ON public.groups
  FOR DELETE 
  TO authenticated 
  USING (
    public.user_group_role((SELECT auth.uid() AS uid), id) = 'admin'
  );

-- ================================
-- ACTIVITIES
-- ================================

-- Drop existing policies
DROP POLICY IF EXISTS activities_select_authenticated ON public.activities;
DROP POLICY IF EXISTS activities_insert_authenticated ON public.activities;
DROP POLICY IF EXISTS activities_update_authenticated ON public.activities;

-- SELECT: Members of the group can view activities
CREATE POLICY activities_select_authenticated 
  ON public.activities
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.group_memberships gm 
      WHERE gm.group_id = activities.group_id 
        AND gm.user_id = (SELECT auth.uid() AS uid)
    )
  );

-- INSERT: Admin or editor can create activities
CREATE POLICY activities_insert_authenticated 
  ON public.activities
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    public.user_group_role((SELECT auth.uid() AS uid), group_id) IN ('admin', 'editor')
  );

-- UPDATE: Admin or assigned editor can update
CREATE POLICY activities_update_authenticated 
  ON public.activities
  FOR UPDATE 
  TO authenticated 
  USING (
    public.user_group_role((SELECT auth.uid() AS uid), group_id) = 'admin' 
    OR EXISTS (
      SELECT 1 
      FROM public.activity_editors ae 
      WHERE ae.activity_id = activities.id 
        AND ae.user_id = (SELECT auth.uid() AS uid)
    )
  )
  WITH CHECK (
    public.user_group_role((SELECT auth.uid() AS uid), group_id) = 'admin' 
    OR EXISTS (
      SELECT 1 
      FROM public.activity_editors ae 
      WHERE ae.activity_id = activities.id 
        AND ae.user_id = (SELECT auth.uid() AS uid)
    )
  );

-- ================================
-- CAMP_DAYS
-- ================================

-- Drop existing policies
DROP POLICY IF EXISTS camp_days_select_authenticated ON public.camp_days;
DROP POLICY IF EXISTS camp_days_insert_authenticated ON public.camp_days;
DROP POLICY IF EXISTS camp_days_update_authenticated ON public.camp_days;
DROP POLICY IF EXISTS camp_days_delete_authenticated ON public.camp_days;

-- SELECT: Members can view camp days
CREATE POLICY camp_days_select_authenticated 
  ON public.camp_days
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.group_memberships gm 
      WHERE gm.group_id = camp_days.group_id 
        AND gm.user_id = (SELECT auth.uid() AS uid)
    )
  );

-- INSERT: Only admin can create camp days
CREATE POLICY camp_days_insert_authenticated 
  ON public.camp_days
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    public.user_group_role((SELECT auth.uid() AS uid), group_id) = 'admin'
  );

-- UPDATE: Only admin can update camp days
CREATE POLICY camp_days_update_authenticated 
  ON public.camp_days
  FOR UPDATE 
  TO authenticated 
  USING (
    public.user_group_role((SELECT auth.uid() AS uid), group_id) = 'admin'
  )
  WITH CHECK (
    public.user_group_role((SELECT auth.uid() AS uid), group_id) = 'admin'
  );

-- DELETE: Only admin can delete camp days
CREATE POLICY camp_days_delete_authenticated 
  ON public.camp_days
  FOR DELETE 
  TO authenticated 
  USING (
    public.user_group_role((SELECT auth.uid() AS uid), group_id) = 'admin'
  );

-- ================================
-- ACTIVITY_SCHEDULES
-- ================================

-- Drop existing policies
DROP POLICY IF EXISTS activity_schedules_select_authenticated ON public.activity_schedules;
DROP POLICY IF EXISTS activity_schedules_insert_authenticated ON public.activity_schedules;
DROP POLICY IF EXISTS activity_schedules_update_authenticated ON public.activity_schedules;
DROP POLICY IF EXISTS activity_schedules_delete_authenticated ON public.activity_schedules;

-- SELECT: Members can view schedules
CREATE POLICY activity_schedules_select_authenticated 
  ON public.activity_schedules
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.camp_days cd 
      JOIN public.group_memberships gm ON gm.group_id = cd.group_id 
      WHERE cd.id = activity_schedules.camp_day_id 
        AND gm.user_id = (SELECT auth.uid() AS uid)
    )
  );

-- INSERT: Admin or editor can add schedules
CREATE POLICY activity_schedules_insert_authenticated 
  ON public.activity_schedules
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.camp_days cd 
      JOIN public.activities a ON a.group_id = cd.group_id 
      WHERE cd.id = camp_day_id 
        AND public.user_group_role((SELECT auth.uid() AS uid), cd.group_id) IN ('admin', 'editor')
    )
  );

-- UPDATE: Admin or editor can update schedules
CREATE POLICY activity_schedules_update_authenticated 
  ON public.activity_schedules
  FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.camp_days cd 
      JOIN public.activities a ON a.group_id = cd.group_id 
      WHERE cd.id = activity_schedules.camp_day_id 
        AND public.user_group_role((SELECT auth.uid() AS uid), cd.group_id) IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.camp_days cd 
      JOIN public.activities a ON a.group_id = cd.group_id 
      WHERE cd.id = camp_day_id 
        AND public.user_group_role((SELECT auth.uid() AS uid), cd.group_id) IN ('admin', 'editor')
    )
  );

-- DELETE: Admin or editor can delete schedules
CREATE POLICY activity_schedules_delete_authenticated 
  ON public.activity_schedules
  FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.camp_days cd 
      JOIN public.activities a ON a.group_id = cd.group_id 
      WHERE cd.id = activity_schedules.camp_day_id 
        AND public.user_group_role((SELECT auth.uid() AS uid), cd.group_id) IN ('admin', 'editor')
    )
  );

-- ================================
-- ACTIVITY_EDITORS
-- ================================

-- Drop existing policies
DROP POLICY IF EXISTS activity_editors_select_authenticated ON public.activity_editors;
DROP POLICY IF EXISTS activity_editors_insert_authenticated ON public.activity_editors;
DROP POLICY IF EXISTS activity_editors_delete_authenticated ON public.activity_editors;

-- SELECT: Members can see activity editors
CREATE POLICY activity_editors_select_authenticated 
  ON public.activity_editors
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.activities a 
      JOIN public.group_memberships gm ON gm.group_id = a.group_id 
      WHERE a.id = activity_editors.activity_id 
        AND gm.user_id = (SELECT auth.uid() AS uid)
    )
  );

-- INSERT: Only admin can assign editors
CREATE POLICY activity_editors_insert_authenticated 
  ON public.activity_editors
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.activities a 
      WHERE a.id = activity_id 
        AND public.user_group_role((SELECT auth.uid() AS uid), a.group_id) = 'admin'
    )
  );

-- DELETE: Only admin can remove editors
CREATE POLICY activity_editors_delete_authenticated 
  ON public.activity_editors
  FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.activities a 
      WHERE a.id = activity_id 
        AND public.user_group_role((SELECT auth.uid() AS uid), a.group_id) = 'admin'
    )
  );

-- ================================
-- AI_EVALUATIONS
-- ================================

-- Drop existing policies
DROP POLICY IF EXISTS ai_evaluations_select_authenticated ON public.ai_evaluations;

-- SELECT: Members can view evaluations
CREATE POLICY ai_evaluations_select_authenticated 
  ON public.ai_evaluations
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.activities a 
      JOIN public.group_memberships gm ON gm.group_id = a.group_id 
      WHERE a.id = ai_evaluations.activity_id 
        AND gm.user_id = (SELECT auth.uid() AS uid)
    )
  );

-- Note: INSERT for ai_evaluations is handled by RPC function with SECURITY DEFINER
-- No UPDATE/DELETE - evaluations are immutable

-- ================================
-- GROUP_TASKS
-- ================================

-- Drop existing policies
DROP POLICY IF EXISTS group_tasks_select_authenticated ON public.group_tasks;
DROP POLICY IF EXISTS group_tasks_insert_authenticated ON public.group_tasks;
DROP POLICY IF EXISTS group_tasks_update_authenticated ON public.group_tasks;
DROP POLICY IF EXISTS group_tasks_delete_authenticated ON public.group_tasks;

-- SELECT: Members can view tasks
CREATE POLICY group_tasks_select_authenticated 
  ON public.group_tasks
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.group_memberships gm 
      WHERE gm.group_id = group_tasks.group_id 
        AND gm.user_id = (SELECT auth.uid() AS uid)
    )
  );

-- INSERT: Admin or editor can create tasks
CREATE POLICY group_tasks_insert_authenticated 
  ON public.group_tasks
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    public.user_group_role((SELECT auth.uid() AS uid), group_id) IN ('admin', 'editor')
  );

-- UPDATE: Admin or editor can update tasks
CREATE POLICY group_tasks_update_authenticated 
  ON public.group_tasks
  FOR UPDATE 
  TO authenticated 
  USING (
    public.user_group_role((SELECT auth.uid() AS uid), group_id) IN ('admin', 'editor')
  )
  WITH CHECK (
    public.user_group_role((SELECT auth.uid() AS uid), group_id) IN ('admin', 'editor')
  );

-- DELETE: Admin or editor can delete tasks
CREATE POLICY group_tasks_delete_authenticated 
  ON public.group_tasks
  FOR DELETE 
  TO authenticated 
  USING (
    public.user_group_role((SELECT auth.uid() AS uid), group_id) IN ('admin', 'editor')
  );

