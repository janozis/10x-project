# API Endpoint Implementation Plan: Group Memberships & Roles

## 1. Przegląd punktu końcowego
Zestaw punktów końcowych do zarządzania członkostwem użytkowników w grupie oraz przypisywaniem ról. Obejmuje:
- Pobieranie listy członków (`GET /api/groups/{group_id}/members`).
- Zmianę roli istniejącego członka (`PATCH /api/groups/{group_id}/members/{user_id}`).
- Usunięcie członka z grupy (przez admina lub samego siebie) (`DELETE /api/groups/{group_id}/members/{user_id}`).
- Szybką promocję do roli `admin` (`POST /api/groups/{group_id}/members/{user_id}/promote`).

Cele biznesowe: Utrzymanie co najmniej jednego admina w każdej grupie, poprawna kontrola autoryzacji ról, spójna obsługa błędów i zgodność z RLS w Supabase.

## 2. Szczegóły żądania
### Wspólne
- Autentykacja: Wymagany zalogowany użytkownik (auth.uid()).
- Parametry ścieżki:
  - `group_id: uuid` (weryfikacja formatu / istnienia).
  - `user_id: uuid` dla operacji pojedynczego członka.
- Nagłówki: `Content-Type: application/json` dla PATCH/POST. Brak body dla DELETE/GET/POST promote.

### GET /api/groups/{group_id}/members
- Wymagane parametry: `group_id`.
- Body: brak.
- Autoryzacja: użytkownik musi być członkiem grupy (dowolna rola) – RLS lub jawne sprawdzenie.
- Opcjonalne query (przyszłość): `role=admin|editor|member`, `limit`, `cursor` (nie wdrażamy teraz).

### PATCH /api/groups/{group_id}/members/{user_id}
- Wymagane: `group_id`, `user_id`.
- Body: `{ "role": "admin" | "editor" | "member" }`.
- Autoryzacja: tylko admin grupy może zmieniać rolę.
- Walidacja: rola z dozwolonego zbioru; brak zmiany jeśli identyczna (idempotent – zwracamy 200 i aktualny rekord).

### DELETE /api/groups/{group_id}/members/{user_id}
- Wymagane: `group_id`, `user_id`.
- Body: brak.
- Autoryzacja: `auth.uid() == user_id` (samowyjście) lub admin grupy.
- Dodatkowy warunek: nie można usunąć ostatniego admina – DB trigger rzuci wyjątek; mapujemy na 409 + `LAST_ADMIN_REMOVAL`.

### POST /api/groups/{group_id}/members/{user_id}/promote
- Wymagane: `group_id`, `user_id`.
- Body: brak.
- Autoryzacja: admin grupy.
- Działanie: ustawia `role='admin'`. Jeśli już admin – idempotent 200.

## 3. Wykorzystywane typy
- DTO: `GroupMemberDTO` (z `src/types.ts`): `{ user_id, role, joined_at, group_id }`.
- Komenda roli: `GroupMembershipRoleChangeCommand` (z `types.ts`).
- Enums: `GroupRole`.
- Error codes: `LAST_ADMIN_REMOVAL`, `ROLE_INVALID`, `UNAUTHORIZED`, `NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_ERROR`.
- Odpowiedzi: `ApiSingle<GroupMemberDTO>`, `ApiList<GroupMemberDTO>`, `ApiError`.

## 4. Szczegóły odpowiedzi
| Endpoint | 2xx | Payload | Inne kody |
|----------|-----|---------|-----------|
| GET members | 200 | `{ data: GroupMemberDTO[] }` | 401,404,500 |
| PATCH role | 200 | `{ data: GroupMemberDTO }` (po zmianie lub bez) | 400 (payload), 401,403,404,409 (last admin),500 |
| DELETE member | 200 | `{ data: GroupMemberDTO }` (ostatni stan przed/usunięty) lub `{ data: { user_id, group_id } }` uproszczone; preferujemy pełny DTO | 401,403,404,409,500 |
| POST promote | 200 | `{ data: GroupMemberDTO }` | 401,403,404,500 |

Błędy:
```
{ "error": { "code": ApiErrorCode, "message": string, "details"?: object } }
```
Specyficzne:
- LAST_ADMIN_REMOVAL -> 409 Conflict
- ROLE_INVALID -> 400 Bad Request

