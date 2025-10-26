# API Endpoint Implementation Plan: Camp Days

## 1. Przegląd punktu końcowego
Endpointy Camp Days zapewniają zarządzanie kalendarzem dni obozowych w ramach konkretnej grupy: tworzenie, listowanie, pobieranie, częściowa aktualizacja i usuwanie (twarde – brak soft delete). Każdy rekord reprezentuje logiczny dzień programu w zakresie dat grupy oraz numer dnia (1..30) z gwarantowaną unikalnością per grupa. Dodatkowe reguły biznesowe wymuszają poprawność zakresu dat oraz kolejności numerów.

Zakres implementacji obejmuje pięć tras:
- `POST /api/groups/{group_id}/camp-days` – utworzenie dnia obozu.
- `GET /api/groups/{group_id}/camp-days` – listowanie wszystkich dni obozu dla grupy (opcjonalnie przyszła paginacja).
- `GET /api/camp-days/{camp_day_id}` – pobranie szczegółów pojedynczego dnia.
- `PATCH /api/camp-days/{camp_day_id}` – częściowa aktualizacja (tylko pola modyfikowalne: `date`, `theme`).
- `DELETE /api/camp-days/{camp_day_id}` – usunięcie dnia (fizyczne).

## 2. Szczegóły żądania
### POST /api/groups/{group_id}/camp-days
- Metoda: POST
- URL: `/api/groups/{group_id}/camp-days`
- Parametry Path:
  - `group_id` (UUID) – wymagany.
- Body (JSON) – `CampDayCreateCommand`:
  - `day_number` (int 1..30) – wymagany
  - `date` (Date ISO YYYY-MM-DD) – wymagany; musi mieścić się w zakresie `group.start_date`..`group.end_date`.
  - `theme` (string nullable, max np. 500 znaków – ustalamy limit) – opcjonalny
- Walidacja biznesowa dodatkowa:
  - Unikalność `(group_id, day_number)`
  - Zakres dat: jeśli poza, zwróć `DATE_OUT_OF_GROUP_RANGE`
  - Zakres numeru dnia: jeśli poza 1..30 zwróć `DAY_OUT_OF_RANGE`
  - Konflikt duplikatu numeru: `DUPLICATE_DAY_NUMBER`
- Wymagania autoryzacji: użytkownik musi być członkiem grupy (dowolna rola). W przyszłości edycja może ograniczyć do admin/editor – decyzja: tworzenie ograniczamy do `admin` (spójne z tworzeniem aktywności). Przyjmujemy: *create wymaga roli admin*.

### GET /api/groups/{group_id}/camp-days
- Metoda: GET
- URL: `/api/groups/{group_id}/camp-days`
- Parametry Path: `group_id` (UUID) – wymagany.
- Query: (brak w MVP; potencjalnie `limit`, `cursor` później).
- Autoryzacja: członek grupy (dowolna rola). Jeśli nie członek → maskuj jako 404.
- Body: brak.

### GET /api/camp-days/{camp_day_id}`
- Metoda: GET
- URL: `/api/camp-days/{camp_day_id}`
- Parametry Path: `camp_day_id` (UUID) – wymagany.
- Autoryzacja: członek odpowiedniej grupy (dowolna rola). Jeśli nie członek → 404.
- Body: brak.

### PATCH /api/camp-days/{camp_day_id}`
- Metoda: PATCH
- URL: `/api/camp-days/{camp_day_id}`
- Parametry Path: `camp_day_id` – wymagany.
- Body (JSON) – `CampDayUpdateCommand` (partial):
  - `date` (YYYY-MM-DD) – opcjonalne; musi nadal mieścić się w zakresie dat grupy.
  - `theme` (string nullable, limit znaków) – opcjonalne (można wyczyścić poprzez `theme: null`).
- Autoryzacja: rola `admin` (ew. rozważ `editor` – przyjmujemy surowo admin dla prostoty MVP).

### DELETE /api/camp-days/{camp_day_id}`
- Metoda: DELETE
- URL: `/api/camp-days/{camp_day_id}`
- Parametry Path: `camp_day_id` – wymagany.
- Autoryzacja: rola `admin`.
- Operacja: fizyczne usunięcie. Brak zwrotu treści poza potwierdzeniem.

## 3. Wykorzystywane typy
Z `types.ts`:
- `CampDayDTO` – DTO odpowiedzi
- `CampDayCreateCommand` – payload POST
- `CampDayUpdateCommand` – payload PATCH
- `UUID`, `DateISO`, `ApiResponse<T>`, `ApiListResponse<T>`

