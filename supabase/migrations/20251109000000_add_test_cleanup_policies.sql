-- Migration: Add RLS policies for E2E test cleanup
-- Created: 2025-11-09
-- Purpose: Allow anon role to delete test data for automated teardown
-- Security: Only for test environments - these policies should be carefully reviewed for production
--
-- IMPORTANT: These policies allow anon key to delete data.
-- This is ONLY safe if:
-- 1. This is a test database (not production)
-- 2. Anon key is kept secret and only used in controlled environments
-- 3. You understand the security implications
--
-- For production, consider using service_role key or authenticated users only.

-- ================================
-- GROUPS - Allow anon to delete
-- ================================

-- SELECT: Anon can read groups (needed to find what to delete)
CREATE POLICY groups_select_anon 
  ON public.groups
  FOR SELECT 
  TO anon
  USING (true);

-- DELETE: Anon can delete any group
-- In production, you might want to restrict this to specific users or conditions
CREATE POLICY groups_delete_anon 
  ON public.groups
  FOR DELETE 
  TO anon
  USING (true);

-- ================================
-- GROUP_MEMBERSHIPS - Allow anon to delete
-- ================================

CREATE POLICY group_memberships_select_anon 
  ON public.group_memberships
  FOR SELECT 
  TO anon
  USING (true);

CREATE POLICY group_memberships_delete_anon 
  ON public.group_memberships
  FOR DELETE 
  TO anon
  USING (true);

-- ================================
-- ACTIVITIES - Allow anon to delete
-- ================================

CREATE POLICY activities_select_anon 
  ON public.activities
  FOR SELECT 
  TO anon
  USING (true);

CREATE POLICY activities_delete_anon 
  ON public.activities
  FOR DELETE 
  TO anon
  USING (true);

-- ================================
-- CAMP_DAYS - Allow anon to delete
-- ================================

CREATE POLICY camp_days_select_anon 
  ON public.camp_days
  FOR SELECT 
  TO anon
  USING (true);

CREATE POLICY camp_days_delete_anon 
  ON public.camp_days
  FOR DELETE 
  TO anon
  USING (true);

-- ================================
-- ACTIVITY_SCHEDULES - Allow anon to delete
-- ================================

CREATE POLICY activity_schedules_select_anon 
  ON public.activity_schedules
  FOR SELECT 
  TO anon
  USING (true);

CREATE POLICY activity_schedules_delete_anon 
  ON public.activity_schedules
  FOR DELETE 
  TO anon
  USING (true);

-- ================================
-- GROUP_TASKS - Allow anon to delete
-- ================================

CREATE POLICY group_tasks_select_anon 
  ON public.group_tasks
  FOR SELECT 
  TO anon
  USING (true);

CREATE POLICY group_tasks_delete_anon 
  ON public.group_tasks
  FOR DELETE 
  TO anon
  USING (true);

-- ================================
-- AI_EVALUATIONS - Allow anon to delete
-- ================================

CREATE POLICY ai_evaluations_select_anon 
  ON public.ai_evaluations
  FOR SELECT 
  TO anon
  USING (true);

CREATE POLICY ai_evaluations_delete_anon 
  ON public.ai_evaluations
  FOR DELETE 
  TO anon
  USING (true);

-- ================================
-- ACTIVITY_EDITORS - Allow anon to delete
-- ================================

CREATE POLICY activity_editors_select_anon 
  ON public.activity_editors
  FOR SELECT 
  TO anon
  USING (true);

CREATE POLICY activity_editors_delete_anon 
  ON public.activity_editors
  FOR DELETE 
  TO anon
  USING (true);

-- ================================
-- VERIFICATION
-- ================================

-- You can verify these policies with:
-- SELECT tablename, policyname, roles, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'public' AND roles @> '{anon}';

COMMENT ON POLICY groups_select_anon ON public.groups IS 'E2E test cleanup: Allow anon to read groups';
COMMENT ON POLICY groups_delete_anon ON public.groups IS 'E2E test cleanup: Allow anon to delete groups';
COMMENT ON POLICY group_memberships_delete_anon ON public.group_memberships IS 'E2E test cleanup: Allow anon to delete memberships';
COMMENT ON POLICY activities_delete_anon ON public.activities IS 'E2E test cleanup: Allow anon to delete activities';
COMMENT ON POLICY camp_days_delete_anon ON public.camp_days IS 'E2E test cleanup: Allow anon to delete camp days';
COMMENT ON POLICY activity_schedules_delete_anon ON public.activity_schedules IS 'E2E test cleanup: Allow anon to delete schedules';
COMMENT ON POLICY group_tasks_delete_anon ON public.group_tasks IS 'E2E test cleanup: Allow anon to delete tasks';
COMMENT ON POLICY ai_evaluations_delete_anon ON public.ai_evaluations IS 'E2E test cleanup: Allow anon to delete evaluations';
COMMENT ON POLICY activity_editors_delete_anon ON public.activity_editors IS 'E2E test cleanup: Allow anon to delete editors';

