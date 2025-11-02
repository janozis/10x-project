# API Endpoint Implementation Plan: Group Permissions

## Status implementacji

✅ **Zaimplementowano:**
- Mapper: `src/lib/mappers/permissions.mapper.ts`
- Service: `src/lib/services/permissions.service.ts`
- Endpoint: `src/pages/api/groups/[group_id]/permissions.ts`
- Curl examples: `notatki/permissions-curl-examples`

## 1. Przegląd punktu końcowego

Endpoint zwraca efektywne uprawnienia aktualnie zalogowanego użytkownika w kontekście danej grupy. Wykorzystuje widok bazodanowy `user_group_permissions`, który agreguje rolę użytkownika i wynikające z niej flagi uprawnień.

**Cel biznesowy:**
- Umożliwienie frontendowi szybkiego sprawdzenia uprawnień użytkownika bez konieczności złożonej logiki po stronie klienta
- Wsparcie dla warunkowego renderowania UI (np. pokazywanie/ukrywanie przycisków edycji)
- Optymalizacja - pojedyncze zapytanie zamiast wielu sprawdzeń ról

**Kluczowe cechy:**
- Read-only (GET)
- Wymaga autentykacji
- Szybka odpowiedź (query na widoku z indeksami)
- Zwraca 404 dla nie-członków (security by obscurity)

## 2. Szczegóły żądania

**Metoda HTTP:** `GET`

**Struktura URL:** `/api/groups/{group_id}/permissions`

**Parametry:**
- **Wymagane:**
  - `group_id` (path parameter) - UUID grupy, format: `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`

- **Opcjonalne:** Brak

**Request Headers:**
- `Authorization: Bearer <access_token>` (wymagany - middleware zapewnia)

**Request Body:** Brak (GET endpoint)

**Query Parameters:** Brak

## 3. Wykorzystywane typy

### DTOs (z `src/types.ts`):

```typescript
// Zwracany typ (linie 225-228)
export interface GroupPermissionsDTO
  extends Pick<UserGroupPermissionsEntity, "role" | "can_edit_all" | "can_edit_assigned_only"> {
  group_id: UUID;
}
```

### Entity Types:

```typescript
// Typ widoku bazodanowego (linia 93)
export type UserGroupPermissionsEntity = Tables<"user_group_permissions">;

// Struktura row z database.types.ts:
{
  user_id: string | null;
  group_id: string | null;
  role: string | null; // 'admin' | 'editor' | 'member'
  can_edit_all: boolean | null;
  can_edit_assigned_only: boolean | null;
}
```

### Command Models:

```typescript
// Pusta komenda dla GET (linia 368)
export type GroupPermissionsFetchCommand = Record<never, never>;
```

### Utility Types:

```typescript
export type UUID = string;
export type ApiResponse<T> = ApiSingle<T> | ApiError;
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK):

```json
{
  "data": {
    "group_id": "123e4567-e89b-12d3-a456-426614174000",
    "role": "editor",
    "can_edit_all": false,
    "can_edit_assigned_only": true
  }
}
```

**Content-Type:** `application/json; charset=utf-8`

### Możliwe odpowiedzi błędów:

#### 400 Bad Request - Nieprawidłowy format UUID
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid group_id format",
    "details": {
      "group_id": "invalid uuid"
    }
  }
}
```

#### 401 Unauthorized - Brak autentykacji
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

#### 404 Not Found - Użytkownik nie jest członkiem grupy lub grupa nie istnieje
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Group not found"
  }
}
```

**Uwaga:** Zwracamy 404 zamiast 403 aby nie ujawniać istnienia grupy użytkownikom spoza niej (security by obscurity).

#### 500 Internal Server Error - Błąd bazy danych
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to fetch permissions"
  }
}
```

## 5. Przepływ danych

### Diagram sekwencji:

