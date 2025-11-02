-- Migration: AI Evaluation Worker Function
-- Created: 2025-11-01
-- Purpose: Dedicated function for AI evaluation worker to insert evaluations without cooldown check

-- Function to insert AI evaluation from worker (bypasses cooldown check)
-- This is safe because the cooldown was already checked by request_ai_evaluation RPC
CREATE OR REPLACE FUNCTION public.insert_ai_evaluation_from_worker(
  p_activity_id uuid,
  p_lore_score int,
  p_lore_feedback text,
  p_scouting_values_score int,
  p_scouting_feedback text,
  p_suggestions jsonb,
  p_tokens int
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- Run as function owner (bypasses RLS)
AS $$
DECLARE
  v_version int;
  v_new_id uuid;
BEGIN
  -- Calculate next version
  SELECT max(version) INTO v_version FROM public.ai_evaluations WHERE activity_id = p_activity_id;
  
  -- Disable trigger for this session to bypass cooldown check
  -- The cooldown was already validated by request_ai_evaluation RPC
  PERFORM set_config('session.skip_ai_eval_trigger', 'true', true);
  
  -- Insert evaluation with calculated version
  INSERT INTO public.ai_evaluations(
    activity_id,
    version,
    lore_score,
    lore_feedback,
    scouting_values_score,
    scouting_feedback,
    suggestions,
    tokens
  ) VALUES (
    p_activity_id,
    coalesce(v_version, 0) + 1,
    p_lore_score,
    p_lore_feedback,
    p_scouting_values_score,
    p_scouting_feedback,
    p_suggestions,
    p_tokens
  ) RETURNING id INTO v_new_id;
  
  -- Re-enable trigger
  PERFORM set_config('session.skip_ai_eval_trigger', 'false', true);
  
  RETURN v_new_id;
END;
$$;

-- Grant execute permission to authenticated users (worker will use service role)
GRANT EXECUTE ON FUNCTION public.insert_ai_evaluation_from_worker TO authenticated;

-- Comment for documentation
COMMENT ON FUNCTION public.insert_ai_evaluation_from_worker IS 
  'Inserts AI evaluation from worker process. Bypasses cooldown check since it was already validated by request_ai_evaluation. Calculates version manually to avoid trigger conflicts.';

