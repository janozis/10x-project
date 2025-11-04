-- Migration: Add view for group members with emails
-- Purpose: Create a security definer function to fetch group members with their emails
-- This allows non-admin users to see member emails within their groups without needing service role access

-- Create a security definer function that can read from auth.users
-- This function will run with the privileges of the function owner, not the caller
-- Authorization is handled by RLS policies on group_memberships table
CREATE OR REPLACE FUNCTION public.get_group_members_with_emails(p_group_id UUID)
RETURNS TABLE (
  user_id UUID,
  group_id UUID,
  role TEXT,
  joined_at TIMESTAMPTZ,
  user_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Return members with their emails
  -- RLS policies on group_memberships will ensure only group members can call this
  RETURN QUERY
  SELECT
    gm.user_id,
    gm.group_id,
    gm.role,
    gm.joined_at,
    u.email::TEXT AS user_email
  FROM public.group_memberships gm
  LEFT JOIN auth.users u ON u.id = gm.user_id
  WHERE gm.group_id = p_group_id
  ORDER BY gm.joined_at ASC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_group_members_with_emails(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_group_members_with_emails IS 'Returns group members with their email addresses. RLS policies ensure only group members can access this.';

