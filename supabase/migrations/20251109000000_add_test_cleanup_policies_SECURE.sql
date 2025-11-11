-- Migration: Add SECURE RLS policies for E2E test cleanup
-- Created: 2025-11-09
-- Purpose: Allow anon role to delete ONLY test data (more secure version)
-- Security: This version is safer - only allows deletion of data created by specific test users
--
-- RECOMMENDED: Use this version if you want better security
-- It only allows deletion of data created by test users (based on UUID)
--
-- To use this migration instead of the simple one:
-- 1. Don't apply 20251109000000_add_test_cleanup_policies.sql
-- 2. Apply this file instead
-- 3. Make sure E2E_USERNAME_ID and E2E_2_USERNAME_ID are set in your environment

-- ================================
-- CONFIGURATION
-- ================================
-- Replace these UUIDs with your actual test user IDs from .env.test
-- You can also create a table to store test user IDs dynamically

-- Option 1: Hardcode test user UUIDs (simpler but less flexible)
-- CREATE TABLE IF NOT EXISTS public.test_users (
--   user_id UUID PRIMARY KEY
-- );
-- INSERT INTO public.test_users VALUES 
--   ('a04ccb88-15f1-49a8-b3c0-f07b7bb226e5'),  -- E2E_USERNAME_ID
--   ('ea8413b5-1491-48b1-8e53-baadde8366f2');  -- E2E_2_USERNAME_ID

-- Option 2: Use a helper function to check if user is a test user
CREATE OR REPLACE FUNCTION public.is_test_user(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Add your test user UUIDs here
  RETURN user_uuid IN (
    'a04ccb88-15f1-49a8-b3c0-f07b7bb226e5'::uuid,  -- Replace with E2E_USERNAME_ID
    'ea8413b5-1491-48b1-8e53-baadde8366f2'::uuid   -- Replace with E2E_2_USERNAME_ID
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_test_user IS 'Check if a user ID belongs to a test user';

-- ================================
-- GROUPS - Allow anon to delete ONLY test data
-- ================================

-- SELECT: Anon can read groups created by test users
CREATE POLICY groups_select_anon_test 
  ON public.groups
  FOR SELECT 
  TO anon
  USING (public.is_test_user(created_by));

-- DELETE: Anon can delete groups created by test users only
CREATE POLICY groups_delete_anon_test 
  ON public.groups
  FOR DELETE 
  TO anon
  USING (public.is_test_user(created_by));

-- ================================
-- GROUP_MEMBERSHIPS - Allow anon to delete test data
-- ================================

-- SELECT: Anon can read memberships in test groups
CREATE POLICY group_memberships_select_anon_test 
  ON public.group_memberships
  FOR SELECT 
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_memberships.group_id
        AND public.is_test_user(g.created_by)
    )
  );

-- DELETE: Anon can delete memberships in test groups
CREATE POLICY group_memberships_delete_anon_test 
  ON public.group_memberships
  FOR DELETE 
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_memberships.group_id
        AND public.is_test_user(g.created_by)
    )
  );

-- ================================
-- ACTIVITIES - Allow anon to delete test data
-- ================================

-- SELECT: Anon can read activities in test groups
CREATE POLICY activities_select_anon_test 
  ON public.activities
  FOR SELECT 
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = activities.group_id
        AND public.is_test_user(g.created_by)
    )
  );

-- DELETE: Anon can delete activities in test groups
CREATE POLICY activities_delete_anon_test 
  ON public.activities
  FOR DELETE 
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = activities.group_id
        AND public.is_test_user(g.created_by)
    )
  );

-- ================================
-- CAMP_DAYS - Allow anon to delete test data
-- ================================

CREATE POLICY camp_days_select_anon_test 
  ON public.camp_days
  FOR SELECT 
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = camp_days.group_id
        AND public.is_test_user(g.created_by)
    )
  );

CREATE POLICY camp_days_delete_anon_test 
  ON public.camp_days
  FOR DELETE 
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = camp_days.group_id
        AND public.is_test_user(g.created_by)
    )
  );

-- ================================
-- ACTIVITY_SCHEDULES - Allow anon to delete test data
-- ================================

CREATE POLICY activity_schedules_select_anon_test 
  ON public.activity_schedules
  FOR SELECT 
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      JOIN public.groups g ON g.id = a.group_id
      WHERE a.id = activity_schedules.activity_id
        AND public.is_test_user(g.created_by)
    )
  );

CREATE POLICY activity_schedules_delete_anon_test 
  ON public.activity_schedules
  FOR DELETE 
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      JOIN public.groups g ON g.id = a.group_id
      WHERE a.id = activity_schedules.activity_id
        AND public.is_test_user(g.created_by)
    )
  );

-- ================================
-- GROUP_TASKS - Allow anon to delete test data
-- ================================

CREATE POLICY group_tasks_select_anon_test 
  ON public.group_tasks
  FOR SELECT 
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_tasks.group_id
        AND public.is_test_user(g.created_by)
    )
  );

CREATE POLICY group_tasks_delete_anon_test 
  ON public.group_tasks
  FOR DELETE 
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_tasks.group_id
        AND public.is_test_user(g.created_by)
    )
  );

-- ================================
-- AI_EVALUATIONS - Allow anon to delete test data
-- ================================

CREATE POLICY ai_evaluations_select_anon_test 
  ON public.ai_evaluations
  FOR SELECT 
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      JOIN public.groups g ON g.id = a.group_id
      WHERE a.id = ai_evaluations.activity_id
        AND public.is_test_user(g.created_by)
    )
  );

CREATE POLICY ai_evaluations_delete_anon_test 
  ON public.ai_evaluations
  FOR DELETE 
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      JOIN public.groups g ON g.id = a.group_id
      WHERE a.id = ai_evaluations.activity_id
        AND public.is_test_user(g.created_by)
    )
  );

-- ================================
-- ACTIVITY_EDITORS - Allow anon to delete test data
-- ================================

CREATE POLICY activity_editors_select_anon_test 
  ON public.activity_editors
  FOR SELECT 
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      JOIN public.groups g ON g.id = a.group_id
      WHERE a.id = activity_editors.activity_id
        AND public.is_test_user(g.created_by)
    )
  );

CREATE POLICY activity_editors_delete_anon_test 
  ON public.activity_editors
  FOR DELETE 
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      JOIN public.groups g ON g.id = a.group_id
      WHERE a.id = activity_editors.activity_id
        AND public.is_test_user(g.created_by)
    )
  );

-- ================================
-- VERIFICATION
-- ================================

-- You can verify these policies with:
-- SELECT tablename, policyname, roles, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'public' AND roles @> '{anon}';

-- Test the is_test_user function:
-- SELECT public.is_test_user('a04ccb88-15f1-49a8-b3c0-f07b7bb226e5'::uuid);  -- Should return true
-- SELECT public.is_test_user('00000000-0000-0000-0000-000000000000'::uuid);  -- Should return false

COMMENT ON FUNCTION public.is_test_user IS 'E2E test cleanup: Check if user is a test user (UPDATE THE UUIDS!)';
COMMENT ON POLICY groups_select_anon_test ON public.groups IS 'E2E test cleanup: Allow anon to read test groups only';
COMMENT ON POLICY groups_delete_anon_test ON public.groups IS 'E2E test cleanup: Allow anon to delete test groups only';

