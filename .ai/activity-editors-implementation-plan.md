# Plan Implementacji Endpointów: Activity Editors (Assignments)

## 1. Przegląd punktu końcowego
Zestaw trzech endpointów REST służących do zarządzania przypisaniami edytorów do konkretnej aktywności. Zapewniają kontrolę dostępu do edycji poprzez jawne przypisywanie użytkowników. Operacje: pobranie listy edytorów, przypisanie nowego edytora (tylko admin grupy), usunięcie przypisania (tylko admin).

Cel biznesowy: umożliwienie współpracy nad przygotowaniem aktywności przy zachowaniu granularnej kontroli nad tym kto może ją edytować.

## 2. Szczegóły żądania
- Bazowy zasób: `/api/activities/{activity_id}/editors`
- Metody:
  - `GET /api/activities/{activity_id}/editors` – lista edytorów.
  - `POST /api/activities/{activity_id}/editors` – przypisanie edytora (body zawiera user_id).
  - `DELETE /api/activities/{activity_id}/editors/{user_id}` – usunięcie przypisania.

### 2.1 Parametry
- Path:
  - `activity_id: UUID` (wymagany dla wszystkich trzech).
  - `user_id: UUID` (wymagany wyłącznie w DELETE).
- Body (POST):
  ```json
  { "user_id": "<uuid>" }
  ```
- Query: brak (MVP).

### 2.2 Nagłówki
- `Authorization`: sesja Supabase (wymagane wszystkie operacje).
- `Accept: application/json` i `Content-Type: application/json` dla POST.

### 2.3 Walidacja wejścia (Zod)
- Schemat `assignEditorSchema = z.object({ user_id: z.string().uuid() })`.
- Walidacja UUID dla `activity_id` i `user_id` (parsowanie przez prosty helper lub Zod).
- Sprawdzenie istnienia aktywności i że nie jest soft-deleted.
- Sprawdzenie członkostwa wywołującego w grupie aktywności (GET) oraz roli `admin` (POST/DELETE).
- Sprawdzenie członkostwa przypisywanego `user_id` w tej samej grupie (POST) – w przeciwnym razie `USER_NOT_IN_GROUP`.
- Sprawdzenie braku duplikatu przypisania (POST) – w przeciwnym razie `ALREADY_ASSIGNED`.
- Sprawdzenie istnienia przypisania przed usunięciem (DELETE) – jeśli brak `NOT_FOUND`.

## 3. Wykorzystywane typy
- DTO: `ActivityEditorDTO` (z `types.ts`).
- Envelopes: `ApiList<ActivityEditorDTO>`, `ApiSingle<ActivityEditorDTO>`, `ApiError`.
- Command modele: `ActivityEditorAssignCommand`, `ActivityEditorRemoveCommand` (puste body semanticzne dla DELETE).
- Kody błędów: `ALREADY_ASSIGNED`, `USER_NOT_IN_GROUP`, `ACTIVITY_NOT_FOUND`, `FORBIDDEN_ROLE`, `UNAUTHORIZED`, `NOT_FOUND`, `BAD_REQUEST`, `CONFLICT`, `INTERNAL_ERROR`.

## 4. Szczegóły odpowiedzi
### 4.1 Sukces
- GET 200:
  ```json
  { "data": [ { "activity_id": "uuid", "user_id": "uuid", "assigned_at": "2025-10-26T12:34:56Z", "assigned_by_user_id": "uuid" } ] }
  ```
- POST 201:
  ```json
  { "data": { "activity_id": "uuid", "user_id": "uuid", "assigned_at": "2025-10-26T12:34:56Z", "assigned_by_user_id": "uuid" } }
  ```
- DELETE 200:
  ```json
  { "data": { "activity_id": "uuid", "user_id": "uuid" } }
  ```

### 4.2 Błędy (wzorzec)
```json
{
  "error": { "code": "ALREADY_ASSIGNED", "message": "Editor already assigned.", "details": {} }
}
```

### 4.3 Mapowanie kodów
| Scenariusz | HTTP | code |
|------------|------|------|
| Duplikat przypisania | 409 | ALREADY_ASSIGNED |
| Użytkownik spoza grupy | 400 | USER_NOT_IN_GROUP |
| Brak aktywności | 404 | ACTIVITY_NOT_FOUND |
| Brak przypisania przy DELETE | 404 | NOT_FOUND |
| Brak autoryzacji (brak sesji) | 401 | UNAUTHORIZED |
| Brak uprawnień (rola ≠ admin) | 403 | FORBIDDEN_ROLE |
| Niepoprawny input (UUID/body) | 400 | BAD_REQUEST |
| Inny konflikt danych | 409 | CONFLICT |
| Błąd wewnętrzny | 500 | INTERNAL_ERROR |

## 5. Przepływ danych
1. Middleware dostarcza `supabase` w `context.locals.supabase` oraz identyfikator użytkownika.
2. Handler endpointu parsuje parametry ścieżki (z `context.params`).
3. Walidacja body (POST) przez Zod; natychmiastowy zwrot 400 przy błędzie.
4. Serwis `ActivityEditorsService` wykonuje logikę domenową:
   - Pobranie aktywności: `select id, group_id, deleted_at from activities`.
   - Sprawdzenie membership aktora: zapytanie do `group_memberships`.
   - Weryfikacja roli (admin dla mutacji).
   - Przy POST: sprawdzenie membership targetu i istnienia wpisu w `activity_editors`.
   - INSERT / DELETE w tabeli `activity_editors`.
   - SELECT listy edytorów dla GET.