```
Client → Middleware: GET /api/groups/{group_id}/permissions
Middleware → Middleware: Verify JWT token
Middleware → Endpoint: Request + locals.user + locals.supabase
Endpoint → Service: getGroupPermissions(supabase, groupId, userId)
Service → Service: Validate UUID format
Service → Supabase: Query user_group_permissions view
Supabase → Service: Row {user_id, group_id, role, can_edit_all, can_edit_assigned_only}
Service → Service: Map to GroupPermissionsDTO
Service → Endpoint: ApiResponse<GroupPermissionsDTO>
Endpoint → Client: JSON response (200 OK)
```

### Warunki błędów:

```
IF invalid UUID format:
  Service → Endpoint: errors.validation()
  Endpoint → Client: 400 Bad Request

IF no row returned (not a member):
  Service → Endpoint: errors.notFound("Group")
  Endpoint → Client: 404 Not Found

IF database error:
  Service → Endpoint: errors.internal("Failed to fetch permissions")
  Endpoint → Client: 500 Internal Server Error
```

### Szczegóły zapytania do bazy:

**View query (wykonane w service):**
```sql
SELECT user_id, group_id, role, can_edit_all, can_edit_assigned_only
FROM user_group_permissions
WHERE user_id = $1 AND group_id = $2
LIMIT 1;
```

**Definicja widoku (referencja):**
```sql
CREATE VIEW user_group_permissions AS
SELECT
  gm.user_id,
  gm.group_id,
  gm.role,
  CASE WHEN gm.role = 'admin' THEN true ELSE false END AS can_edit_all,
  CASE WHEN gm.role IN ('admin','editor') THEN true ELSE false END AS can_edit_assigned_only
FROM group_memberships gm;
```

## 6. Względy bezpieczeństwa

### Autentykacja:
- **Wymagana:** Tak
- **Mechanizm:** Supabase JWT token w header `Authorization: Bearer <token>`
- **Middleware:** `src/middleware/index.ts` waliduje token i wstrzykuje `locals.user` + `locals.supabase`
- **Fallback (dev):** DEFAULT_USER_ID gdy userId jest undefined (tylko dev mode)

### Autoryzacja:
- **Poziom 1 (Aplikacja):** Sprawdzenie czy użytkownik jest członkiem grupy poprzez query do `user_group_permissions`
- **Poziom 2 (Baza danych):** RLS policies na widoku `user_group_permissions` i tabeli `group_memberships`
- **Zasada:** Defense in depth - walidacja na obu poziomach

### Walidacja wejścia:
- **group_id:** Walidacja UUID regex: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
- **userId:** Zapewnione przez middleware (po walidacji tokenu)

### Ochrona przed atakami:

| Atak | Ochrona |
|------|---------|
| SQL Injection | Supabase client używa parametryzowanych zapytań |
| Path Traversal | UUID validation zapobiega manipulacji ścieżką |
| Enumeration | 404 dla nie-członków (nie ujawniamy czy grupa istnieje) |
| Rate Limiting | Middleware (zakładane, poza scope endpointu) |
| CSRF | Read-only GET, brak skutków ubocznych |

### Wrażliwe dane:
- **Zwracane:** Rola i uprawnienia (nie-wrażliwe, tylko dla członków)
- **Nie zwracane:** Lista innych członków, dane grupy, invite codes

### Logowanie bezpieczeństwa:
- Rekomendacja: Logować odmowy dostępu (404) dla analizy prób enumeration
- Format: `[SECURITY] User ${userId} attempted access to group ${groupId} permissions without membership`

## 7. Obsługa błędów

### Katalog błędów:

| Kod błędu | HTTP Status | Warunek wystąpienia | Akcja użytkownika |
|-----------|-------------|---------------------|-------------------|
| `BAD_REQUEST` | 400 | Nieprawidłowy format UUID w `group_id` | Sprawdź format ID grupy |
| `UNAUTHORIZED` | 401 | Brak tokenu auth lub token nieprawidłowy | Zaloguj się ponownie |
| `NOT_FOUND` | 404 | Użytkownik nie jest członkiem grupy LUB grupa nie istnieje | Sprawdź czy masz dostęp do grupy |
| `INTERNAL_ERROR` | 500 | Błąd bazy danych, timeout | Spróbuj ponownie za chwilę |

