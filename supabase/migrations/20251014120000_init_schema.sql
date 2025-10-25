-- migration: initial schema for loreprogrammer
-- purpose: create core tables, constraints, functions, triggers, indexes, row level security policies, and helper views.
-- affected: groups, group_memberships, activities, camp_days, activity_schedules, activity_editors, ai_evaluations, group_tasks, views, functions
-- notes: all objects created in lowercase; rls enabled for every table; policies separated per command and role; destructive operations absent (no drops) for safe initial apply.

-- ================================
-- extensions (idempotent)
-- ================================
create extension if not exists pgcrypto; -- provides gen_random_uuid()
create extension if not exists "uuid-ossp"; -- optional legacy uuid generation
create extension if not exists pg_trgm; -- trigram search on text columns

-- ================================
-- helper domains / enums (optional future) -- using plain text + check per plan
-- ================================

-- ================================
-- tables
-- ================================

-- groups: camp (hal) grouping container
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  lore_theme text not null,
  status text not null default 'planning' check (status in ('planning','active','archived')),
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  invite_code text unique,
  invite_expires_at timestamptz null,
  invite_max_uses int not null default 30 check (invite_max_uses > 0),
  invite_current_uses int not null default 0 check (invite_current_uses >= 0 and invite_current_uses <= invite_max_uses),
  max_members int not null default 50 check (max_members between 1 and 500),
  deleted_at timestamptz null,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unq_groups_invite_code_format check (invite_code is null or invite_code ~ '^[a-hj-np-za-km-z1-9]{8}$')
);
comment on table public.groups is 'hal groups (camps)';

-- group_memberships: user roles per group
create table if not exists public.group_memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  role text not null check (role in ('admin','editor','member')),
  joined_at timestamptz not null default now(),
  primary key (user_id, group_id)
);
comment on table public.group_memberships is 'membership roles of users within groups';

-- activities: structured activity definitions
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete restrict,
  title text not null,
  objective text not null,
  tasks text not null,
  duration_minutes int not null check (duration_minutes between 5 and 1440),
  location text not null,
  materials text not null,
  responsible text not null,
  knowledge_scope text not null,
  participants text not null,
  flow text not null,
  summary text not null,
  status text not null default 'draft' check (status in ('draft','review','ready','archived')),
  deleted_at timestamptz null,
  last_evaluation_requested_at timestamptz null,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.activities is 'activities / sessions belonging to groups';

-- camp_days: calendar days inside a group timeframe
create table if not exists public.camp_days (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  day_number int not null check (day_number between 1 and 30),
  date date not null,
  theme text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, day_number)
);
comment on table public.camp_days is 'days of a camp bound to a group';