### Dodatkowe deklaracje do walidacji (Zod)
Nowe schematy:
- `campDayCreateSchema` dla POST
- `campDayUpdateSchema` dla PATCH (partial) 
- Ewentualnie `campDayListQuerySchema` (przyszła paginacja) – można zstubować

## 4. Szczegóły odpowiedzi
Standardowe envelopy:
- Sukces POST: `201` + `{ data: CampDayDTO }`
- Sukces GET list: `200` + `{ data: CampDayDTO[], count?: number }`
- Sukces GET single: `200` + `{ data: CampDayDTO }`
- Sukces PATCH: `200` + `{ data: CampDayDTO }`
- Sukces DELETE: `200` + `{ data: { id: UUID } }` lub `{ data: { id, deleted: true } }` (wybór: prosty `{ data: { id } }`).

Kody błędów API (pole `error.code`):
- `DAY_OUT_OF_RANGE` → 400
- `DATE_OUT_OF_GROUP_RANGE` → 400
- `DUPLICATE_DAY_NUMBER` → 409
- `VALIDATION_ERROR` → 400
- `UNAUTHORIZED` → 401
- `NOT_FOUND` → 404
- `INTERNAL_ERROR` → 500
- `FORBIDDEN_ROLE` → 403 (może być już zdefiniowany – korzystamy)

Mapowanie Supabase błędów:
- Unikalność `(group_id, day_number)` naruszenie → `DUPLICATE_DAY_NUMBER`
- CHECK zakres day_number – normalnie przechwytujemy wcześniej w walidacji; jeśli błąd DB to fallback na `DAY_OUT_OF_RANGE`.
- Trigger daty poza zakresem → interpretacja komunikatu – jeśli możliwe; w MVP manualnie sprawdzamy przed insertem/aktualizacją.

## 5. Przepływ danych
1. Middleware dostarcza `supabase` w `locals` oraz (tymczasowo) `userId`.
2. Endpoint parse path param (UUID check), wywołuje odpowiedni service.
3. Service:
   - Pobiera grupę (dla create/list) lub rekord camp_day (dla get/patch/delete) by ustalić `group_id` i zweryfikować członkostwo.
   - Sprawdza członkostwo w `user_group_permissions` (analogicznie do `activities.service.ts`).
   - Waliduje dane wejściowe (Zod + reguły biznesowe).
   - Dla POST: sprawdza duplikat numeru (pre-flight SELECT) – opcjonalne; rely on unique constraint i mapuje błąd.
   - Wykonuje operację DB (`insert`, `select`, `update`, `delete`).
   - Mapuje wynik wprost do `CampDayDTO` (może powstać mapper `mapCampDayRowToDTO`).
   - Zwraca `ApiResponse`.
4. Endpoint transformuje wynik w HTTP response (status code zależny od success/error). 

## 6. Względy bezpieczeństwa
- Autentykacja: weryfikacja obecności `authUserId` (lub fallback `DEFAULT_USER_ID` tylko w dev – docelowo usunąć).
- Autoryzacja:
  - Tworzenie / aktualizacja / usunięcie: rola `admin`.
  - Odczyt listy i pojedynczego: członek grupy (jakakolwiek rola).
- Maskowanie zasobów: jeśli użytkownik nie jest członkiem grupy → odpowiedź `NOT_FOUND` (zapobiega enumeracji UUID).
- Walidacja wejścia: Zod + ręczne sprawdzenie zakresu dat vs. grupa.
- Ochrona przed race condition duplikatu numeru: rely on DB UNIQUE + mapowanie do `CONFLICT`/`DUPLICATE_DAY_NUMBER`.
- Brak możliwości wstrzyknięcia SQL (Supabase query builder + walidacja typów).

## 7. Obsługa błędów
Scenariusze:
- Nieprawidłowe UUID: `VALIDATION_ERROR` (400)
- Brak członkostwa: `NOT_FOUND` (404)
- Brak uprawnień (rola): `FORBIDDEN_ROLE` (403)
- Duplikat numeru: `DUPLICATE_DAY_NUMBER` (409)
- Numer poza zakresem: `DAY_OUT_OF_RANGE` (400)
- Data poza zakresem: `DATE_OUT_OF_GROUP_RANGE` (400)
- Camp day nie istnieje: `NOT_FOUND` (404)
- Błąd DB nieoczekiwany: `INTERNAL_ERROR` (500)

