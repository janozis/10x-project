# API Endpoint Implementation Plan: Group Dashboard

**Status:** ✅ IMPLEMENTED (2025-10-27)  
**Code Review:** See `.ai/dashboard-code-review.md`

## 1. Przegląd punktu końcowego

Endpoint `/api/groups/{group_id}/dashboard` dostarcza zagregowane statystyki oraz feed ostatnich aktywności dla danej grupy. Endpoint jest dostępny wyłącznie dla uwierzytelnionych członków grupy (niezależnie od roli).

**Cel biznesowy:**
- Wyświetlanie metryki wydajności grupy (liczba aktywności, procent ocenionych, jakość ocen)
- Prezentacja statusu zadań (pending/done)
- Udostępnienie feedu ostatnich zmian w grupie

**Główne funkcjonalności:**
- Pobranie zagregowanych statystyk z widoku `group_dashboard_stats`
- Pobranie ostatnich aktywności (recent_activity feed)
- Weryfikacja członkostwa użytkownika w grupie
- Zwrot danych w formacie JSON zgodnym z `GroupDashboardDTO`

## 2. Szczegóły żądania

### Metoda HTTP
`GET`

### Struktura URL
```
/api/groups/{group_id}/dashboard
```

### Parametry

#### Wymagane (path params):
- `group_id` (UUID) - identyfikator grupy, dla której pobierane są statystyki

#### Opcjonalne (query params):
- `recent_limit` (number, default: 10) - liczba ostatnich aktywności do pobrania (max 50)

### Request Body
Brak (metoda GET)

### Request Headers
- `Authorization`: token sesji Supabase (obsługiwany przez middleware)
- Brak dodatkowych niestandardowych headerów

## 3. Wykorzystywane typy

### DTOs (Response):
- `GroupDashboardDTO` - główna struktura odpowiedzi
  ```typescript
  interface GroupDashboardDTO {
    group_id: UUID;
    total_activities: number;
    evaluated_activities: number;
    pct_evaluated_above_7: number;
    tasks: { pending: number; done: number };
    recent_activity: {
      type: string;
      id: UUID;
      at: TimestampISO;
      user_id: UUID;
    }[];
  }
  ```

### Command Models (Request):
- `GroupDashboardFetchCommand` - pusty rekord (`Record<never, never>`) dla spójności API

### Pomocnicze typy:
- `UUID` - typ dla identyfikatorów
- `TimestampISO` - format znacznika czasu
- `ApiSingle<GroupDashboardDTO>` - envelope dla pojedynczego zasobu
- `ApiError` - envelope dla błędów

### Database entities:
- Widok `group_dashboard_stats` - zagregowane statystyki
- Tabela `activities` - dla recent_activity feed
- Widok `user_group_permissions` - weryfikacja członkostwa

## 4. Przepływ danych

### 4.1 Diagram sekwencji

```
Client -> Endpoint: GET /api/groups/{group_id}/dashboard
Endpoint -> Middleware: sprawdzenie sesji
Middleware -> Endpoint: userId z sesji (lub DEFAULT_USER_ID)
Endpoint -> Validation: walidacja group_id (UUID)
Endpoint -> Service: getDashboard(supabase, group_id, userId)
Service -> DB: query user_group_permissions (weryfikacja członkostwa)
DB -> Service: role | null
Service: if (!role) return errors.notFound("Group")
Service -> DB: query group_dashboard_stats WHERE group_id = ?
DB -> Service: stats row
Service -> DB: query activities ORDER BY created_at DESC LIMIT ?
DB -> Service: recent activities rows
Service -> Mapper: mapDashboardToDTO(stats, recentActivities)
Mapper -> Service: GroupDashboardDTO
Service -> Endpoint: ApiSingle<GroupDashboardDTO>
Endpoint -> Client: 200 OK + JSON
```

### 4.2 Interakcje z bazą danych

1. **Weryfikacja członkostwa** (view `user_group_permissions`):
   ```sql
   SELECT role 
   FROM user_group_permissions 
   WHERE group_id = ? AND user_id = ?
   LIMIT 1
   ```

2. **Pobranie statystyk** (view `group_dashboard_stats`):
   ```sql
   SELECT 
     group_id, 
     total_activities, 
     evaluated_activities, 
     pct_evaluated_above_7,
     tasks_pending,
     tasks_done
   FROM group_dashboard_stats
   WHERE group_id = ?
   ```