-- activity_schedules: mapping activities into concrete day/time slots
create table if not exists public.activity_schedules (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  camp_day_id uuid not null references public.camp_days(id) on delete cascade,
  start_time time not null,
  end_time time not null check (end_time > start_time),
  order_in_day int not null check (order_in_day >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (camp_day_id, order_in_day)
);
comment on table public.activity_schedules is 'schedule instances of activities per camp day';

-- activity_editors: many-to-many assignments giving edit rights
create table if not exists public.activity_editors (
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by_user_id uuid not null references auth.users(id) on delete restrict,
  primary key (activity_id, user_id)
);
comment on table public.activity_editors is 'assigned editors for activities';

-- ai_evaluations: versioned ai scoring records
create table if not exists public.ai_evaluations (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  version int not null check (version >= 1),
  lore_score int not null check (lore_score between 1 and 10),
  scouting_values_score int not null check (scouting_values_score between 1 and 10),
  lore_feedback text not null,
  scouting_feedback text not null,
  suggestions jsonb not null check (jsonb_typeof(suggestions) = 'array' and jsonb_array_length(suggestions) between 0 and 10),
  tokens int null,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,
  unique (activity_id, version)
);
comment on table public.ai_evaluations is 'versioned ai evaluations for activities';

-- group_tasks: task tracking optionally linked to activity
create table if not exists public.group_tasks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  activity_id uuid null references public.activities(id) on delete set null,
  title text not null,
  description text not null,
  status text not null default 'pending' check (status in ('pending','in_progress','done','canceled')),
  due_date date null,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.group_tasks is 'group-scoped tasks optionally tied to an activity';

-- ================================
-- validation triggers (date range, admin preservation, updated_at, ai versioning)
-- ================================

-- updated_at generic trigger
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;$$;

create trigger trg_set_updated_at_groups before update on public.groups for each row execute function public.set_updated_at();
create trigger trg_set_updated_at_activities before update on public.activities for each row execute function public.set_updated_at();
create trigger trg_set_updated_at_camp_days before update on public.camp_days for each row execute function public.set_updated_at();
create trigger trg_set_updated_at_activity_schedules before update on public.activity_schedules for each row execute function public.set_updated_at();
create trigger trg_set_updated_at_group_tasks before update on public.group_tasks for each row execute function public.set_updated_at();

-- ensure camp_day date within group date range
create or replace function public.validate_camp_day_date() returns trigger language plpgsql as $$
declare v_start date; v_end date; begin
  select start_date, end_date into v_start, v_end from public.groups where id = new.group_id;
  if not (new.date between v_start and v_end) then
    raise exception 'camp_day.date % outside group range [% - %]', new.date, v_start, v_end;
  end if;
  return new;
end;$$;
create trigger trg_validate_camp_day_date before insert or update on public.camp_days for each row execute function public.validate_camp_day_date();

-- ensure at least one admin remains in group_memberships
create or replace function public.ensure_group_has_admin() returns trigger language plpgsql as $$
begin
  if (tg_op = 'delete' or (tg_op = 'update' and old.role = 'admin' and new.role <> 'admin')) then
    if not exists (
      select 1 from public.group_memberships gm
      where gm.group_id = old.group_id
        and (gm.user_id <> old.user_id or tg_op = 'update')
        and gm.role = 'admin'
    ) then
      raise exception 'group must have at least one admin';
    end if;
  end if;
  return coalesce(new, old);
end;$$;
create trigger trg_ensure_group_has_admin before delete or update on public.group_memberships for each row execute function public.ensure_group_has_admin();

-- user_group_role helper function
create or replace function public.user_group_role(p_user uuid, p_group uuid)
returns text language sql stable as $$
  select gm.role from public.group_memberships gm
  where gm.user_id = p_user and gm.group_id = p_group
  limit 1;
$$;

-- ai evaluation versioning + rate limiting (5 min cooldown)
create or replace function public.enforce_ai_evaluation_version() returns trigger language plpgsql as $$
declare v_last timestamptz; v_version int; v_cooldown interval := interval '5 minutes'; begin
  select max(version) into v_version from public.ai_evaluations where activity_id = new.activity_id;
  new.version := coalesce(v_version,0) + 1;
  select last_evaluation_requested_at into v_last from public.activities where id = new.activity_id;
  if v_last is not null and v_last > now() - v_cooldown then
    raise exception 'ai evaluation cooldown active';
  end if;
  update public.activities set last_evaluation_requested_at = now() where id = new.activity_id;
  return new;
end;$$;
create trigger trg_ai_evaluations_version before insert on public.ai_evaluations for each row execute function public.enforce_ai_evaluation_version();

-- ================================
-- indexes
-- ================================
create index if not exists idx_groups_status on public.groups(status) where deleted_at is null;
create index if not exists idx_groups_invite_code on public.groups(invite_code) where invite_code is not null;

create index if not exists idx_group_memberships_group on public.group_memberships(group_id);
create index if not exists idx_group_memberships_user on public.group_memberships(user_id);
create index if not exists idx_group_memberships_role on public.group_memberships(role) where role <> 'member';

create index if not exists idx_activities_group on public.activities(group_id) where deleted_at is null;
create index if not exists idx_activities_status on public.activities(status) where deleted_at is null;
create index if not exists idx_activities_last_eval on public.activities(last_evaluation_requested_at);
-- full text (placeholder - adjust vector composition later); comment out if not required initially
-- create index if not exists idx_activities_fulltext on public.activities using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(objective,'')));

create index if not exists idx_camp_days_group_day on public.camp_days(group_id, day_number);

create index if not exists idx_activity_schedules_day on public.activity_schedules(camp_day_id);
create index if not exists idx_activity_schedules_activity on public.activity_schedules(activity_id);

create index if not exists idx_activity_editors_user on public.activity_editors(user_id);

