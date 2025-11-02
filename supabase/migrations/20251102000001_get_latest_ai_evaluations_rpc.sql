-- Migration: RPC function to get latest AI evaluations for a set of activities
-- This is more efficient than fetching all versions and filtering client-side
-- Uses DISTINCT ON to get only the highest version for each activity

CREATE OR REPLACE FUNCTION public.get_latest_ai_evaluations(p_activity_ids uuid[])
RETURNS TABLE (
  activity_id uuid,
  lore_score int,
  scouting_values_score int,
  version int,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT DISTINCT ON (ae.activity_id)
    ae.activity_id,
    ae.lore_score,
    ae.scouting_values_score,
    ae.version,
    ae.created_at
  FROM public.ai_evaluations ae
  WHERE ae.activity_id = ANY(p_activity_ids)
  ORDER BY ae.activity_id, ae.version DESC;
$$;

COMMENT ON FUNCTION public.get_latest_ai_evaluations IS 'Returns the latest (highest version) AI evaluation for each of the provided activity IDs';

-- Grant execute to authenticated users (they still need to be members of the activity's group via RLS)
GRANT EXECUTE ON FUNCTION public.get_latest_ai_evaluations TO authenticated;

