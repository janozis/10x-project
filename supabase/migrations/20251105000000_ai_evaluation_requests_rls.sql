-- Migration: Add RLS policies for ai_evaluation_requests table
-- Created: 2025-11-05
-- Purpose: Enable Row Level Security for ai_evaluation_requests and define policies
-- Rationale: Users should only see evaluation requests for activities in groups they belong to

-- Enable RLS on ai_evaluation_requests table
ALTER TABLE public.ai_evaluation_requests ENABLE ROW LEVEL SECURITY;

-- ================================
-- RLS Policies for ai_evaluation_requests
-- ================================

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
        AND gm.user_id = auth.uid()
    )
  );

-- INSERT: Users can create requests for activities they have edit access to
-- (admin of the group OR assigned editor of the activity)
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
          public.user_group_role(auth.uid(), a.group_id) = 'admin' 
          OR EXISTS (
            SELECT 1 
            FROM public.activity_editors ae 
            WHERE ae.activity_id = a.id 
              AND ae.user_id = auth.uid()
          )
        )
    )
  );

-- UPDATE: Only service role or the system can update request status
-- Normal users should not update requests directly (use RPC functions instead)
CREATE POLICY ai_evaluation_requests_update_authenticated 
  ON public.ai_evaluation_requests
  FOR UPDATE 
  TO authenticated 
  USING (
    -- Only allow updates to requests in groups where user is admin
    EXISTS (
      SELECT 1 
      FROM public.activities a 
      WHERE a.id = ai_evaluation_requests.activity_id 
        AND public.user_group_role(auth.uid(), a.group_id) = 'admin'
    )
  )
  WITH CHECK (
    -- Same condition for the updated row
    EXISTS (
      SELECT 1 
      FROM public.activities a 
      WHERE a.id = activity_id 
        AND public.user_group_role(auth.uid(), a.group_id) = 'admin'
    )
  );

-- DELETE: Group admins can delete requests
CREATE POLICY ai_evaluation_requests_delete_authenticated 
  ON public.ai_evaluation_requests
  FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.activities a 
      WHERE a.id = ai_evaluation_requests.activity_id 
        AND public.user_group_role(auth.uid(), a.group_id) = 'admin'
    )
  );

-- ================================
-- Comments for documentation
-- ================================

COMMENT ON POLICY ai_evaluation_requests_select_authenticated ON public.ai_evaluation_requests IS 
  'Users can view AI evaluation requests for activities in groups they belong to';

COMMENT ON POLICY ai_evaluation_requests_insert_authenticated ON public.ai_evaluation_requests IS 
  'Users can create requests if they are group admins or assigned activity editors';

COMMENT ON POLICY ai_evaluation_requests_update_authenticated ON public.ai_evaluation_requests IS 
  'Only group admins can update request status (typically handled by backend)';

COMMENT ON POLICY ai_evaluation_requests_delete_authenticated ON public.ai_evaluation_requests IS 
  'Group admins can delete evaluation requests';


