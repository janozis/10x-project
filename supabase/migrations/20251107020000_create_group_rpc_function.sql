-- Migration: Create RPC function for group creation (workaround for RLS issue)
-- Created: 2025-11-07
-- Purpose: Bypass RLS using SECURITY DEFINER function
-- Reason: Direct INSERT fails despite correct RLS policies, likely Supabase SSR auth context issue

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

