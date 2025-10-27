-- Migration: Dashboard performance indexes
-- Purpose: Optimize queries for group dashboard endpoint
-- Affected: activities table
-- Notes: Composite index for recent activities query with ordering

-- Index for dashboard recent activities query
-- Optimizes: ORDER BY created_at DESC with group_id filter and deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_activities_group_recent 
  ON public.activities(group_id, created_at DESC) 
  WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_activities_group_recent IS 
  'Optimizes recent activities query for dashboard endpoint - supports filtering by group_id and ordering by created_at DESC';

