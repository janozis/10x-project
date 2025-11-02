-- Migration: Modify AI Evaluation Trigger to Support Worker
-- Created: 2025-11-01
-- Purpose: Allow worker to bypass cooldown check via session variable

-- Modified trigger function that respects session.skip_ai_eval_trigger variable
CREATE OR REPLACE FUNCTION public.enforce_ai_evaluation_version() 
RETURNS trigger 
LANGUAGE plpgsql 
AS $$
DECLARE 
  v_last timestamptz; 
  v_version int; 
  v_cooldown interval := interval '5 minutes';
  v_skip_trigger text;
BEGIN
  -- Check if we should skip the trigger (called from worker)
  v_skip_trigger := current_setting('session.skip_ai_eval_trigger', true);
  
  -- Calculate version (always needed)
  SELECT max(version) INTO v_version FROM public.ai_evaluations WHERE activity_id = new.activity_id;
  new.version := coalesce(v_version, 0) + 1;
  
  -- Skip cooldown check if called from worker function
  IF v_skip_trigger = 'true' THEN
    RETURN new;
  END IF;
  
  -- Normal path: check cooldown and update timestamp
  SELECT last_evaluation_requested_at INTO v_last FROM public.activities WHERE id = new.activity_id;
  IF v_last IS NOT NULL AND v_last > now() - v_cooldown THEN
    RAISE EXCEPTION 'ai evaluation cooldown active';
  END IF;
  
  UPDATE public.activities SET last_evaluation_requested_at = now() WHERE id = new.activity_id;
  RETURN new;
END;
$$;

-- Trigger remains the same, only the function is modified
-- (No need to recreate the trigger itself)