5. Mapper `toActivityEditorDTO` odwzorowuje rekord na DTO (1:1 nazwy kolumn).
6. Odpowiedź opakowywana w `ApiSingle` / `ApiList` / `ApiError` i zwracana.
7. Supabase RLS dodatkowo egzekwuje polityki (obrona warstwowa).

## 6. Względy bezpieczeństwa
- Autentykacja: wymagane (token Supabase / session). Brak → 401.
- Autoryzacja: rola admin grupy aktywności wymagana dla POST i DELETE. GET dostępny dla dowolnego członka.
- Walidacja danych ogranicza wektor injection; użycie przygotowanych zapytań (Supabase klient).
- RLS: polityki dla `activities` i `activity_editors` muszą być skonfigurowane (select/insert/delete). Chroni przed obejściem logiki w serwisie.
- Brak ekspozycji nadmiarowych danych (zwracamy tylko wymagane kolumny).
- Możliwość future-rate-limit na POST/DELETE (niskie ryzyko nadużycia, można dodać globalny limiter perimeter).
- Obrona przed enumeracją użytkowników: przy błędzie `USER_NOT_IN_GROUP` wracamy 400, nie 404 – kontrolowany komunikat zgodny ze specyfikacją.

## 7. Obsługa błędów
- Dedykowane fabryki w `src/lib/errors.ts` (jeśli brak – dodać) np. `badRequest(code, message, details?)`.
- Błędy domenowe rzucane jako obiekty z polem `code`; handler mapuje na status HTTP.
- Nieoczekiwane wyjątki łapane w warstwie endpointu → log + 500.
- Logowanie: `console.error` (MVP) + structured message (`{ scope: 'activity_editors', activity_id, user_id, error }`).
- Unikanie wielokrotnych zapytań przy stwierdzeniu błędu – early return.

## 8. Rozważania dotyczące wydajności
- Wszystkie operacje jednostkowe, indeks PK (activity_id,user_id) wspiera duplikat check i DELETE.
- Dodatkowy indeks na `activity_editors.user_id` już w planie – przydatny gdy później będziemy pobierać aktywności użytkownika.
- Minimalizacja round-trips: można połączyć sprawdzenia membership i roli w jednym SELECT (optymalizacja późniejsza; na start czytelność > mikro optymalizacja).
- Niewielka cardinality listy edytorów → brak potrzeby paginacji.
- Brak serializacji ciężkich struktur – czysty JSON z kilkoma polami.
- Możliwość cache (skipped; dynamiczne i rzadko używane w porównaniu do kosztu invalidacji).

## 9. Kroki implementacji
1. Utwórz walidację: `src/lib/validation/activityEditor.ts` z Zod schematem `assignEditorSchema`.
2. Utwórz mapper: `src/lib/mappers/activity-editor.mapper.ts` funkcja `toActivityEditorDTO(row)`.
3. Dodaj serwis: `src/lib/services/activity-editors.service.ts` z funkcjami:
   - `listEditors(supabase, activityId, actorUserId)`
   - `assignEditor(supabase, activityId, targetUserId, actorUserId)`
   - `removeEditor(supabase, activityId, targetUserId, actorUserId)`
   - Helpery prywatne: `_getActivity`, `_getMembership`, `_isMember`, `_isAdmin`.
4. W serwisie zaimplementuj kontrolę błędów i zwróć domenowe obiekty lub rzucaj dedykowane błędy (`throw { code: 'ALREADY_ASSIGNED', message: '...' }`).
5. Endpoint GET: `src/pages/api/activities/[activity_id]/editors.ts` – implementuj `export async function GET(context)`.
6. W tym samym pliku dodaj `POST` handler.
7. Endpoint DELETE: `src/pages/api/activities/[activity_id]/editors/[user_id].ts` – implementuj `export async function DELETE(context)`.
8. Użyj wspólnej fabryki błędów z `src/lib/errors.ts` (rozszerz jeśli potrzeba) do mapowania na HTTP statusy.
9. Dodaj testowe notatki/curl w `notatki/` (opcjonalnie) pokazujące scenariusze sukcesu i błędów.
11. Review pod kątem clean code: guard clauses, brak zbędnych `else`, czytelna kolejność (walidacja → autoryzacja → logika → happy path).
12. Weryfikacja czy RLS polityki dla `activity_editors` istnieją (jeśli nie – wdrożyć z planu DB).
13. Dodaj krótką sekcję do README opisującą endpointy (lub osobny plik API doc) – opcjonalnie.

## 10. Edge Cases & Uwagi
- Soft-deleted aktywność: traktować jak nieistniejącą (`ACTIVITY_NOT_FOUND`).
- Próba przypisania samego siebie: dozwolone jeśli członek i admin (nie wymaga specjalnego kodu błędu).
- Równoczesne przypisania (race): PK uniemożliwia duplikat; przy konflikcie baza zwróci błąd → przechwycić i zmapować na `ALREADY_ASSIGNED`.
- DELETE gdy PK nie istnieje: zwrócić kontrolowany 404, nie traktować jako idempotentnego sukcesu (wyraźna informacja dla klienta).
- Format czasu `assigned_at`: używamy ISO (z Supabase timestamptz).

---
Zatwierdzony plan gotowy do implementacji.
