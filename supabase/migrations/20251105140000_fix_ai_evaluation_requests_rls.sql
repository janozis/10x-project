-- Migration: Fix RLS policies for ai_evaluation_requests
-- Created: 2025-11-05
-- Purpose: Update ai_evaluation_requests to use (SELECT auth.uid() AS uid) pattern

-- Drop existing policies
DROP POLICY IF EXISTS ai_evaluation_requests_select_authenticated ON public.ai_evaluation_requests;
DROP POLICY IF EXISTS ai_evaluation_requests_insert_authenticated ON public.ai_evaluation_requests;
DROP POLICY IF EXISTS ai_evaluation_requests_update_authenticated ON public.ai_evaluation_requests;
DROP POLICY IF EXISTS ai_evaluation_requests_delete_authenticated ON public.ai_evaluation_requests;

-- SELECT: Users can view requests for activities in groups they are members of
CREATE POLICY ai_evaluation_requests_select_authenticated 
  ON public.ai_evaluation_requests
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.activities a 
      JOIN public.group_memberships gm ON gm.group_id = a.group_id 
      WHERE a.id = ai_evaluation_requests.activity_id 
        AND gm.user_id = (SELECT auth.uid() AS uid)
    )
  );

-- INSERT: Users can create requests for activities they have edit access to
CREATE POLICY ai_evaluation_requests_insert_authenticated 
  ON public.ai_evaluation_requests
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.activities a 
      WHERE a.id = activity_id 
        AND (
          public.user_group_role((SELECT auth.uid() AS uid), a.group_id) = 'admin' 
          OR EXISTS (
            SELECT 1 
            FROM public.activity_editors ae 
            WHERE ae.activity_id = a.id 
              AND ae.user_id = (SELECT auth.uid() AS uid)
          )
        )
    )
  );

-- UPDATE: Only admins can update request status
CREATE POLICY ai_evaluation_requests_update_authenticated 
  ON public.ai_evaluation_requests
  FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.activities a 
      WHERE a.id = ai_evaluation_requests.activity_id 
        AND public.user_group_role((SELECT auth.uid() AS uid), a.group_id) = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.activities a 
      WHERE a.id = activity_id 
        AND public.user_group_role((SELECT auth.uid() AS uid), a.group_id) = 'admin'
    )
  );

-- DELETE: Only admins can delete evaluation requests
CREATE POLICY ai_evaluation_requests_delete_authenticated 
  ON public.ai_evaluation_requests
  FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.activities a 
      WHERE a.id = ai_evaluation_requests.activity_id 
        AND public.user_group_role((SELECT auth.uid() AS uid), a.group_id) = 'admin'
    )
  );

