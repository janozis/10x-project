-- Fix group_dashboard_stats cartesian product issue
-- Problem: Multiple LEFT JOINs (activities+ai_evaluations and group_tasks) 
-- caused cartesian multiplication leading to incorrect task counts

-- Drop existing view
drop view if exists public.group_dashboard_stats;

-- Recreate with proper aggregation using subqueries to avoid cartesian product
create or replace view public.group_dashboard_stats
with (security_invoker = true)
as
select
  g.id as group_id,
  coalesce(act_stats.total_activities, 0) as total_activities,
  coalesce(act_stats.evaluated_activities, 0) as evaluated_activities,
  coalesce(act_stats.pct_evaluated_above_7, 0) as pct_evaluated_above_7,
  coalesce(task_stats.tasks_pending, 0) as tasks_pending,
  coalesce(task_stats.tasks_done, 0) as tasks_done
from public.groups g
left join (
  -- Activity statistics (with AI evaluations)
  select
    a.group_id,
    count(a.*) as total_activities,
    count(distinct ae.activity_id) as evaluated_activities,
    case when count(a.*) = 0 then 0
         else round( (count(distinct ae.activity_id) filter (where (select avg((ev.lore_score + ev.scouting_values_score)/2.0) from public.ai_evaluations ev where ev.activity_id = a.id) >= 7) * 100.0 /
                       nullif(count(a.*),0) ) ,2) end as pct_evaluated_above_7
  from public.activities a
  left join public.ai_evaluations ae on ae.activity_id = a.id
  where a.deleted_at is null
  group by a.group_id
) act_stats on act_stats.group_id = g.id
left join (
  -- Task statistics (separate subquery to avoid cartesian product)
  select
    gt.group_id,
    count(*) filter (where gt.status in ('pending','in_progress')) as tasks_pending,
    count(*) filter (where gt.status = 'done') as tasks_done
  from public.group_tasks gt
  group by gt.group_id
) task_stats on task_stats.group_id = g.id;

comment on view public.group_dashboard_stats is 'Aggregated dashboard stats per group (RLS-aware, fixed cartesian product issue)';

