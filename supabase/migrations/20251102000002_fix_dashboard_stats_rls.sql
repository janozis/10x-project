-- Fix group_dashboard_stats to respect RLS policies
-- Problem: Views don't automatically apply RLS, so dashboard was counting
-- all tasks in group, not just those visible to current user

-- Drop existing view
drop view if exists public.group_dashboard_stats;

-- Recreate as SECURITY INVOKER to apply RLS policies
create or replace view public.group_dashboard_stats
with (security_invoker = true)
as
select
  g.id as group_id,
  count(a.*) filter (where a.deleted_at is null) as total_activities,
  count(distinct ae.activity_id) as evaluated_activities,
  case when count(a.*) filter (where a.deleted_at is null) = 0 then 0
       else round( (count(distinct ae.activity_id) filter (where (select avg((ev.lore_score + ev.scouting_values_score)/2.0) from public.ai_evaluations ev where ev.activity_id = a.id) >= 7) * 100.0 /
                     nullif(count(a.*) filter (where a.deleted_at is null),0) ) ,2) end as pct_evaluated_above_7,
  count(gt.*) filter (where gt.status in ('pending','in_progress')) as tasks_pending,
  count(gt.*) filter (where gt.status = 'done') as tasks_done
from public.groups g
left join public.activities a on a.group_id = g.id and a.deleted_at is null
left join public.ai_evaluations ae on ae.activity_id = a.id
left join public.group_tasks gt on gt.group_id = g.id
group by g.id;

comment on view public.group_dashboard_stats is 'aggregated dashboard stats per group (RLS-aware via security_invoker)';