## 5. Przepływ danych
1. Middleware autentykacji ustala `authUserId` (lub fallback – docelowo sesja Supabase). Zapewniamy dostęp do `supabase` przez `context.locals.supabase`.
2. Walidacja UUID (prosta regex / długość) – błędny format -> 400.
3. Sprawdzenie członkostwa użytkownika w grupie dla GET; dla operacji administracyjnych dodatkowe sprawdzenie roli.
4. Zapytania:
   - GET: `select * from group_memberships where group_id = $group_id order by joined_at asc` (opcjonalnie). Map: Row -> DTO.
   - PATCH: pobierz membership docelowy; jeśli brak -> 404. Walidacja roli; jeśli identyczna -> zwrot bieżący DTO. Wykonaj `update group_memberships set role=$newRole where group_id=$group AND user_id=$user` z `.select()`.
   - DELETE: pobierz membership; sprawdź autoryzację; wykonaj `delete`; obsłuż wyjątek triggera.
   - POST promote: pobierz membership; jeśli rola != admin -> update; jeśli admin -> zwrot bieżący.
5. DB trigger `ensure_group_has_admin` może rzucić wyjątek – przechwytujemy Postgres błąd (kod typu `P0001` lub tekst zawiera `'group must have at least one admin'`). Mapujemy na `LAST_ADMIN_REMOVAL`.
6. Zwrot opakowany w `ApiSingle` / `ApiList`.

## 6. Względy bezpieczeństwa
- Autentykacja: Wymagane UID; brak -> 401 (`UNAUTHORIZED`).
- Autoryzacja: sprawdzamy rolę wywołującego poprzez selekt z `group_memberships`. Można cache'ować jednorazowo.
- RLS: Baza ma polityki; mimo to robimy jawne sprawdzenia aby wcześnie zwrócić 403/404 z poprawnym kodem błędu.
- Unikanie eskalacji: Użytkownik nie może zmienić swojej roli z `member` na `admin` bez posiadania roli `admin` (tylko admin może promować).
- Ochrona przed enumeracją: Jeśli `group_id` istnieje ale użytkownik nie jest członkiem – traktujemy jako 404 (not found) lub 403? Preferencja: 404 aby nie ujawniać istnienia – (zdefiniować globalnie; w planie przyjmujemy 404).
- Walidacja wejścia: Zod schema dla roli.
- Brak możliwości usunięcia ostatniego admina – enforced DB trigger + obsługa.
- Brak wrażliwych danych w odpowiedzi (tylko membership minimalne informacje).

## 7. Obsługa błędów
| Scenariusz | Kod HTTP | ApiError.code | Uwagi |
|------------|----------|---------------|-------|
| Brak autentykacji | 401 | UNAUTHORIZED | Middleware albo w handlerze.
| Brak członkostwa wywołującego w grupie (GET) | 404 | NOT_FOUND | Maskujemy istnienie.
| Próba zmiany roli bez uprawnień admin | 403 | FORBIDDEN_ROLE | Dodamy w ErrorFactories.
| Próba promocji użytkownika niebędącego członkiem | 404 | NOT_FOUND | Najpierw SELECT.
| Invalid UUID format | 400 | VALIDATION_ERROR | details: { group_id: 'invalid uuid' }.
| Body roli spoza enum | 400 | ROLE_INVALID | Dodamy error factory.
| Usunięcie ostatniego admina | 409 | LAST_ADMIN_REMOVAL | Z triggera.
| Membership docelowy nie istnieje | 404 | NOT_FOUND | PATCH/DELETE/POST.
| DB failure (select/update/delete) | 500 | INTERNAL_ERROR | Log + anonimowy message.
| Rola identyczna (no-op) | 200 | - | Zwracamy DTO bez zmian.

Rozszerzenia pliku `errors.ts` (plan):
```ts
roleInvalid: () => make('ROLE_INVALID', 'Role must be one of admin|editor|member'),
forbiddenRole: () => make('FORBIDDEN_ROLE', 'Insufficient role'),
lastAdminRemoval: () => make('LAST_ADMIN_REMOVAL', 'Cannot remove the last admin'),
notFound: (entity = 'Resource') => make('NOT_FOUND', `${entity} not found`),
```

Mapowanie Postgres błędów: jeśli `error.message` zawiera `group must have at least one admin` => `lastAdminRemoval()`.

## 8. Rozważania dotyczące wydajności
- Indeks na `group_id` już istnieje (wg planu). Zapytania ograniczone do jednej grupy – niskie koszty.
- Możliwa przyszła paginacja przy dużych grupach (limit + cursor). Obecnie zwracamy pełną listę.
- Idempotencja operacji PATCH dla identycznej roli redukuje zbędne write’y.
- Potencjalny batching dla wielu zmian ról w przyszłości (bulk endpoint).
- Minimalizacja round-trip: w operacjach update używamy `.select()` aby uniknąć drugiego zapytania.
- Można dodać prosty in-memory cache roli wywołującego w obrębie jednego requestu (lokalna zmienna).