### Szczegóły implementacji obsługi błędów:

**W service (`permissions.service.ts`):**
```typescript
// 1. Walidacja UUID
if (!isValidUUID(groupId)) {
  return errors.validation({ group_id: "invalid uuid" });
}

// 2. Query do bazy
const { data, error } = await supabase
  .from("user_group_permissions")
  .select("*")
  .eq("user_id", userId)
  .eq("group_id", groupId)
  .maybeSingle();

// 3. Obsługa błędu DB
if (error) {
  console.error(`[DB Error] Failed to fetch permissions for user ${userId} in group ${groupId}:`, error);
  return errors.internal("Failed to fetch permissions");
}

// 4. Brak wyniku = nie-członek
if (!data) {
  // Security: nie ujawniamy czy grupa istnieje
  return errors.notFound("Group");
}
```

**W endpoint (`/api/groups/[group_id]/permissions.ts`):**
```typescript
export const GET: APIRoute = async ({ params, locals }) => {
  const { group_id } = params;
  const userId = locals.user?.id;

  // Early return dla braku autentykacji (już obsłużone przez middleware, defensive check)
  if (!userId) {
    return new Response(
      JSON.stringify(errors.unauthorized()),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const result = await getGroupPermissions(
    locals.supabase,
    group_id!,
    userId
  );

  if ("error" in result) {
    const statusMap = {
      BAD_REQUEST: 400,
      VALIDATION_ERROR: 400,
      UNAUTHORIZED: 401,
      NOT_FOUND: 404,
      INTERNAL_ERROR: 500,
    };
    const status = statusMap[result.error.code] || 500;
    return new Response(JSON.stringify(result), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
```

### Retry Strategy (dla klienta):
- **400, 401, 404:** Nie retry (błąd logiczny)
- **500, 503:** Retry z exponential backoff (max 3 próby)

## 8. Rozważania dotyczące wydajności

### Oczekiwana wydajność:
- **Średni czas odpowiedzi:** < 50ms (P50)
- **95 percentyl:** < 100ms (P95)
- **99 percentyl:** < 200ms (P99)

### Optymalizacje:

#### Na poziomie bazy danych:
1. **Indeksy:**
   - Existing: `idx_group_memberships_user` na `group_memberships(user_id)`
   - Existing: `idx_group_memberships_group` na `group_memberships(group_id)`
   - **Recommended:** Composite index na `group_memberships(user_id, group_id)` dla jeszcze szybszych lookupów
   ```sql
   CREATE INDEX IF NOT EXISTS idx_group_memberships_user_group 
   ON group_memberships(user_id, group_id);
   ```

2. **View materialization (future):**
   - Dla bardzo dużych systemów można rozważyć zmaterializowanie widoku
   - Wymaga REFRESH MATERIALIZED VIEW przy zmianach membership
   - Na tym etapie: NOT NEEDED (zwykły view jest wystarczająco szybki)

#### Na poziomie aplikacji:
1. **Caching (future enhancement):**
   - Redis cache z kluczem: `permissions:${userId}:${groupId}`
   - TTL: 5 minut (balance między friednością a spójnością)
   - Invalidacja przy zmianach roli (webhook/trigger)
   - **MVP: Skip caching** - premature optimization

2. **Connection pooling:**
   - Supabase client używa connection pooling out-of-the-box
   - No action needed

#### Monitoring:
```typescript
// Recommendation: Add timing logs
const startTime = Date.now();
const result = await getGroupPermissions(...);
const duration = Date.now() - startTime;
if (duration > 100) {
  console.warn(`[SLOW QUERY] Permissions fetch took ${duration}ms for group ${groupId}`);
}
```

### Limity i throttling:
- **Rate limit:** Shared z innymi GET endpoints (np. 100 req/min per user)
- **Nie potrzeba specjalnego throttling** - read-only, brak kosztownych operacji