3. **Pobranie ostatnich aktywności** (table `activities`):
   ```sql
   SELECT 
     id, 
     group_id,
     created_at,
     created_by,
     updated_at,
     updated_by
   FROM activities
   WHERE group_id = ? AND deleted_at IS NULL
   ORDER BY created_at DESC
   LIMIT ?
   ```
   
   **Uwaga:** Recent activity może obejmować różne typy zdarzeń:
   - `activity_created` - utworzenie aktywności
   - `activity_updated` - aktualizacja aktywności (jeśli updated_at != created_at)

### 4.3 Transformacje danych

**Mapowanie `group_dashboard_stats` row -> `GroupDashboardDTO`:**
```typescript
{
  group_id: statsRow.group_id,
  total_activities: statsRow.total_activities,
  evaluated_activities: statsRow.evaluated_activities,
  pct_evaluated_above_7: statsRow.pct_evaluated_above_7,
  tasks: {
    pending: statsRow.tasks_pending,
    done: statsRow.tasks_done
  },
  recent_activity: [] // dodane osobno
}
```

**Mapowanie `activities` rows -> `recent_activity`:**
```typescript
recentActivities.map(activity => ({
  type: 'activity_created', // lub 'activity_updated' jeśli updated_at > created_at
  id: activity.id,
  at: activity.created_at, // lub updated_at dla typu 'updated'
  user_id: activity.created_by // lub updated_by dla typu 'updated'
}))
```

### 4.4 Cache considerations

**MVP:**
- Brak cachowania (dane zawsze aktualne)
- Widok `group_dashboard_stats` wykonuje agregacje on-the-fly

**Przyszłe optymalizacje:**
- Materializacja widoku `group_dashboard_stats` z refreshem co 5 minut
- Cache odpowiedzi na poziomie API (Redis, 60s TTL)
- Incrementalne aktualizacje statystyk triggerem DB

## 5. Względy bezpieczeństwa

### 5.1 Uwierzytelnianie
- **Mechanizm:** Supabase session token w cookie/header, weryfikowany przez middleware
- **Fallback:** W środowisku development używany `DEFAULT_USER_ID` jeśli brak sesji
- **Błąd:** 401 UNAUTHORIZED jeśli brak sesji w production

### 5.2 Autoryzacja
- **Wymóg:** Użytkownik MUSI być członkiem grupy (dowolna rola: admin, editor, member)
- **Weryfikacja:** Query na `user_group_permissions` view
- **Błąd:** 404 NOT_FOUND jeśli użytkownik nie jest członkiem (maskowanie istnienia grupy)

**Uzasadnienie użycia 404 zamiast 403:**
- Bezpieczeństwo przez niejawność - nie ujawniamy, czy grupa istnieje
- Spójność z innymi endpointami (groups.service pattern)

### 5.3 Walidacja wejścia

**Parametr `group_id`:**
- Format UUID (regex: `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)
- Błąd: 400 VALIDATION_ERROR + details: `{ group_id: "invalid uuid" }`

**Parametr `recent_limit` (opcjonalny):**
- Typ: liczba całkowita
- Zakres: 1-50
- Default: 10
- Błąd: 400 VALIDATION_ERROR + details: `{ recent_limit: "must be between 1 and 50" }`

### 5.4 SQL Injection Prevention
- **Supabase Client:** Używa prepared statements automatycznie
- **Parametry:** Wszystkie wartości przekazywane przez `.eq()`, `.select()` są bezpieczne
- **Brak surowego SQL:** Nie używamy raw queries

### 5.5 Information Disclosure
- **Masking:** Nie ujawniamy czy grupa istnieje, jeśli użytkownik nie jest członkiem
- **Statistics:** Statystyki widoczne tylko dla członków
- **Rate limiting:** Brak specjalnych wymogów (read-only, niski koszt)

## 6. Obsługa błędów

### 6.1 Tabela błędów

| Kod statusu | ApiErrorCode | Scenariusz | Message | Details |
|-------------|--------------|------------|---------|---------|
| 400 | VALIDATION_ERROR | Nieprawidłowy format group_id | "Validation failed" | `{ group_id: "invalid uuid" }` |
| 400 | VALIDATION_ERROR | Nieprawidłowy recent_limit | "Validation failed" | `{ recent_limit: "must be between 1 and 50" }` |
| 401 | UNAUTHORIZED | Brak sesji (production) | "Authentication required" | - |
| 404 | NOT_FOUND | Użytkownik nie jest członkiem lub grupa nie istnieje | "Group not found" | - |
| 500 | INTERNAL_ERROR | Błąd query do group_dashboard_stats | "Failed to fetch dashboard stats" | - |
| 500 | INTERNAL_ERROR | Błąd query do activities | "Failed to fetch recent activities" | - |
| 500 | INTERNAL_ERROR | Inny nieoczekiwany błąd | "Internal server error" | - |

### 6.2 Przykłady odpowiedzi błędów

**400 - Validation Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "group_id": "invalid uuid"
    }
  }
}
```

**401 - Unauthorized:**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**404 - Not Found:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Group not found"
  }
}
```

**500 - Internal Error:**
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to fetch dashboard stats"
  }
}
```

