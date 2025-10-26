# Schemat bazy danych – LoreProgrammer

## 1. Tabele (kolumny, typy, ograniczenia)

Konwencje:
- PK: `id` typu `uuid` (DEFAULT gen_random_uuid()) chyba że tabela junction bez własnego surrogate.
- Nazwy constraintów: prefiksy `pk_`, `fk_`, `unq_`, `chk_`, `idx_`.
- Znaczniki audytu: `created_at TIMESTAMPTZ DEFAULT now() NOT NULL`, `updated_at TIMESTAMPTZ DEFAULT now() NOT NULL` z triggerem aktualizującym; dodatkowo `created_by`, `updated_by` (UUID usera) tam gdzie ma sens.
- Soft delete: kolumna `deleted_at TIMESTAMPTZ NULL` (tylko w `groups`, `activities`).
- Wszystkie odniesienia do użytkowników: klucz obcy do `auth.users(id)` (Supabase) – reprezentowane jako `UUID`.

### 1.1 groups
Obozy HAL.

| Kolumna | Typ | Ograniczenia / Opis |
|---------|-----|---------------------|
| id | uuid | PK `pk_groups` DEFAULT gen_random_uuid() |
| name | text | NOT NULL |
| description | text | NOT NULL |
| lore_theme | text | NOT NULL |
| status | text | NOT NULL DEFAULT 'planning' CHECK (`status` IN ('planning','active','archived')) |
| start_date | date | NOT NULL |
| end_date | date | NOT NULL CHECK (end_date >= start_date) |
| invite_code | text | UNIQUE, 8 znaków, CHECK (invite_code ~ '^[A-HJ-NP-Za-km-z1-9]{8}$') NULLABLE |
| invite_expires_at | timestamptz | NULL |
| invite_max_uses | int | NOT NULL DEFAULT 30 CHECK (invite_max_uses > 0) |
| invite_current_uses | int | NOT NULL DEFAULT 0 CHECK (invite_current_uses >= 0 AND invite_current_uses <= invite_max_uses) |
| max_members | int | NOT NULL DEFAULT 50 CHECK (max_members BETWEEN 1 AND 500) |
| deleted_at | timestamptz | NULL |
| created_by | uuid | NOT NULL FK -> auth.users(id) |
| updated_by | uuid | NOT NULL FK -> auth.users(id) |
| created_at | timestamptz | NOT NULL DEFAULT now() |
| updated_at | timestamptz | NOT NULL DEFAULT now() |

Dodatkowe CHECK: minimalnie 1 admin zapewniane triggerem (na poziomie memberships).

### 1.2 group_memberships
Relacja wielu użytkowników do wielu grup z rolą.

| Kolumna | Typ | Ograniczenia |
|---------|-----|--------------|
| user_id | uuid | FK -> auth.users(id) ON DELETE CASCADE |
| group_id | uuid | FK -> groups(id) ON DELETE CASCADE |
| role | text | NOT NULL CHECK (role IN ('admin','editor','member')) |
| joined_at | timestamptz | NOT NULL DEFAULT now() |

PK złożony `(user_id, group_id)` `pk_group_memberships`. Unikalność roli per user/group implicit. Constraint wymuszający co najmniej jednego admina: trigger przy DELETE/UPDATE role.

### 1.3 activities
Zajęcia przypisane do grup.

| Kolumna | Typ | Ograniczenia |
|---------|-----|--------------|
| id | uuid | PK DEFAULT gen_random_uuid() |
| group_id | uuid | NOT NULL FK -> groups(id) ON DELETE RESTRICT |
| title | text | NOT NULL |
| objective | text | NOT NULL |
| tasks | text | NOT NULL |
| duration_minutes | int | NOT NULL CHECK (duration_minutes BETWEEN 5 AND 1440) |
| location | text | NOT NULL |
| materials | text | NOT NULL |
| responsible | text | NOT NULL | 
| knowledge_scope | text | NOT NULL |
| participants | text | NOT NULL |
| flow | text | NOT NULL |
| summary | text | NOT NULL |
| status | text | NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','ready','archived')) |
| deleted_at | timestamptz | NULL |
| last_evaluation_requested_at | timestamptz | NULL |
| created_by | uuid | NOT NULL FK -> auth.users(id) |
| updated_by | uuid | NOT NULL FK -> auth.users(id) |
| created_at | timestamptz | NOT NULL DEFAULT now() |
| updated_at | timestamptz | NOT NULL DEFAULT now() |