Mapping do HTTP status:
- 200: read, patch, delete success
- 201: create success
- 400: validation + business range errors
- 401: brak autentykacji (jeśli userId null) → `UNAUTHORIZED`
- 403: rola niewystarczająca
- 404: maskowanie lub brak zasobu
- 409: konflikt duplikatu numeru
- 500: nieoczekiwane

## 8. Rozważania dotyczące wydajności
- Listowanie: prosty SELECT z indeksem `idx_camp_days_group_day` – szybkie.
- Przy dużych grupach (do 30 dni limit) – rozmiar mały, brak paginacji potrzebnej w MVP.
- Pre-flight sprawdzenie duplikatu numeru (SELECT) można pominąć – jeden insert + obsługa constraint wystarczy.
- Tożsamość użytkownika i permissions: pojedynczy SELECT do widoku `user_group_permissions` – tanie.
- PATCH/DELETE poprzedzone SELECT pojedynczego rekordu – minimalny narzut.

## 9. Etapy wdrożenia
1. Utwórz plik walidacji `src/lib/validation/campDay.ts` z Zod schematami: `campDayCreateSchema`, `campDayUpdateSchema`.
2. Dodaj mapper `src/lib/mappers/camp-day.mapper.ts` funkcja `mapCampDayRowToDTO(row): CampDayDTO`.
3. Implementuj service `src/lib/services/camp-days.service.ts` z funkcjami:
   - `createCampDay(supabase, userId, groupId, input)`
   - `listCampDays(supabase, userId, groupId)`
   - `getCampDay(supabase, userId, campDayId)`
   - `updateCampDay(supabase, userId, campDayId, input)`
   - `deleteCampDay(supabase, userId, campDayId)`
   Wzorce autoryzacji i błędów kopiuj z `activities.service.ts` + `groups.service.ts`.
4. Rozszerz `errors.ts` o fabryki: `dayOutOfRange()`, `dateOutOfGroupRange()`, `duplicateDayNumber()` (mapujące na odpowiednie kody).
5. Endpointy Astro:
   - `src/pages/api/groups/[group_id]/camp-days.ts` (GET & POST handler w jednym pliku).
   - `src/pages/api/camp-days/[camp_day_id].ts` (GET, PATCH, DELETE).
   Użyj wzorca: `export const prerender = false;` i funkcji `GET`, `POST`, `PATCH`, `DELETE`.
6. W każdym handlerze: pobierz `supabase` z `locals.supabase`, `userId` z tymczasowego źródła, parse param, wywołaj service, mapuj status.
7. Test manualny przez `curl` scenariuszy: create, duplicate, list, get, patch date out-of-range, delete.
8. Dodaj wpis do dokumentacji (README lub osobny md) jeśli wymagane – potwierdź minimalnie w planie.
9. Przejrzyj linter (npm run lint) – popraw ewentualne uwagi.
10. (Opcjonalnie) dodać testy jednostkowe dla walidacji schematu (jeśli framework testowy dostępny – brak w repo na razie).

## 10. Detale implementacyjne serwisu (skrót)
- Pobranie permissions:
```ts
const perms = await fetchUserGroupPermissions(supabase, groupId, authUserId);
if (!perms.role) return errors.unauthorized();
```
- Sprawdzenie członkostwa i roli admin dla create/update/delete.
- Walidacja daty vs. grupa: pobierz `start_date`, `end_date` z `groups`.
- Insert:
```ts
const { data, error } = await supabase.from("camp_days").insert({ group_id, day_number, date, theme }).select().maybeSingle();
if (error) { /* map duplicate or range errors */ }
```
- Update: budowa partial payload, tylko dozwolone pola.
- Delete: `.delete().eq("id", campDayId).select("id")`.

## 11. Przykładowe kody statusu i body
- POST success: 201 `{ "data": { "id": "uuid", "group_id": "uuid", "day_number": 3, "date": "2025-07-05", "theme": "Woodcraft" } }`
- Duplicate: 409 `{ "error": { "code": "DUPLICATE_DAY_NUMBER", "message": "Camp day number already exists" } }`
- Date out of range: 400 `{ "error": { "code": "DATE_OUT_OF_GROUP_RANGE", "message": "Date outside group range" } }`

## 12. Potencjalne rozszerzenia (po MVP)
- Paginacja listy (cursor/offset).
- Batch create (np. generowanie sekwencji dni).
- Endpoint do przesuwania numerów dni przy wstawianiu nowego.
- Widok agregujący statystyki wykorzystania (np. ile aktywności przypisanych per dzień).
- GIST/EXCLUDE constraint dla schedule kolizji (związane z inną tabelą).