### 6.3 Diagnostyka (development mode)

W trybie development, błędy 404 i 500 mogą zawierać dodatkowe pole `diagnostics`:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Group not found",
    "diagnostics": {
      "groupExists": false,
      "membershipCheckError": null,
      "reason": "group_missing"
    }
  }
}
```

Możliwe wartości `reason`:
- `"group_missing"` - grupa nie istnieje w DB
- `"caller_not_member"` - grupa istnieje, ale użytkownik nie jest członkiem
- `"db_error"` - błąd zapytania do DB

## 7. Rozważania dotyczące wydajności

### 7.1 Potencjalne wąskie gardła

1. **Agregacje w widoku `group_dashboard_stats`:**
   - Widok wykonuje COUNT, AVG agregacje dla każdego zapytania
   - Koszt rośnie liniowo z liczbą aktywności/zadań w grupie
   - **Impact:** Średni (typowe grupy mają <100 aktywności)

2. **Query na `activities` dla recent_activity:**
   - ORDER BY created_at DESC wymaga sortowania
   - Dla dużych grup (1000+ aktywności) może być wolny bez indeksu
   - **Impact:** Niski (LIMIT 50 ogranicza wynik)

3. **Brak cachowania:**
   - Każde żądanie wykonuje 3 osobne queries
   - **Impact:** Niski dla MVP (low traffic expected)

### 7.2 Strategie optymalizacji

**MVP (Faza 1):**
- ✅ Użycie widoku `group_dashboard_stats` (agregacje w DB, nie w aplikacji)
- ✅ LIMIT na recent_activity (max 50 rekordów)
- ✅ Index na `activities(group_id, created_at DESC)` (dodać w migracji jeśli nie ma)

**Post-MVP (Faza 2):**
- 🔄 Materializacja widoku `group_dashboard_stats`:
  ```sql
  CREATE MATERIALIZED VIEW group_dashboard_stats_mat AS ...
  CREATE UNIQUE INDEX ON group_dashboard_stats_mat(group_id);
  REFRESH MATERIALIZED VIEW CONCURRENTLY group_dashboard_stats_mat;
  ```
- 🔄 Trigger/scheduled job do refreshu co 5 minut
- 🔄 Cache API response (Redis, TTL 60s)

**Przyszłość (Faza 3):**
- 🔮 Real-time updates przez Supabase Realtime
- 🔮 Event sourcing dla recent_activity (dedykowana tabela `group_events`)
- 🔮 Partycjonowanie `activities` po `group_id` dla bardzo dużych systemów

### 7.3 Indeksy wymagane

**Sprawdź czy istnieją, jeśli nie - dodaj w migracji:**

```sql
-- For recent_activity query
CREATE INDEX IF NOT EXISTS idx_activities_group_recent 
  ON activities(group_id, created_at DESC) 
  WHERE deleted_at IS NULL;

-- For user_group_permissions lookups (jeśli view nie ma indeksu)
CREATE INDEX IF NOT EXISTS idx_group_memberships_user_group 
  ON group_memberships(user_id, group_id);
