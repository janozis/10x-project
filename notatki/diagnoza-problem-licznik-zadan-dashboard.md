# Diagnoza problemu: Nieprawidłowe liczniki zadań na dashboardzie

## Problem

Po dodaniu 12 aktywności z szablonu:
- ✅ Liczba zajęć: **12** (poprawnie)
- ❌ Liczba zadań: **12** (nieprawidłowo - powinno być 0 lub inna wartość)

## Przyczyna

Błąd znajduje się w widoku bazy danych `group_dashboard_stats` utworzonym w migracji `20251102000002_fix_dashboard_stats_rls.sql`.

### Problematyczna struktura zapytania:

```sql
select
  g.id as group_id,
  count(a.*) filter (where a.deleted_at is null) as total_activities,
  count(distinct ae.activity_id) as evaluated_activities,
  -- ...
  count(gt.*) filter (where gt.status in ('pending','in_progress')) as tasks_pending,
  count(gt.*) filter (where gt.status = 'done') as tasks_done
from public.groups g
left join public.activities a on a.group_id = g.id and a.deleted_at is null
left join public.ai_evaluations ae on ae.activity_id = a.id         -- JOIN #1
left join public.group_tasks gt on gt.group_id = g.id               -- JOIN #2
group by g.id;
```

### Mechanizm błędu: Kartezjański iloczyn (Cartesian Product)

Gdy masz:
- 12 aktywności (`activities`)
- Każda aktywność może mieć 1+ ocen AI (`ai_evaluations`)
- N zadań (`group_tasks`)

**Problem:** Wszystkie `LEFT JOIN` są wykonywane na tym samym poziomie, co powoduje kartezjański iloczyn między:
- kombinacjami `activities × ai_evaluations` 
- oraz `group_tasks`

### Przykład numeryczny:

Załóżmy:
- 12 aktywności
- 10 z nich ma oceny AI (każda po 1 ocenie) = 10 wierszy `ai_evaluations`
- 2 zadania w grupie

**Wynik JOIN:**
1. `activities LEFT JOIN ai_evaluations` = 22 wiersze (12 aktywności + 10 z oceną)
2. Te 22 wiersze × 2 zadania = **44 wiersze w wyniku**

**Efekt:**
```sql
count(gt.*) filter (where gt.status = 'done')
```
zlicza te 2 zadania wielokrotnie (raz dla każdej kombinacji aktywność+ocena), dając w efekcie liczbę ~12 zamiast rzeczywistej liczby zadań.

### Szczególne przypadki:

1. **Gdy nie ma ocen AI:** Problem nie występuje tak widocznie
2. **Gdy dodajesz aktywności z szablonu:** Często generowane są też oceny AI, co natychmiast ujawnia bug
3. **Gdy liczba aktywności = liczba zadań pokazywana:** Silny sygnał problemu kartezjańskiego iloczynu

## Rozwiązanie

Podziel agregacje na niezależne podzapytania (CTE lub subqueries), aby uniknąć kartezjańskiego iloczynu:

```sql
select
  g.id as group_id,
  coalesce(act_stats.total_activities, 0) as total_activities,
  coalesce(act_stats.evaluated_activities, 0) as evaluated_activities,
  coalesce(act_stats.pct_evaluated_above_7, 0) as pct_evaluated_above_7,
  coalesce(task_stats.tasks_pending, 0) as tasks_pending,
  coalesce(task_stats.tasks_done, 0) as tasks_done
from public.groups g
left join (
  -- Osobna agregacja dla aktywności i ocen
  select
    a.group_id,
    count(a.*) as total_activities,
    count(distinct ae.activity_id) as evaluated_activities,
    -- ... obliczenia procentów ...
  from public.activities a
  left join public.ai_evaluations ae on ae.activity_id = a.id
  where a.deleted_at is null
  group by a.group_id
) act_stats on act_stats.group_id = g.id
left join (
  -- ODDZIELNA agregacja dla zadań (bez mieszania z activities)
  select
    gt.group_id,
    count(*) filter (where gt.status in ('pending','in_progress')) as tasks_pending,
    count(*) filter (where gt.status = 'done') as tasks_done
  from public.group_tasks gt
  group by gt.group_id
) task_stats on task_stats.group_id = g.id;
```

## Jak zastosować fix:

```bash
# Metoda 1: Reset całej bazy (dla dev)
npx supabase db reset

# Metoda 2: Zastosuj tylko nową migrację
npx supabase migration up
```

## Weryfikacja poprawki:

Po zastosowaniu migracji, sprawdź dashboard:

```sql
-- Bezpośrednie zapytanie do widoku
SELECT * FROM group_dashboard_stats WHERE group_id = 'ba83b140-a884-48b2-813a-cbc6849e7213';

-- Sprawdź rzeczywistą liczbę zadań
SELECT status, count(*) 
FROM group_tasks 
WHERE group_id = 'ba83b140-a884-48b2-813a-cbc6849e7213'
GROUP BY status;
```

Powinieneś teraz zobaczyć:
- ✅ Zajęcia łącznie: **12**
- ✅ Zadania: **prawidłowa liczba** (np. 0 jeśli nie tworzyłeś zadań)

## Pliki dotknięte:

- ✅ Utworzono: `supabase/migrations/20251102120000_fix_dashboard_stats_cartesian_product.sql`
- ℹ️ Bez zmian w kodzie aplikacji (problem był tylko w SQL)

## Lekcje na przyszłość:

1. **Unikaj wielu LEFT JOIN na tym samym poziomie** gdy agregujeszróżne encje
2. **Używaj podzapytań/CTE** dla niezależnych agregacji
3. **Zawsze testuj widoki** z danymi testowymi, które ujawniają kartezjańskie iloczyny
4. **Sprawdzaj plany zapytań** (EXPLAIN) dla skomplikowanych widoków

## Dodatkowe uwagi:

Poprzednia migracja `20251102000002_fix_dashboard_stats_rls.sql` naprawiła problem z RLS (Row Level Security), ale wprowadziła inny problem - kartezjański iloczyn. Nowa migracja zachowuje `security_invoker = true` i naprawia problem mnoży.