create index if not exists idx_ai_evaluations_activity on public.ai_evaluations(activity_id);
create index if not exists idx_ai_evaluations_created_at on public.ai_evaluations(activity_id, created_at desc);

create index if not exists idx_group_tasks_group_status on public.group_tasks(group_id, status);
create index if not exists idx_group_tasks_activity on public.group_tasks(activity_id) where activity_id is not null;

-- ================================
-- row level security enablement
-- ================================
alter table public.groups enable row level security;
alter table public.group_memberships enable row level security;
alter table public.activities enable row level security;
alter table public.camp_days enable row level security;
alter table public.activity_schedules enable row level security;
alter table public.activity_editors enable row level security;
alter table public.ai_evaluations enable row level security;
alter table public.group_tasks enable row level security;

-- ================================
-- rls policies (separate per role and command)
-- rationale: provide least privilege; anon users get no data access (adjust if public read desired)
-- ================================

-- groups policies
-- select: authenticated members of a group
create policy groups_select_authenticated on public.groups
  for select to authenticated using (
    exists (select 1 from public.group_memberships gm where gm.group_id = id and gm.user_id = auth.uid())
  );
-- insert: any authenticated user may create a group
create policy groups_insert_authenticated on public.groups
  for insert to authenticated with check (auth.uid() is not null);
-- update: only group admin
create policy groups_update_authenticated on public.groups
  for update to authenticated using (public.user_group_role(auth.uid(), id) = 'admin')
  with check (public.user_group_role(auth.uid(), id) = 'admin');
-- delete: restrict physical delete (optional - allow only admin). consider using soft delete via update
create policy groups_delete_authenticated on public.groups
  for delete to authenticated using (public.user_group_role(auth.uid(), id) = 'admin');

-- group_memberships policies
create policy group_memberships_select_authenticated on public.group_memberships
  for select to authenticated using (
    exists (select 1 from public.group_memberships gm2 where gm2.group_id = group_memberships.group_id and gm2.user_id = auth.uid())
  );
create policy group_memberships_insert_authenticated on public.group_memberships
  for insert to authenticated with check (auth.uid() = user_id);
create policy group_memberships_update_authenticated on public.group_memberships
  for update to authenticated using (public.user_group_role(auth.uid(), group_id) = 'admin')
  with check (public.user_group_role(auth.uid(), group_id) = 'admin');
create policy group_memberships_delete_authenticated on public.group_memberships
  for delete to authenticated using (auth.uid() = user_id or public.user_group_role(auth.uid(), group_id) = 'admin');

-- activities policies
create policy activities_select_authenticated on public.activities
  for select to authenticated using (
    exists (select 1 from public.group_memberships gm where gm.group_id = activities.group_id and gm.user_id = auth.uid())
  );
create policy activities_insert_authenticated on public.activities
  for insert to authenticated with check (public.user_group_role(auth.uid(), group_id) in ('admin','editor'));
create policy activities_update_authenticated on public.activities
  for update to authenticated using (
    public.user_group_role(auth.uid(), group_id) = 'admin' or exists (
      select 1 from public.activity_editors ae where ae.activity_id = activities.id and ae.user_id = auth.uid()
    )
  ) with check (
    public.user_group_role(auth.uid(), group_id) = 'admin' or exists (
      select 1 from public.activity_editors ae where ae.activity_id = activities.id and ae.user_id = auth.uid()
    )
  );

-- activity_editors policies
create policy activity_editors_select_authenticated on public.activity_editors
  for select to authenticated using (
    exists (select 1 from public.activities a join public.group_memberships gm on gm.group_id = a.group_id where a.id = activity_editors.activity_id and gm.user_id = auth.uid())
  );
create policy activity_editors_insert_authenticated on public.activity_editors
  for insert to authenticated with check (
    exists (select 1 from public.activities a where a.id = activity_id and public.user_group_role(auth.uid(), a.group_id) = 'admin')
  );
create policy activity_editors_delete_authenticated on public.activity_editors
  for delete to authenticated using (
    exists (select 1 from public.activities a where a.id = activity_id and public.user_group_role(auth.uid(), a.group_id) = 'admin')
  );

-- ai_evaluations policies
create policy ai_evaluations_select_authenticated on public.ai_evaluations
  for select to authenticated using (
    exists (select 1 from public.activities a join public.group_memberships gm on gm.group_id = a.group_id where a.id = ai_evaluations.activity_id and gm.user_id = auth.uid())
  );