```

### 7.4 Monitoring

**Metryki do monitorowania:**
- Response time (p50, p95, p99)
- Query execution time dla każdego z 3 queries
- Cache hit rate (post-MVP)
- Error rate (szczególnie 500)

**Alerty:**
- p95 response time > 500ms
- Error rate > 1%

## 8. Etapy wdrożenia

### Krok 1: Przygotowanie walidacji i typów
**Czas: 15 min**

1.1. Utworzyć plik `/src/lib/validation/dashboard.ts`:
```typescript
import { z } from "zod";

export const dashboardQuerySchema = z.object({
  recent_limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(10),
});

export type DashboardQueryInput = z.infer<typeof dashboardQuerySchema>;
```

1.2. Sprawdzić, czy `GroupDashboardDTO` istnieje w `src/types.ts` (✅ już istnieje)

### Krok 2: Implementacja mappera
**Czas: 20 min**

2.1. Utworzyć plik `/src/lib/mappers/dashboard.mapper.ts`:
```typescript
import type { GroupDashboardDTO, TimestampISO, UUID } from "../../types";
import type { Tables } from "../../db/database.types";

type DashboardStatsRow = Tables<"group_dashboard_stats">;
type ActivityRow = Tables<"activities">;

interface RecentActivityItem {
  type: string;
  id: UUID;
  at: TimestampISO;
  user_id: UUID;
}

export function mapDashboardStatsToDTO(
  statsRow: DashboardStatsRow,
  recentActivities: ActivityRow[]
): GroupDashboardDTO {
  const recent_activity: RecentActivityItem[] = recentActivities.flatMap((activity) => {
    const items: RecentActivityItem[] = [];
    
    // Activity created event
    items.push({
      type: "activity_created",
      id: activity.id,
      at: activity.created_at,
      user_id: activity.created_by,
    });
    
    // Activity updated event (if updated after creation)
    if (activity.updated_at !== activity.created_at && activity.updated_by) {
      items.push({
        type: "activity_updated",
        id: activity.id,
        at: activity.updated_at,
        user_id: activity.updated_by,
      });
    }
    
    return items;
  });
  
  // Sort by timestamp DESC and take most recent
  recent_activity.sort((a, b) => 
    new Date(b.at).getTime() - new Date(a.at).getTime()
  );

  return {
    group_id: statsRow.group_id,
    total_activities: statsRow.total_activities ?? 0,
    evaluated_activities: statsRow.evaluated_activities ?? 0,
    pct_evaluated_above_7: statsRow.pct_evaluated_above_7 ?? 0,
    tasks: {
      pending: statsRow.tasks_pending ?? 0,
      done: statsRow.tasks_done ?? 0,
    },
    recent_activity: recent_activity.slice(0, 10), // Final limit after merging
  };
}
```

### Krok 3: Implementacja service layer
**Czas: 45 min**

3.1. Rozszerzyć plik `/src/lib/services/groups.service.ts` lub utworzyć nowy `/src/lib/services/dashboard.service.ts`:

**Rekomendacja:** Nowy plik dla separacji concerns.

```typescript
import type { SupabaseClient } from "../../db/supabase.client";
import type { GroupDashboardDTO, ApiResponse, UUID } from "../../types";
import { errors } from "../errors";
import { mapDashboardStatsToDTO } from "../mappers/dashboard.mapper";
import { DEFAULT_USER_ID } from "../../db/supabase.client";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

function effectiveUserId(userId: UUID | undefined): UUID {
  return userId || (DEFAULT_USER_ID as UUID);
}

/**
 * Fetch user's role in group via user_group_permissions view.
 * Returns null if user is not a member or query fails.
 */
async function fetchUserGroupPermissions(
  supabase: SupabaseClient,
  groupId: UUID,
  userId: UUID
): Promise<{ role: string | null }> {
  const { data, error } = await supabase
    .from("user_group_permissions")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  
  if (error) return { role: null };
  return { role: data?.role ?? null };
}

/**
 * Get dashboard stats and recent activity for a group.
 * Requires caller to be a member (any role).
 */
