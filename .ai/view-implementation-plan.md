# API Endpoint Implementation Plan: POST /api/groups

## 1. Przegląd punktu końcowego
Endpoint tworzy nową grupę (obóz) wraz z parametrami podstawowymi i inicjalizuje jej stan w systemie. Operacja dostępna wyłącznie dla uwierzytelnionego użytkownika. Tworzenie zapisuje rekord w tabeli `groups`, ustanawia autora (`created_by`, `updated_by`), a następnie gwarantuje członkostwo tworzącego jako admin poprzez wpis w `group_memberships`. Dane odpowiedzi wzbogacone są o złożony obiekt `invite` z kolumn zaproszeń. Nie generujemy kodu zaproszenia przy tworzeniu (pole może być null) – generacja odbywa się osobnym endpointem `/api/groups/{group_id}/invite`.

## 2. Szczegóły żądania
- Metoda HTTP: POST
- URL: `/api/groups`
- Autoryzacja: Wymagany zalogowany użytkownik (Bearer token / Supabase session). Brak roli specjalnej (każdy uwierzytelniony może utworzyć grupę do limitu).
- Nagłówki:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- Body (JSON) `GroupCreateCommand`:
```json
{
  "name": "Alpha",
  "description": "Summer camp",
  "lore_theme": "Middle Earth",
  "start_date": "2025-07-01",
  "end_date": "2025-07-14",
  "max_members": 40
}
```
- Parametry wymagane w body:
  - `name` (string, non-empty, trim)
  - `description` (string, non-empty)
  - `lore_theme` (string, non-empty)
  - `start_date` (DateISO, format YYYY-MM-DD)
  - `end_date` (DateISO, >= start_date)
  - `max_members` (int, 1..500)
- Parametry opcjonalne: brak (wszystkie wymagane wg specyfikacji). Możemy dopuścić brak `max_members` => domyślne 50 jeśli nie przesłane (zgodne z DB DEFAULT) – ustalić w walidacji. (Założenie: jeśli brak pola, przyjmujemy default z bazy; walidacja pozwala na optional.)

## 3. Wykorzystywane typy
- Command: `GroupCreateCommand`
- DTO (response): `GroupDTO` (zagnieżdżone `InviteDTO | null`)
- Typy pomocnicze: `ApiSingle<GroupDTO>`, `ApiError`, `ApiErrorCode` (m.in. `GROUP_LIMIT_REACHED`, `DATE_RANGE_INVALID`, `VALIDATION_ERROR`, `INTERNAL_ERROR`)

## 4. Szczegóły odpowiedzi
- Sukces (201 Created):
```json
{
  "data": {
    "id": "uuid",
    "name": "Alpha",
    "description": "Summer camp",
    "lore_theme": "Middle Earth",
    "status": "planning",
    "start_date": "2025-07-01",
    "end_date": "2025-07-14",
    "invite": null,
    "max_members": 40,
    "created_at": "2025-05-01T10:00:00Z",
    "updated_at": "2025-05-01T10:00:00Z",
    "deleted_at": null
  }
}
```
- Błędy:
  - 400 `VALIDATION_ERROR` gdy format / zakres danych niepoprawny (lista pól w `details`).
  - 400 `DATE_RANGE_INVALID` gdy end_date < start_date.
  - 400 `GROUP_LIMIT_REACHED` (jeśli przekroczony biznesowy limit liczby grup per user – wymaga logiki: np. max 20) -> spec nie podaje limitu, uwzględnić rozszerzalnie.
  - 401 gdy brak lub nieważny token.
  - 500 `INTERNAL_ERROR` dla nieprzewidzianych wyjątków.

## 5. Przepływ danych
1. Klient wysyła POST z JSON i nagłówkiem Authorization.
2. Middleware uwierzytelnia i umieszcza `supabase` oraz `user` w `context.locals`.
3. Endpoint:
   - Parsuje body i waliduje z użyciem Zod schematu `groupCreateSchema`.
   - Dodatkowa walidacja reguły dat (`end_date >= start_date`).
   - Sprawdza limit liczby grup (SELECT COUNT(*) FROM groups WHERE created_by = current_user AND deleted_at IS NULL).
   - Wstawia rekord do `groups` (INSERT) z `created_by` i `updated_by` = user.id.
   - Wstawia membership admin (INSERT INTO group_memberships (user_id, group_id, role='admin')).
   - Pobiera rekord z `groups` (SELECT ...) aby zwrócić pełen zestaw kolumn (lub wykorzystuje `insert().select()`).
   - Mapuje kolumny zaproszenia do `invite` (jeśli `invite_code` nie null). Na create spodziewane null.
   - Buduje `GroupDTO` i owija w `ApiSingle`.