### 1.4 camp_days
Dni obozu (kalendarz w ramach group).

| Kolumna | Typ | Ograniczenia |
| id | uuid | PK DEFAULT gen_random_uuid() |
| group_id | uuid | NOT NULL FK -> groups(id) ON DELETE CASCADE |
| day_number | int | NOT NULL CHECK (day_number BETWEEN 1 AND 30) |
| date | date | NOT NULL |
| theme | text | NULL |
| created_at | timestamptz | DEFAULT now() NOT NULL |
| updated_at | timestamptz | DEFAULT now() NOT NULL |

UNIQUE (group_id, day_number). CHECK (date BETWEEN group.start_date AND group.end_date) via trigger lub deferred constraint (implementacja w triggerze).

### 1.5 activity_schedules
Mapowanie aktywności na konkretne terminy (możliwe wiele terminów dla jednej aktywności).

| Kolumna | Typ | Ograniczenia |
| id | uuid | PK DEFAULT gen_random_uuid() |
| activity_id | uuid | NOT NULL FK -> activities(id) ON DELETE CASCADE |
| camp_day_id | uuid | NOT NULL FK -> camp_days(id) ON DELETE CASCADE |
| start_time | time | NOT NULL |
| end_time | time | NOT NULL CHECK (end_time > start_time) |
| order_in_day | int | NOT NULL CHECK (order_in_day >= 1) |
| created_at | timestamptz | DEFAULT now() NOT NULL |
| updated_at | timestamptz | DEFAULT now() NOT NULL |

UNIQUE (camp_day_id, order_in_day). Dodatkowy ekskluzywny constraint nakładający brak nakładania się przedziałów czasowych per `camp_day_id` można zaimplementować indeksem GIST na `tsrange` skonstruowanym z daty + czasu (opcjonalne w MVP – uwaga w sekcji 5).

### 1.6 activity_editors
Wielu edytorów przypisanych do aktywności.

| Kolumna | Typ | Ograniczenia |
| activity_id | uuid | FK -> activities(id) ON DELETE CASCADE |
| user_id | uuid | FK -> auth.users(id) ON DELETE CASCADE |
| assigned_at | timestamptz | NOT NULL DEFAULT now() |
| assigned_by_user_id | uuid | NOT NULL FK -> auth.users(id) |

PK (activity_id, user_id).

### 1.7 ai_evaluations
Wersjonowane oceny AI danej aktywności.

| Kolumna | Typ | Ograniczenia |
| id | uuid | PK DEFAULT gen_random_uuid() |
| activity_id | uuid | NOT NULL FK -> activities(id) ON DELETE CASCADE |
| version | int | NOT NULL CHECK (version >= 1) |
| lore_score | int | NOT NULL CHECK (lore_score BETWEEN 1 AND 10) |
| scouting_values_score | int | NOT NULL CHECK (scouting_values_score BETWEEN 1 AND 10) |
| lore_feedback | text | NOT NULL |
| scouting_feedback | text | NOT NULL |
| suggestions | jsonb | NOT NULL CHECK (jsonb_array_length(suggestions) BETWEEN 0 AND 10) |
| tokens | int | NULLABLE |
| created_at | timestamptz | NOT NULL DEFAULT now() |
| created_by | uuid | NULL FK -> auth.users(id) |

UNIQUE (activity_id, version). Trigger ustala `version = COALESCE(MAX(previous)+1,1)`.

### 1.8 group_tasks
Zadania grupowe, opcjonalnie powiązane z aktywnością.

| Kolumna | Typ | Ograniczenia |
| id | uuid | PK DEFAULT gen_random_uuid() |
| group_id | uuid | NOT NULL FK -> groups(id) ON DELETE CASCADE |
| activity_id | uuid | NULL FK -> activities(id) ON DELETE SET NULL |
| title | text | NOT NULL |
| description | text | NOT NULL |
| status | text | NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','canceled')) |
| due_date | date | NULL |
| created_by | uuid | NOT NULL FK -> auth.users(id) |
| updated_by | uuid | NOT NULL FK -> auth.users(id) |
| created_at | timestamptz | NOT NULL DEFAULT now() |
| updated_at | timestamptz | NOT NULL DEFAULT now() |

