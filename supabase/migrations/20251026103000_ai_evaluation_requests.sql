-- Migration: AI Evaluation Requests queue and RPC function
-- Provides table to queue AI evaluations and server-side cooldown enforcement.

CREATE TABLE IF NOT EXISTS ai_evaluation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL CHECK (status IN ('queued','processing','completed','failed')) DEFAULT 'queued',
  error_code text NULL,
  error_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz NULL,
  finished_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_eval_req_activity_status ON ai_evaluation_requests(activity_id, status);

-- Optional unique constraint to prevent multiple simultaneous queued/processing for same activity (MVP: allow duplicates)
-- ALTER TABLE ai_evaluation_requests ADD CONSTRAINT uq_ai_eval_req_activity_pending UNIQUE (activity_id, status) DEFERRABLE INITIALLY IMMEDIATE;

-- RPC function encapsulating cooldown check & atomic insert/update
CREATE OR REPLACE FUNCTION request_ai_evaluation(p_activity uuid, p_user uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_last timestamptz;
  v_new_id uuid;
BEGIN
  SELECT last_evaluation_requested_at INTO v_last FROM activities WHERE id = p_activity;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'activity_not_found';
  END IF;
  IF v_last IS NOT NULL AND v_last > (now() - interval '5 minutes') THEN
    RAISE EXCEPTION 'cooldown';
  END IF;
  -- Update the activity timestamp first to minimize race window
  UPDATE activities SET last_evaluation_requested_at = now(), updated_at = now() WHERE id = p_activity;
  INSERT INTO ai_evaluation_requests(activity_id, requested_by) VALUES (p_activity, p_user) RETURNING id INTO v_new_id;
  RETURN v_new_id;
EXCEPTION
  WHEN others THEN
    -- Propagate specific exceptions; generic fallback
    IF SQLERRM LIKE '%cooldown%' THEN
      RAISE EXCEPTION 'cooldown';
    ELSIF SQLERRM LIKE '%activity_not_found%' THEN
      RAISE EXCEPTION 'activity_not_found';
    ELSE
      RAISE;
    END IF;
END;
$$;
