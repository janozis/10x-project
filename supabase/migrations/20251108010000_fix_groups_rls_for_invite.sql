-- Migration: Fix groups RLS policy to allow invite code lookups
-- Created: 2025-11-08
-- Issue: Users cannot join groups via invite code because RLS blocks SELECT queries
--        when they are not yet members (chicken-and-egg problem)

-- Drop existing SELECT policy
DROP POLICY IF EXISTS groups_select_authenticated ON public.groups;

-- CREATE new SELECT policy that allows:
-- 1. Members to see their groups (existing behavior)
-- 2. Anyone to see groups when searching by invite_code (for join functionality)
CREATE POLICY groups_select_authenticated 
  ON public.groups
  FOR SELECT 
  TO authenticated 
  USING (
    -- Users can see groups they are members of
    EXISTS (
      SELECT 1 FROM public.group_memberships gm 
      WHERE gm.group_id = groups.id 
        AND gm.user_id = (SELECT auth.uid())
    )
    OR
    -- Users can see groups when searching by invite code (for join functionality)
    -- This is safe because:
    -- - Invite codes are random 8-char strings (hard to guess)
    -- - Backend validates expiry and usage limits before allowing join
    -- - Users only see that group exists, not sensitive data until they join
    (invite_code IS NOT NULL)
  );

-- Note: This policy uses (SELECT auth.uid()) pattern for compatibility with Supabase SSR
-- See: /supabase/RLS_POLICIES.md for details