### 1.9 (Widoki)
- `user_group_permissions`: (user_id, group_id, role, can_edit_all, can_edit_assigned_only)
- `group_dashboard_stats`: agregacje: group_id, total_activities, evaluated_activities, pct_evaluated_above_7, tasks_pending, tasks_done.

### 1.10 Rozszerzenia wymagane
```
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- opcjonalne
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- wyszukiwanie po nazwie / temacie
```

## 2. Relacje między tabelami

| Relacja | Kardynalność | Opis |
|---------|--------------|------|
| groups — group_memberships | 1:N | Jedna grupa ma wielu membershipów. |
| auth.users — group_memberships | 1:N | Użytkownik może należeć do wielu grup. |
| groups — activities | 1:N | Grupa posiada wiele aktywności. |
| activities — activity_editors — auth.users | M:N | Wielu edytorów na wiele aktywności. Junction `activity_editors`. |
| groups — camp_days | 1:N | Każda grupa ma dni obozu. |
| camp_days — activity_schedules | 1:N | Dzień ma wiele wpisów harmonogramu. |
| activities — activity_schedules | 1:N | Aktywność może mieć wiele terminów. |
| activities — ai_evaluations | 1:N | Wiele wersji ocen jednej aktywności. |
| groups — group_tasks | 1:N | Zadania przypisane do grupy. |
| activities — group_tasks | 1:N (opcjonalne) | Zadanie może wskazywać aktywność. |
| auth.users — activities | 1:N | Twórcy / aktualizujący. |
| auth.users — ai_evaluations | 1:N | Autor ewaluacji (jeżeli manualne wywołanie). |

## 3. Indeksy

Minimalny zestaw + uzasadnienia.

```
-- groups
CREATE INDEX idx_groups_status ON groups(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_groups_invite_code ON groups(invite_code) WHERE invite_code IS NOT NULL;

-- group_memberships
CREATE INDEX idx_group_memberships_group ON group_memberships(group_id);
CREATE INDEX idx_group_memberships_user ON group_memberships(user_id);
CREATE INDEX idx_group_memberships_role ON group_memberships(role) WHERE role <> 'member';

-- activities
CREATE INDEX idx_activities_group ON activities(group_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_activities_status ON activities(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_activities_last_eval ON activities(last_evaluation_requested_at);
CREATE INDEX idx_activities_fulltext ON activities USING GIN (to_tsvector('simple', title || ' ' || objective || ' ' || lore_theme_placeholder)); -- (opcjonalnie, można usunąć lub dostosować)

-- camp_days
CREATE INDEX idx_camp_days_group_day ON camp_days(group_id, day_number);

-- activity_schedules
CREATE INDEX idx_activity_schedules_day ON activity_schedules(camp_day_id);
CREATE INDEX idx_activity_schedules_activity ON activity_schedules(activity_id);

-- activity_editors
CREATE INDEX idx_activity_editors_user ON activity_editors(user_id);

-- ai_evaluations
CREATE INDEX idx_ai_evaluations_activity ON ai_evaluations(activity_id);
CREATE INDEX idx_ai_evaluations_created_at ON ai_evaluations(activity_id, created_at DESC);

-- group_tasks
CREATE INDEX idx_group_tasks_group_status ON group_tasks(group_id, status);
CREATE INDEX idx_group_tasks_activity ON group_tasks(activity_id) WHERE activity_id IS NOT NULL;
```

Opcjonalne (później): GIST / EXCLUDE dla niepokrywających się bloków czasu.

## 4. Zasady bezpieczeństwa (Funkcje, RLS, triggery)

### 4.1 Funkcja roli użytkownika w grupie
```
CREATE OR REPLACE FUNCTION user_group_role(p_user uuid, p_group uuid)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT gm.role FROM group_memberships gm
  WHERE gm.user_id = p_user AND gm.group_id = p_group
  LIMIT 1;
$$;
```

### 4.2 RLS włączenie
```
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE camp_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_editors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_tasks ENABLE ROW LEVEL SECURITY;
```

### 4.3 Polityki (przykładowy zestaw)