### Potencjalne bottlenecki:
| Bottleneck | Prawdopodobieństwo | Mitigation |
|------------|-------------------|------------|
| Wolne zapytanie DB (brak indeksu) | Niskie | Indexes already exist |
| Zbyt wiele równoczesnych połączeń | Średnie | Supabase pooler handles this |
| Cold start (serverless) | Niskie | Astro SSR z warm instances |

## 9. Etapy wdrożenia

### Faza 1: Przygotowanie struktury

**1.1. Utworzenie mappera** (`src/lib/mappers/permissions.mapper.ts`)
```typescript
import type { UserGroupPermissionsEntity, GroupPermissionsDTO, UUID } from "../../types";

/**
 * Maps user_group_permissions view row to GroupPermissionsDTO.
 */
export function mapPermissionsRowToDTO(
  row: UserGroupPermissionsEntity
): GroupPermissionsDTO {
  return {
    group_id: row.group_id as UUID,
    role: row.role as "admin" | "editor" | "member",
    can_edit_all: row.can_edit_all ?? false,
    can_edit_assigned_only: row.can_edit_assigned_only ?? false,
  };
}
```

**1.2. Utworzenie service** (`src/lib/services/permissions.service.ts`)
```typescript
import type { SupabaseClient } from "../../db/supabase.client";
import type { GroupPermissionsDTO, ApiResponse, UUID } from "../../types";
import { errors } from "../errors";
import { mapPermissionsRowToDTO } from "../mappers/permissions.mapper";
import { DEFAULT_USER_ID } from "../../db/supabase.client";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

function effectiveUserId(userId: UUID | undefined): UUID {
  return userId || (DEFAULT_USER_ID as UUID);
}

/**
 * Get user's effective permissions within a group.
 * 
 * Authorization: User must be a member of the group.
 * Returns 404 if not a member (security by obscurity).
 * 
 * @param supabase - Supabase client from context.locals
 * @param groupId - Group UUID from path parameter
 * @param userId - Authenticated user ID (or undefined for dev fallback)
 * @returns ApiResponse with GroupPermissionsDTO or ApiError
 */
export async function getGroupPermissions(
  supabase: SupabaseClient,
  groupId: string,
  userId: UUID | undefined
): Promise<ApiResponse<GroupPermissionsDTO>> {
  const actorUserId = effectiveUserId(userId);

  // 1. Validate group_id format
  if (!isValidUUID(groupId)) {
    return errors.validation({ group_id: "invalid uuid" });
  }

  // 2. Query user_group_permissions view
  const { data, error } = await supabase
    .from("user_group_permissions")
    .select("*")
    .eq("user_id", actorUserId)
    .eq("group_id", groupId)
    .maybeSingle();

  // 3. Handle database error
  if (error) {
    console.error(
      `[DB Error] Failed to fetch permissions for user ${actorUserId} in group ${groupId}:`,
      error
    );
    return errors.internal("Failed to fetch permissions");
  }

  // 4. Handle not found (not a member)
  if (!data) {
    // Security: don't reveal whether group exists
    return errors.notFound("Group");
  }

  // 5. Map to DTO
  const dto = mapPermissionsRowToDTO(data);
  return { data: dto };
}
```

### Faza 2: Utworzenie endpointu

**2.1. Struktura katalogów**
```
src/pages/api/groups/[group_id]/
  - permissions.ts (← nowy plik)
```