create policy ai_evaluations_insert_authenticated on public.ai_evaluations
  for insert to authenticated with check (
    exists (select 1 from public.activities a where a.id = activity_id and (
      public.user_group_role(auth.uid(), a.group_id) = 'admin' or exists (
        select 1 from public.activity_editors ae where ae.activity_id = a.id and ae.user_id = auth.uid()
      )
    ))
  );

-- camp_days policies
create policy camp_days_select_authenticated on public.camp_days
  for select to authenticated using (
    exists (select 1 from public.group_memberships gm where gm.group_id = camp_days.group_id and gm.user_id = auth.uid())
  );
create policy camp_days_insert_authenticated on public.camp_days
  for insert to authenticated with check (public.user_group_role(auth.uid(), group_id) in ('admin'));
create policy camp_days_update_authenticated on public.camp_days
  for update to authenticated using (public.user_group_role(auth.uid(), group_id) = 'admin')
  with check (public.user_group_role(auth.uid(), group_id) = 'admin');
create policy camp_days_delete_authenticated on public.camp_days
  for delete to authenticated using (public.user_group_role(auth.uid(), group_id) = 'admin');

-- activity_schedules policies
create policy activity_schedules_select_authenticated on public.activity_schedules
  for select to authenticated using (
    exists (select 1 from public.camp_days cd join public.group_memberships gm on gm.group_id = cd.group_id where cd.id = activity_schedules.camp_day_id and gm.user_id = auth.uid())
  );
create policy activity_schedules_insert_authenticated on public.activity_schedules
  for insert to authenticated with check (
    exists (select 1 from public.camp_days cd join public.activities a on a.group_id = cd.group_id where cd.id = camp_day_id and a.id = activity_id and public.user_group_role(auth.uid(), cd.group_id) in ('admin','editor'))
  );
create policy activity_schedules_update_authenticated on public.activity_schedules
  for update to authenticated using (
    exists (select 1 from public.camp_days cd join public.activities a on a.group_id = cd.group_id where cd.id = activity_schedules.camp_day_id and public.user_group_role(auth.uid(), cd.group_id) in ('admin','editor'))
  ) with check (
    exists (select 1 from public.camp_days cd join public.activities a on a.group_id = cd.group_id where cd.id = camp_day_id and public.user_group_role(auth.uid(), cd.group_id) in ('admin','editor'))
  );
create policy activity_schedules_delete_authenticated on public.activity_schedules
  for delete to authenticated using (
    exists (select 1 from public.camp_days cd join public.activities a on a.group_id = cd.group_id where cd.id = activity_schedules.camp_day_id and public.user_group_role(auth.uid(), cd.group_id) in ('admin','editor'))
  );

-- group_tasks policies
create policy group_tasks_select_authenticated on public.group_tasks
  for select to authenticated using (
    exists (select 1 from public.group_memberships gm where gm.group_id = group_tasks.group_id and gm.user_id = auth.uid())
  );
create policy group_tasks_insert_authenticated on public.group_tasks
  for insert to authenticated with check (public.user_group_role(auth.uid(), group_id) in ('admin','editor'));
create policy group_tasks_update_authenticated on public.group_tasks
  for update to authenticated using (public.user_group_role(auth.uid(), group_id) in ('admin','editor'))
  with check (public.user_group_role(auth.uid(), group_id) in ('admin','editor'));
create policy group_tasks_delete_authenticated on public.group_tasks
  for delete to authenticated using (public.user_group_role(auth.uid(), group_id) in ('admin','editor'));

-- optional: deny all for anon explicitly (rls defaults to deny). left implicit.

-- ================================
-- views (helper)
-- ================================
create or replace view public.user_group_permissions as
select
  gm.user_id,
  gm.group_id,
  gm.role,
  case when gm.role = 'admin' then true else false end as can_edit_all,
  case when gm.role in ('admin','editor') then true else false end as can_edit_assigned_only
from public.group_memberships gm;

create or replace view public.group_dashboard_stats as
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

comment on view public.user_group_permissions is 'flattened permissions per user + derived flags';
comment on view public.group_dashboard_stats is 'aggregated dashboard stats per group';

-- ================================
-- end of migration
-- ================================