#### groups
- Select: członek (dowolna rola) grupy.
```
CREATE POLICY select_groups ON groups FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_memberships gm WHERE gm.group_id = groups.id AND gm.user_id = auth.uid())
);
```
- Insert: każdy zalogowany (tworzy nową grupę). (Można ograniczyć do zweryfikowanych emaili.)
```
CREATE POLICY insert_groups ON groups FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```
- Update/Delete: tylko admin grupy i brak soft delete? Dla Delete – soft delete przez trigger.
```
CREATE POLICY update_groups ON groups FOR UPDATE USING (
  user_group_role(auth.uid(), id) = 'admin'
) WITH CHECK (
  user_group_role(auth.uid(), id) = 'admin'
);
```

#### group_memberships
Select własne grupy, Insert (dołączenie przez kod), Update roli admin only, Delete self lub admin.
```
CREATE POLICY select_group_memberships ON group_memberships FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_memberships gm2 WHERE gm2.group_id = group_memberships.group_id AND gm2.user_id = auth.uid())
);
CREATE POLICY insert_group_memberships ON group_memberships FOR INSERT WITH CHECK (
  auth.uid() = user_id -- dołącza siebie
);
CREATE POLICY update_group_memberships ON group_memberships FOR UPDATE USING (
  user_group_role(auth.uid(), group_id) = 'admin'
) WITH CHECK (user_group_role(auth.uid(), group_id) = 'admin');
CREATE POLICY delete_group_memberships ON group_memberships FOR DELETE USING (
  auth.uid() = user_id OR user_group_role(auth.uid(), group_id) = 'admin'
);
```
Trigger zapobiega usunięciu ostatniego admina:
```
CREATE OR REPLACE FUNCTION ensure_group_has_admin() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'DELETE' OR (TG_OP='UPDATE' AND OLD.role='admin' AND NEW.role <> 'admin')) THEN
    IF NOT EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_id = OLD.group_id AND (user_id <> OLD.user_id OR TG_OP='UPDATE') AND role='admin'
    ) THEN
      RAISE EXCEPTION 'group must have at least one admin';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;$$;
CREATE TRIGGER trg_ensure_group_has_admin
BEFORE DELETE OR UPDATE ON group_memberships
FOR EACH ROW EXECUTE FUNCTION ensure_group_has_admin();
```

#### activities
```
CREATE POLICY select_activities ON activities FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_memberships gm WHERE gm.group_id = activities.group_id AND gm.user_id = auth.uid())
);
CREATE POLICY insert_activities ON activities FOR INSERT WITH CHECK (
  user_group_role(auth.uid(), group_id) IN ('admin','editor')
);
CREATE POLICY update_activities ON activities FOR UPDATE USING (
  user_group_role(auth.uid(), group_id) = 'admin' OR EXISTS (
    SELECT 1 FROM activity_editors ae WHERE ae.activity_id = activities.id AND ae.user_id = auth.uid()
  )
) WITH CHECK (
  user_group_role(auth.uid(), group_id) = 'admin' OR EXISTS (
    SELECT 1 FROM activity_editors ae WHERE ae.activity_id = activities.id AND ae.user_id = auth.uid()
  )
);
```
Soft delete przez update `deleted_at` (policy update). Delete fizyczny może być zabroniony.

#### activity_editors
Admin może przypisać, edytor może zobaczyć.
```
CREATE POLICY select_activity_editors ON activity_editors FOR SELECT USING (
  EXISTS (SELECT 1 FROM activities a JOIN group_memberships gm ON gm.group_id=a.group_id WHERE a.id=activity_editors.activity_id AND gm.user_id=auth.uid())
);
CREATE POLICY insert_activity_editors ON activity_editors FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM activities a WHERE a.id=activity_id AND user_group_role(auth.uid(), a.group_id)='admin')
);
CREATE POLICY delete_activity_editors ON activity_editors FOR DELETE USING (
  EXISTS (SELECT 1 FROM activities a WHERE a.id=activity_id AND user_group_role(auth.uid(), a.group_id)='admin')
);
```