**2.2. Implementacja endpointu** (`src/pages/api/groups/[group_id]/permissions.ts`)
```typescript
import type { APIRoute } from "astro";
import { getGroupPermissions } from "../../../../lib/services/permissions.service";

export const prerender = false;

/**
 * GET /api/groups/{group_id}/permissions
 * 
 * Returns current user's effective permissions within the group.
 * 
 * Authorization: User must be a member of the group.
 * 
 * Response 200: { "data": { "group_id": "uuid", "role": "editor", "can_edit_all": false, "can_edit_assigned_only": true } }
 * Response 400: Invalid group_id format
 * Response 401: Not authenticated
 * Response 404: User is not a member or group doesn't exist
 * Response 500: Internal server error
 */
export const GET: APIRoute = async ({ params, locals }) => {
  const { group_id } = params;
  const userId = locals.user?.id;

  // Defensive check (should be handled by middleware)
  if (!userId) {
    return new Response(
      JSON.stringify({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }
    );
  }

  // Call service
  const result = await getGroupPermissions(
    locals.supabase,
    group_id!,
    userId
  );

  // Handle errors
  if ("error" in result) {
    const statusMap: Record<string, number> = {
      BAD_REQUEST: 400,
      VALIDATION_ERROR: 400,
      UNAUTHORIZED: 401,
      NOT_FOUND: 404,
      INTERNAL_ERROR: 500,
    };
    const status = statusMap[result.error.code] || 500;
    
    return new Response(JSON.stringify(result), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  // Success
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
```

### Faza 3: Testowanie

**3.1. Unit tests (opcjonalne, przyszłość)**
- Test mappera: `permissions.mapper.test.ts`
- Test service: `permissions.service.test.ts`

**3.2. Testy manualne z curl**

Pełny zestaw przykładów curl dostępny w pliku: `notatki/permissions-curl-examples`

**Test 1: Sukces (200) - członek grupy**
```bash
# Setup: Uzyskaj token i group_id (zakładamy że użytkownik jest członkiem)
TOKEN="<valid_jwt_token>"
GROUP_ID="<existing_group_id>"

curl -X GET "http://localhost:3000/api/groups/${GROUP_ID}/permissions" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"

# Expected:
# Status: 200
# Body: { "data": { "group_id": "...", "role": "admin|editor|member", "can_edit_all": true|false, "can_edit_assigned_only": true|false } }
```

**Test 2: Nieprawidłowy UUID (400)**
```bash
curl -X GET "http://localhost:3000/api/groups/invalid-uuid/permissions" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"

# Expected:
# Status: 400
# Body: { "error": { "code": "BAD_REQUEST", "message": "...", "details": { "group_id": "invalid uuid" } } }
```

**Test 3: Brak autentykacji (401)**
```bash
curl -X GET "http://localhost:3000/api/groups/${GROUP_ID}/permissions" \
  -H "Content-Type: application/json"

# Expected:
# Status: 401
# Body: { "error": { "code": "UNAUTHORIZED", "message": "Authentication required" } }
```

**Test 4: Nie-członek grupy (404)**
```bash
# Setup: Użyj tokenu użytkownika, który NIE jest członkiem grupy
OTHER_USER_TOKEN="<token_of_non_member>"

curl -X GET "http://localhost:3000/api/groups/${GROUP_ID}/permissions" \
  -H "Authorization: Bearer ${OTHER_USER_TOKEN}" \
  -H "Content-Type: application/json"

# Expected:
# Status: 404
# Body: { "error": { "code": "NOT_FOUND", "message": "Group not found" } }
```

**Test 5: Różne role**
```bash
# Test z użytkownikiem admin
curl -X GET "http://localhost:3000/api/groups/${GROUP_ID}/permissions" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
# Expected: "role": "admin", "can_edit_all": true, "can_edit_assigned_only": true

# Test z użytkownikiem editor
curl -X GET "http://localhost:3000/api/groups/${GROUP_ID}/permissions" \
  -H "Authorization: Bearer ${EDITOR_TOKEN}"
# Expected: "role": "editor", "can_edit_all": false, "can_edit_assigned_only": true

# Test z użytkownikiem member
curl -X GET "http://localhost:3000/api/groups/${GROUP_ID}/permissions" \
  -H "Authorization: Bearer ${MEMBER_TOKEN}"
# Expected: "role": "member", "can_edit_all": false, "can_edit_assigned_only": false
```

### Faza 4: Weryfikacja i deployment

