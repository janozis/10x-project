-- Migration: Fix invite_expires_at to be set when creating groups
-- Created: 2025-11-08
-- Purpose: Ensure invite codes have expiration date (default 30 days)

-- Update existing groups with NULL invite_expires_at to have 30 days from now
UPDATE public.groups
SET invite_expires_at = NOW() + INTERVAL '30 days'
WHERE invite_code IS NOT NULL 
  AND invite_expires_at IS NULL
  AND deleted_at IS NULL;

-- Recreate RPC function to include invite_expires_at
CREATE OR REPLACE FUNCTION public.create_group_with_membership(
    p_name text,
    p_description text,
    p_lore_theme text,
    p_start_date date,
    p_end_date date,
    p_max_members integer,
    p_invite_code text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_group_id uuid;
    v_user_id uuid;
    v_group_row public.groups;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    
    -- Verify user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;
    
    -- Insert group (bypasses RLS due to SECURITY DEFINER)
    INSERT INTO public.groups (
        name, 
        description, 
        lore_theme, 
        start_date, 
        end_date,
        max_members, 
        invite_code,
        invite_expires_at,
        created_by, 
        updated_by
    ) VALUES (
        p_name, 
        p_description, 
        p_lore_theme, 
        p_start_date, 
        p_end_date,
        p_max_members, 
        p_invite_code,
        NOW() + INTERVAL '30 days',
        v_user_id, 
        v_user_id
    )
    RETURNING * INTO v_group_row;
    
    -- Insert admin membership
    INSERT INTO public.group_memberships (group_id, user_id, role)
    VALUES (v_group_row.id, v_user_id, 'admin');
    
    -- Return group as JSON
    RETURN row_to_json(v_group_row);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_group_with_membership(text, text, text, date, date, integer, text) TO authenticated;

COMMENT ON FUNCTION public.create_group_with_membership IS 'Creates a new group with the caller as admin member. Sets invite code expiration to 30 days from creation.';