#### ai_evaluations
Read dla członków, insert dla admin/editor z przypisaniem, brak update (wersjonowanie), delete tylko admin.
```
CREATE POLICY select_ai_evaluations ON ai_evaluations FOR SELECT USING (
  EXISTS (SELECT 1 FROM activities a JOIN group_memberships gm ON gm.group_id=a.group_id WHERE a.id=ai_evaluations.activity_id AND gm.user_id=auth.uid())
);
CREATE POLICY insert_ai_evaluations ON ai_evaluations FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM activities a WHERE a.id=activity_id AND (
    user_group_role(auth.uid(), a.group_id)='admin' OR EXISTS (
      SELECT 1 FROM activity_editors ae WHERE ae.activity_id=a.id AND ae.user_id=auth.uid()
    )
  ))
);
```
Trigger auto-version + rate limiting:
```
CREATE OR REPLACE FUNCTION enforce_ai_evaluation_version() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_last timestamptz; v_version int; v_activity_group uuid; v_role text; v_cooldown interval := interval '5 minutes';
BEGIN
  SELECT max(version) INTO v_version FROM ai_evaluations WHERE activity_id = NEW.activity_id;
  NEW.version := COALESCE(v_version,0)+1;
  -- Rate limit
  SELECT last_evaluation_requested_at INTO v_last FROM activities WHERE id = NEW.activity_id;
  IF v_last IS NOT NULL AND v_last > now() - v_cooldown THEN
    RAISE EXCEPTION 'AI evaluation cooldown active';
  END IF;
  UPDATE activities SET last_evaluation_requested_at = now() WHERE id = NEW.activity_id;
  RETURN NEW;
END;$$;
CREATE TRIGGER trg_ai_evaluations_version
BEFORE INSERT ON ai_evaluations
FOR EACH ROW EXECUTE FUNCTION enforce_ai_evaluation_version();
```

#### camp_days, activity_schedules, group_tasks
Analogiczne polityki SELECT dla członków, INSERT/UPDATE/DELETE dla adminów (oraz edytorów gdy dotyczy aktywności).

### 4.4 Trigger aktualizacji `updated_at`
Wspólny trigger dla tabel z kolumną `updated_at`.
```
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;$$;
-- przykładowo
CREATE TRIGGER trg_set_updated_at_groups BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```
Analogicznie dla pozostałych: activities, camp_days, activity_schedules, group_tasks.

### 4.5 Soft delete
Zamiast fizycznego DELETE na `groups`, `activities` – UPDATE ustawiający `deleted_at`. Policies mogą blokować fizyczny DELETE.

## 5. Uwagi projektowe

- Normalizacja: 3NF; powtarzalne wartości ról ograniczone CHECK, brak denormalizacji poza widokami agregującymi.
- `activities`: 10 kolumn tekstowych zapewnia indeksowalność i prostą walidację, zamiast JSON.
- `suggestions` w `ai_evaluations` jedyne pole JSONB (zmienna długość listy pytań) – ograniczenie długości przez CHECK.
- Soft delete chroni przed utratą danych historycznych i pozwala zachować spójność referencyjną.
- Rate limiting w triggerze na `ai_evaluations` wykorzystuje pole w `activities` minimalizując koszt dodatkowej tabeli.
- Widoki `group_dashboard_stats` i `user_group_permissions` upraszczają zapytania frontendu i mogą być materializowane przy wzroście skali.
- Ewentualne zapobieganie nakładaniu się bloków czasu: w przyszłości można dodać kolumnę `starts_at` (`timestamptz`) łączącą datę dnia i czas, a następnie EXCLUDE USING GIST (`camp_day_id` WITH =, tsrange(starts_at, ends_at) WITH &&).
- Ograniczenie CASCADE: użyte tylko gdy rekord zależny nie ma sensu bez rodzica (`activity_schedules`, `activity_editors`, `ai_evaluations`).
- Indeksy partial wykorzystują `deleted_at IS NULL` aby ograniczyć rozmiar.
- Możliwe rozszerzenie: full-text search po wybranych kolumnach – zależnie od potrzeb można utworzyć dedykowany tsvector w materialized view.
- Skalowalność: wszystkie UUID, brak sequences krytycznych dla sharding; logiczna partycjonacja po `group_id` możliwa w przyszłości (np. partitioned table `activities` BY HASH (group_id)).
- Bezpieczeństwo: RLS centralny mechanizm, funkcja `user_group_role` STABLE umożliwia plan re-use.
- Utrzymanie spójności dat `camp_days`: walidacja okresu w triggerze zapobiega anomaliom przy zmianie daty obozu.

---
Dokument gotowy jako podstawa do implementacji migracji.