**4.1. Checklist przed merge:**
- [x] Mapper utworzony i poprawnie mapuje pola
- [x] Service utworzony z pełną obsługą błędów
- [x] Endpoint utworzony z proper HTTP status codes
- [ ] Testy manualne przeszły dla wszystkich scenariuszy
- [x] Linter errors resolved (`npm run lint`)
- [x] TypeScript compilation passes (`npm run build`)
- [ ] Code review completed
- [x] Documentation updated (ten plan)
- [x] Curl examples created (`notatki/permissions-curl-examples`)

**4.2. Monitoring po deployment:**
- Monitor error rate dla 404 (może wskazywać próby enumeration)
- Monitor response time (powinien być < 100ms P95)
- Monitor wywołań per user (rate limiting effectiveness)

**4.3. Rollback plan:**
- Jeśli endpoint powoduje błędy: usunąć plik endpoint, restart
- Service i mapper są bezpieczne (nie-breaking, tylko dodane pliki)
- Brak zmian w schemacie DB - brak migracji do rollback

### Faza 5: Dokumentacja i follow-up

**5.1. Aktualizacja dokumentacji:**
- [x] Ten implementation plan
- [x] Utworzono plik `notatki/permissions-curl-examples` z przykładami testów
- [ ] Dodać przykłady do README.md (opcjonalne)
- [ ] API documentation (Swagger/OpenAPI - przyszłość)

**5.2. Potencjalne ulepszenia (future):**
- Caching permissions w Redis (TTL 5min)
- Rate limiting specificzny dla tego endpointu (obecnie: shared limit)
- Metrics collection (Prometheus/Grafana)
- Add composite index `(user_id, group_id)` na `group_memberships`

---

## 10. Przykłady integracji (frontend)

### Warunkowe renderowanie UI na podstawie uprawnień

```typescript
// Przykład użycia w React/Astro komponencie
async function checkPermissions(groupId: string) {
  const response = await fetch(`/api/groups/${groupId}/permissions`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    // Handle error
    return null;
  }
  
  const { data } = await response.json();
  return data;
}

// Warunkowe pokazywanie przycisków edycji
const permissions = await checkPermissions(groupId);
if (permissions?.can_edit_all) {
  // Pokaż przyciski edycji dla wszystkich aktywności
  <EditAllButton />
} else if (permissions?.can_edit_assigned_only) {
  // Pokaż przyciski edycji tylko dla przypisanych aktywności
  <EditAssignedButton />
}

// Sprawdzanie roli admina
if (permissions?.role === 'admin') {
  <AdminPanel />
}
```

### Cache po stronie klienta

```typescript
// Proste cachowanie w sessionStorage (5 min TTL)
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedPermissions(groupId: string) {
  const cached = sessionStorage.getItem(`permissions:${groupId}`);
  if (!cached) return null;
  
  const { data, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp > CACHE_TTL) {
    sessionStorage.removeItem(`permissions:${groupId}`);
    return null;
  }
  
  return data;
}

function setCachedPermissions(groupId: string, permissions: any) {
  sessionStorage.setItem(`permissions:${groupId}`, JSON.stringify({
    data: permissions,
    timestamp: Date.now()
  }));
}

// Użycie z cachem
async function getPermissions(groupId: string) {
  const cached = getCachedPermissions(groupId);
  if (cached) return cached;
  
  const permissions = await checkPermissions(groupId);
  if (permissions) {
    setCachedPermissions(groupId, permissions);
  }
  
  return permissions;
}
```

---

## Podsumowanie

Endpoint `/api/groups/{group_id}/permissions` jest prostym read-only endpointem zwracającym uprawnienia użytkownika w grupie. Implementacja składa się z:
1. **Mapper** - transformacja row → DTO
2. **Service** - logika biznesowa + walidacja + obsługa błędów
3. **Endpoint** - routing + HTTP responses

**Estymowany czas implementacji:** 1-2 godziny
**Złożoność:** Niska
**Risk level:** Bardzo niski (read-only, brak skutków ubocznych)