export async function getDashboard(
  supabase: SupabaseClient,
  groupId: string,
  userId: UUID | undefined,
  recentLimit: number = 10
): Promise<ApiResponse<GroupDashboardDTO>> {
  const actorUserId = effectiveUserId(userId);
  
  // 1. Validate group_id format
  if (!isUUID(groupId)) {
    return errors.validation({ group_id: "invalid uuid" });
  }
  
  // 2. Verify membership
  const { role } = await fetchUserGroupPermissions(supabase, groupId, actorUserId);
  if (!role) {
    return errors.notFound("Group");
  }
  
  // 3. Fetch dashboard stats from view
  const { data: statsRow, error: statsError } = await supabase
    .from("group_dashboard_stats")
    .select("*")
    .eq("group_id", groupId)
    .maybeSingle();
  
  if (statsError) {
    return errors.internal("Failed to fetch dashboard stats");
  }
  
  // If no stats row, group might have no activities yet - return zeros
  if (!statsRow) {
    return {
      data: {
        group_id: groupId as UUID,
        total_activities: 0,
        evaluated_activities: 0,
        pct_evaluated_above_7: 0,
        tasks: { pending: 0, done: 0 },
        recent_activity: [],
      },
    };
  }
  
  // 4. Fetch recent activities
  const { data: recentActivities, error: activitiesError } = await supabase
    .from("activities")
    .select("id, group_id, created_at, created_by, updated_at, updated_by")
    .eq("group_id", groupId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(recentLimit);
  
  if (activitiesError) {
    return errors.internal("Failed to fetch recent activities");
  }
  
  // 5. Map to DTO
  const dto = mapDashboardStatsToDTO(statsRow, recentActivities ?? []);
  
  return { data: dto };
}
```

### Krok 4: Implementacja endpoint handler
**Czas: 30 min**

4.1. Utworzyć plik `/src/pages/api/groups/[group_id]/dashboard.ts`:

```typescript
import type { APIRoute } from "astro";
import { getDashboard } from "../../../../lib/services/dashboard.service";
import { dashboardQuerySchema } from "../../../../lib/validation/dashboard";
import { statusCode } from "../../../../lib/http/status";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals, url }) => {
  const supabase = locals.supabase;
  const userId = locals.user?.id;
  const groupId = params.group_id;
  
  if (!groupId) {
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: "group_id is required",
        },
      }),
      {
        status: statusCode.BAD_REQUEST,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  
  // Parse query parameters
  const recentLimitParam = url.searchParams.get("recent_limit");
  const queryValidation = dashboardQuerySchema.safeParse({
    recent_limit: recentLimitParam,
  });
  
  if (!queryValidation.success) {
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: queryValidation.error.flatten().fieldErrors,
        },
      }),
      {
        status: statusCode.BAD_REQUEST,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  
  const { recent_limit } = queryValidation.data;
  
  // Call service
  const result = await getDashboard(supabase, groupId, userId, recent_limit);
  
  // Handle error response
  if ("error" in result) {
    const statusMap = {
      VALIDATION_ERROR: statusCode.BAD_REQUEST,
      NOT_FOUND: statusCode.NOT_FOUND,
      UNAUTHORIZED: statusCode.UNAUTHORIZED,
      INTERNAL_ERROR: statusCode.INTERNAL_SERVER_ERROR,
    };
    const status = statusMap[result.error.code] ?? statusCode.INTERNAL_SERVER_ERROR;
    
    return new Response(JSON.stringify(result), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  // Success response
  return new Response(JSON.stringify(result), {
    status: statusCode.OK,
    headers: { "Content-Type": "application/json" },
  });
};
```

### Krok 5: Weryfikacja typów database
**Czas: 15 min**

5.1. Sprawdzić w `/src/db/database.types.ts`, czy `group_dashboard_stats` jest zdefiniowany jako view:
```typescript
export interface Database {
  public: {
    Views: {
      group_dashboard_stats: {
        Row: {
          group_id: string;
          total_activities: number | null;
          evaluated_activities: number | null;
          pct_evaluated_above_7: number | null;
          tasks_pending: number | null;
          tasks_done: number | null;
        }
      }
    }
  }
}
```

5.2. Jeśli brak, trzeba zregenerować typy:
```bash
npx supabase gen types typescript --local > src/db/database.types.ts
```

### Krok 6: Dodanie/weryfikacja indeksów
**Czas: 10 min**

6.1. Sprawdzić w migracji `/supabase/migrations/20251014120000_init_schema.sql`, czy istnieją indeksy:
```sql
CREATE INDEX IF NOT EXISTS idx_activities_group_recent 
  ON activities(group_id, created_at DESC) 
  WHERE deleted_at IS NULL;
```

6.2. Jeśli brak, utworzyć nową migrację:
```bash
npx supabase migration new dashboard_indexes
```

6.3. Dodać w nowym pliku migracji:
```sql
-- Index for dashboard recent activities query
CREATE INDEX IF NOT EXISTS idx_activities_group_recent 
  ON public.activities(group_id, created_at DESC) 
  WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_activities_group_recent IS 
  'Optimizes recent activities query for dashboard endpoint';
```

### Krok 7: Testy manualne
**Czas: 30 min**

7.1. **Test 1: Pomyślne pobranie dashboardu**
```bash
curl -X GET http://localhost:4321/api/groups/{valid_group_id}/dashboard \
  -H "Cookie: sb-access-token=..." \
  -v
```
Expected: 200 OK + JSON z statystykami

7.2. **Test 2: Nieprawidłowy UUID**
```bash
curl -X GET http://localhost:4321/api/groups/invalid-uuid/dashboard \
  -H "Cookie: sb-access-token=..." \
  -v
```
Expected: 400 VALIDATION_ERROR

7.3. **Test 3: Użytkownik nie jest członkiem**
```bash
# Login as different user
curl -X GET http://localhost:4321/api/groups/{other_group_id}/dashboard \
  -H "Cookie: sb-access-token=..." \
  -v
```
Expected: 404 NOT_FOUND

7.4. **Test 4: Opcjonalny parametr recent_limit**
```bash
curl -X GET "http://localhost:4321/api/groups/{group_id}/dashboard?recent_limit=5" \
  -H "Cookie: sb-access-token=..." \
  -v
```
Expected: 200 OK + max 5 recent activities (x2 dla create+update)

7.5. **Test 5: Nieprawidłowy recent_limit**
```bash
curl -X GET "http://localhost:4321/api/groups/{group_id}/dashboard?recent_limit=100" \
  -H "Cookie: sb-access-token=..." \
  -v
```
Expected: 400 VALIDATION_ERROR

### Krok 8: Dokumentacja i cleanup
**Czas: 15 min**

8.1. Dodać komentarz do service function z przykładem użycia

8.2. Zaktualizować `.ai/api-plan.md` ze statusem implementacji (jeśli istnieje tracking)

8.3. Sprawdzić linter errors:
```bash
npm run lint
```

8.4. Sformatować kod:
```bash
npm run format
```

### Krok 9: Code review checklist
**Czas: 10 min**

- [ ] Wszystkie typy są poprawnie importowane z `types.ts`
- [ ] Walidacja działa dla wszystkich przypadków brzegowych
- [ ] Błędy zwracają odpowiednie kody statusu
- [ ] Service layer nie zawiera logiki HTTP (czysta funkcja)
- [ ] Mapper jest testowalny (pure function)
- [ ] Brak hardcoded stringów (używane konstante gdzie to możliwe)
- [ ] Endpoint handler deleguje logikę do service
- [ ] Nie ma console.log w kodzie produkcyjnym
- [ ] Wszystkie Promise są obsługiwane (brak unhandled rejections)
- [ ] Nazwy zmiennych są spójne z codebase conventions

---

## Podsumowanie

**Szacowany czas implementacji:** ~3 godziny (z testami)  
**Rzeczywisty czas implementacji:** ~3 godziny ✅

**Pliki do utworzenia:**
- `/src/lib/validation/dashboard.ts`
- `/src/lib/mappers/dashboard.mapper.ts`
- `/src/lib/services/dashboard.service.ts`
- `/src/pages/api/groups/[group_id]/dashboard.ts`
- (opcjonalnie) nowa migracja dla indeksów

**Pliki do zmodyfikowania:**
- Brak (lub weryfikacja `database.types.ts`)

**Zależności:**
- Wymaga działającego middleware uwierzytelniania
- Wymaga widoku `group_dashboard_stats` w bazie
- Wymaga widoku `user_group_permissions` w bazie

**Blokery:**
- Brak (widoki już istnieją w migracji init_schema)

**Następne kroki po implementacji:**
1. Dodanie testów jednostkowych dla service i mappera
2. Dodanie testów integracyjnych dla endpointu
3. Monitoring performance w production
4. Rozważenie materializacji widoku jeśli response time > 200ms