## 9. Etapy wdrożenia
1. Dodaj nowe fabryki błędów do `src/lib/errors.ts` (roleInvalid, forbiddenRole, lastAdminRemoval, notFound).
2. Utwórz plik `src/lib/validation/groupMembership.ts` z Zod schematem:
   ```ts
   import { z } from 'zod';
   export const membershipRoleChangeSchema = z.object({ role: z.enum(['admin','editor','member']) });
   export type MembershipRoleChangeInput = z.infer<typeof membershipRoleChangeSchema>;
   ```
3. Utwórz service `src/lib/services/group-memberships.service.ts` z funkcjami:
   - `listMembers(supabase, authUserId, groupId): Promise<ApiListResponse<GroupMemberDTO>>`
   - `changeMemberRole(supabase, authUserId, groupId, targetUserId, input): Promise<ApiResponse<GroupMemberDTO>>`
   - `removeMember(supabase, authUserId, groupId, targetUserId): Promise<ApiResponse<GroupMemberDTO>>`
   - `promoteMemberAdmin(supabase, authUserId, groupId, targetUserId): Promise<ApiResponse<GroupMemberDTO>>`
   Wzorce: wczesne walidacje, autoryzacja, mapowanie błędów.
4. Implementuj pomocniczą funkcję `fetchMembership(supabase, groupId, userId)` (re-use w service) oraz `fetchCallerRole`.
5. Dodaj mapowanie row -> DTO (wzór jak `mapGroupRowToDTO`) w `src/lib/mappers/group-membership.mapper.ts`.
6. Dodaj endpoint plik Astro:
   - `src/pages/api/groups/[group_id]/members.ts` (export GET handler – list) `export const prerender = false`.
   - `src/pages/api/groups/[group_id]/members/[user_id].ts` (PATCH, DELETE) z rozróżnieniem wg `Astro.request.method`.
   - `src/pages/api/groups/[group_id]/members/[user_id]/promote.ts` (POST promote).
7. W każdym handlerze: pobierz `group_id`, `user_id` z params; pobierz `supabase` z `locals.supabase`; ustal `authUserId` (tymczasowo DEFAULT_USER_ID jeśli brak).
8. Wywołaj odpowiadającą funkcję service; jeśli `error` w odpowiedzi -> ustaw HTTP status zgodnie z mapą:
   - `UNAUTHORIZED` -> 401
   - `FORBIDDEN_ROLE` -> 403
   - `NOT_FOUND` -> 404
   - `LAST_ADMIN_REMOVAL` -> 409
   - `ROLE_INVALID` / `VALIDATION_ERROR` -> 400
   - `INTERNAL_ERROR` -> 500
11. Dokumentacja README sekcja API – link do planu / aktualizacja.
12. (Opcjonalnie) Dodaj logowanie błędów wewnętrznych (console.error lub dedykowana tabela w przyszłości).

## 10. Edge Cases & Decyzje
- Jednoczesne usunięcie dwóch adminów: drugi delete trafia w trigger (zwróci LAST_ADMIN_REMOVAL).
- Zmiana roli admin -> member gdy jest jedynym adminem: trigger 409.
- Promocja użytkownika już admin – 200 idempotent.
- Próba operacji na członkostwie innym niż w grupie – 404.
- Doklejanie roli spoza enum – blokowane przez Zod (ROLE_INVALID).

## 11. Przykładowe fragmenty (szkic)
Service (fragment):
```ts
export async function changeMemberRole(supabase: SupabaseClient, authUserId: string, groupId: string, targetUserId: string, input: unknown): Promise<ApiResponse<GroupMemberDTO>> {
  const parsed = membershipRoleChangeSchema.safeParse(input);
  if (!parsed.success) return errors.roleInvalid();
  const newRole = parsed.data.role;
  const callerRole = await fetchCallerRole(supabase, authUserId, groupId);
  if (!callerRole) return errors.notFound('Group');
  if (callerRole !== 'admin') return errors.forbiddenRole();
  const membership = await fetchMembership(supabase, groupId, targetUserId);
  if (!membership) return errors.notFound('Member');
  if (membership.role === newRole) return { data: mapMembershipRowToDTO(membership) };
  const { data, error } = await supabase.from('group_memberships').update({ role: newRole }).eq('group_id', groupId).eq('user_id', targetUserId).select();
  if (error) {
    if (/group must have at least one admin/i.test(error.message)) return errors.lastAdminRemoval();
    return errors.internal('Failed to update role');
  }
  return { data: mapMembershipRowToDTO(data![0]) };
}
```

## 12. Future Extensions
- Pagination & filtering roli.
- Bulk role changes endpoint.
- Audyt zmian ról (osobna tabela).
- Cache authorization (e.g. in middleware).
- Soft delete zamiast fizycznego usunięcia (jeśli business potrzeby).

---
Plan gotowy do implementacji zgodnie z konwencjami projektu.