4. Zwraca 201.

## 6. Względy bezpieczeństwa
- Uwierzytelnianie: wymagane (Supabase auth). Odmowa 401 jeśli brak kontekstu użytkownika.
- Autoryzacja: brak specjalnych ról przy tworzeniu; potencjalny rate limit na tworzenie grup (przeciwdziałanie spamowi) – przyszłe rozszerzenie (np. 10/min na użytkownika).
- Walidacja wejścia: użycie Zod z restrykcjami długości (np. maks. 100 chars dla name, 1000 dla description – ustalić aby uniknąć oversize). Zapobieganie wstrzyknięciom poprzez parametryzowane zapytania (Supabase klient zapewnia).
- Ochrona przed enumeracją: Brak ujawniania cudzych danych; tworzenie nie ujawnia ID innych zasobów.
- CSRF: Nie dotyczy (token Bearer, POST JSON API).
- Logging: Logować nieudane próby (limit, walidacja) bez wrażliwych danych.

## 7. Obsługa błędów
Mapowanie:
- Walidacja schematu: 400 `VALIDATION_ERROR` (details: { fieldErrors }).
- end_date < start_date: 400 `DATE_RANGE_INVALID`.
- Limit grup: 400 `GROUP_LIMIT_REACHED` (details: { current: n, limit: m }).
- DB constraint (np. check max_members poza zakresem) jeśli przejdzie walidację a fail w DB: przechwycić i zmapować do 400 `VALIDATION_ERROR`.
- Auth brak: 401 `UNAUTHORIZED`.
- Inne niespodziewane: 500 `INTERNAL_ERROR` (z generowanym correlation id). 
- Mechanizm: try/catch; granular parse błędów Supabase (code, message). Dedykowana funkcja `mapDbErrorToApiError` w warstwie serwisu.

## 8. Rozważania dotyczące wydajności
- Pojedyncze INSERT + SELECT => niski koszt.
- Można użyć `insert().select()` aby uniknąć drugiego roundtrip.
- Dodanie membership w transakcji (Supabase: użycie funkcji RPC lub minimalnie 2 zapytania). Aby mieć atomiczność rozważyć Postgres funkcję RPC `create_group_with_admin` (przyszłe). MVP: sekwencja z walidacją i rollback jeśli membership fail.
- Indeksy: PK i ewentualny indeks na `created_by` już pomocny do liczenia limitu. Jeśli brak, rozważyć dodanie idx `idx_groups_created_by`.

## 9. Etapy wdrożenia
1. Utworzyć Zod schema `groupCreateSchema` w `src/lib/validation/group.ts` (jeśli folder nie istnieje: `validation`).
2. Dodać serwis `src/lib/services/groups.service.ts` z funkcją `createGroup(context, command: GroupCreateCommand): Promise<ApiResponse<GroupDTO>>`.
3. W serwisie: implementować walidacje biznesowe (limit, range dat), wywołania Supabase, mapping do DTO, błąd -> ApiError.
4. Dodać helper `mapGroupRowToDTO(row): GroupDTO` w serwisie lub osobnym mapperze `src/lib/mappers/group.mapper.ts`.
5. Dodać error utility `src/lib/errors.ts` (factory: `validationError`, `dateRangeInvalid`, `groupLimitReached`, `internalError`).
6. Implementować endpoint Astro: plik `src/pages/api/groups.ts` z eksportem `export async function POST(context) { ... }` (ustaw `export const prerender = false`).
7. Endpoint: pobierz body (`await context.request.json()`), zweryfikuj `groupCreateSchema.parse` (przechwycić ZodError), wywołaj serwis, zwróć odpowiedni Response z kodem 201 lub błędem.
10. Dodać dokumentację do README sekcji API.

## 10. Przykładowy szkic Zod (referencyjny)
```ts
import { z } from 'zod';
export const groupCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000),
  lore_theme: z.string().trim().min(1).max(200),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  max_members: z.number().int().min(1).max(500).optional(),
}).superRefine((val, ctx) => {
  if (val.end_date < val.start_date) {
    ctx.addIssue({
      path: ['end_date'],
      code: z.ZodIssueCode.custom,
      message: 'end_date must be >= start_date'
    });
  }
});
```

## 11. Mapper przykład
```ts
function mapGroupRowToDTO(row): GroupDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    lore_theme: row.lore_theme,
    status: row.status,
    start_date: row.start_date,
    end_date: row.end_date,
    invite: row.invite_code ? {
      code: row.invite_code,
      expires_at: row.invite_expires_at,
      max_uses: row.invite_max_uses,
      current_uses: row.invite_current_uses
    } : null,
    max_members: row.max_members,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  };
}
```

