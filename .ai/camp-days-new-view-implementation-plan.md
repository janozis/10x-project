# Plan implementacji widoku Camp Days — utwórz dzień

## 1. Przegląd
Widok umożliwia administratorowi dodanie nowego dnia obozowego w ramach wybranej grupy HAL. Formularz zbiera `day_number (1..30)`, `date (YYYY-MM-DD)` oraz opcjonalne `theme`, waliduje dane po stronie klienta z użyciem Zod, wyświetla błędy inline i po sukcesie przekierowuje do listy dni lub do szczegółu nowo utworzonego dnia.

## 2. Routing widoku
- Ścieżka: `/groups/{group_id}/camp-days/new`
- Plik strony: `src/pages/groups/[group_id]/camp-days/new.astro`
- SSR: domyślne Astro SSR; użycie komponentu React do obsługi formularza i walidacji.

## 3. Struktura komponentów
- `CampDayCreatePage` (Astro)
  - renderuje layout i montuje `CampDayCreateForm`
- `CampDayCreateForm` (React)
  - `DayNumberField` (shadcn/ui `Input` + `Label` + inline error)
  - `DateField` (native `<input type="date">` + `Label` + inline error)
  - `ThemeField` (shadcn/ui `Textarea` + `Label` + helper + inline error)
  - `FormActions` (Primary: „Utwórz i przejdź do dnia”, Secondary: „Utwórz i wróć do listy”, Cancel: link do listy)
  - globalne miejsce na błąd formularza (np. konflikt 409)

## 4. Szczegóły komponentów
### CampDayCreatePage (Astro)
- Opis: Strona wrapper; pobiera `group_id` z paramów ścieżki i renderuje formularz.
- Główne elementy: `Layout.astro`, nagłówek strony, `CampDayCreateForm` przez `client:load`/`client:only="react"` zgodnie z potrzebą.
- Obsługiwane interakcje: brak (deleguje do formularza).
- Walidacja: brak (deleguje do formularza).
- Typy: korzysta z `UUID` dla `groupId`.
- Propsy do dzieci: `groupId: UUID`.

### CampDayCreateForm (React)
- Opis: Form obsługujący stan, walidację, integrację z API i nawigację po sukcesie.
- Główne elementy: `form`, pola (`Input`, `Textarea`, `<input type="date">`), przyciski `Button` z `src/components/ui`.
- Obsługiwane interakcje:
  - Zmiana wartości pól (`onChange`)
  - Submit (`onSubmit`): walidacja Zod, POST do `/api/groups/{group_id}/camp-days`.
  - Cancel: nawigacja z powrotem do listy (`/groups/{group_id}/camp-days`).
  - Wybór trybu przekierowania po sukcesie (np. przez dwa osobne przyciski submit lub przełącznik).
- Walidacja (klient):
  - `day_number`: integer, 1..30
  - `date`: `YYYY-MM-DD`, w zakresie `[group.start_date, group.end_date]` (wymaga danych grupy)
  - `theme`: opcjonalne, trymowane; limit długości (np. ≤ 280 znaków)
- Walidacja (serwer – mapowanie odpowiedzi):
  - 400 `VALIDATION_ERROR` → inline błędy pól
  - 400 `DAY_OUT_OF_RANGE` → błąd przy `day_number`
  - 400 `DATE_OUT_OF_GROUP_RANGE` → błąd przy `date`
  - 409 `DUPLICATE_DAY_NUMBER` → błąd formularza i pola `day_number`
  - 401/403/404/500 → baner błędu/sonner toast
- Typy: 
  - używa `CampDayCreateCommand` jako payload
  - używa `CampDayDTO` w odpowiedzi
  - `ApiResponse<CampDayDTO>` do parsowania wyników
  - ViewModel: `CampDayCreateVM`
- Propsy: `{ groupId: UUID; defaultRedirect?: "detail" | "list" }`

### DayNumberField
- Opis: Liczbowe pole z zakresową walidacją i komunikatem błędu.
- Elementy: `Label`, `Input type="number"`, opis pomocniczy, `aria-invalid`, `aria-describedby`.
- Zdarzenia: `onChange`, `onBlur` (walidacja onBlur opcjonalnie).
- Walidacja: integer, 1..30.
- Typy: korzysta z `number` w VM; błąd `string | undefined`.
- Propsy: `{ value: number | ""; error?: string; onChange: (v: number | "") => void }`.

### DateField
- Opis: Wybór daty w formacie `YYYY-MM-DD`, walidacja zakresu względem grupy.
- Elementy: `Label`, `<input type="date">`, opis, inline error.
- Zdarzenia: `onChange`, `onBlur`.
- Walidacja: wymagane, format ISO `YYYY-MM-DD`, `group.start_date ≤ date ≤ group.end_date`.
- Typy: `DateISO` w VM; błąd `string | undefined`.
- Propsy: `{ value: DateISO | ""; min?: DateISO; max?: DateISO; error?: string; onChange: (v: DateISO | "") => void }`.

### ThemeField
- Opis: Opcjonalny temat dnia, krótki tekst.
- Elementy: `Label`, `Textarea`, licznik znaków (opcjonalnie), inline error.
- Zdarzenia: `onChange`.
- Walidacja: maksymalna długość (np. 280), trymowanie, opcjonalne.
- Typy: `string | undefined`.
- Propsy: `{ value: string; error?: string; onChange: (v: string) => void }`.

### FormActions
- Opis: Przyciski do wysłania i rezygnacji, obsługa stanów `loading`/`disabled`.
- Elementy: `Button` x2 (primary/secondary), link Cancel.
- Zdarzenia: `onSubmitNext`, `onSubmitList`, `onCancel`.
- Walidacja: brak (deleguje do form).
- Typy: `loading: boolean`.
- Propsy: `{ loading: boolean; onSubmitNext: () => void; onSubmitList: () => void; onCancel: () => void }`.

## 5. Typy
- DTO (zdefiniowane):
  - `CampDayDTO` — `id`, `group_id`, `day_number`, `date`, `theme`, `created_at`, `updated_at`.
  - `CampDayCreateCommand` — `day_number: number`, `date: DateISO`, `theme?: string`.
- ViewModel (nowe):
  - `CampDayCreateVM`
    - `dayNumber: number | ""` — do obsługi pustego pola liczbowego
    - `date: DateISO | ""`
    - `theme: string`
    - `redirect: "detail" | "list"`
  - `CampDayFormErrors`
    - `dayNumber?: string`
    - `date?: string`
    - `theme?: string`
    - `_form?: string` (błędy globalne, np. 409)
- Zod schemas (nowe):
  - `CampDayCreateSchema` (payload)
    - `day_number`: `z.number().int().min(1).max(30)`
    - `date`: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` + refiny zakresu
    - `theme`: `z.string().trim().max(280).optional()`
  - `CampDayCreateVmSchema` (dla UI, pozwala na puste stringi i konwersje)
    - mapuje do `CampDayCreateCommand` przy submit

## 6. Zarządzanie stanem
- Lokalne w `CampDayCreateForm`:
  - `vm: CampDayCreateVM`
  - `errors: CampDayFormErrors`
  - `submitting: boolean`
- Zewnętrzne dane pomocnicze:
  - `useGroupSettings(groupId)` — do pozyskania `group.start_date`, `group.end_date`, `permissions.role`
- Logika:
  - Blokuj UI i pokaż komunikat, jeśli użytkownik nie jest adminem (`permissions.role !== "admin"`).
  - Ustaw `min`/`max` dla pola daty na podstawie zakresu grupy.
  - Walidacja onSubmit; opcjonalnie onBlur do wczesnego feedbacku.

## 7. Integracja API
- Endpoint: `POST /api/groups/{group_id}/camp-days`
- Request body: `CampDayCreateCommand`
- Response 201: `{ data: CampDayDTO }`
- Response błędów: `{ error: { code: ApiErrorCode; message: string; details?: Record<string, unknown> } }`
- Mapowanie statusów (wg implementacji backendu):
  - 400: `VALIDATION_ERROR` | `DAY_OUT_OF_RANGE` | `DATE_OUT_OF_GROUP_RANGE`
  - 401: `UNAUTHORIZED`
  - 403: `FORBIDDEN_ROLE`
  - 404: `NOT_FOUND`
  - 409: `DUPLICATE_DAY_NUMBER` | `CONFLICT`
  - 500: `INTERNAL_ERROR`
- Klient (nowy): `src/lib/camp-days/api.client.ts`
  - `export async function createCampDay(groupId: UUID, payload: CampDayCreateCommand): Promise<ApiResponse<CampDayDTO>>`

## 8. Interakcje użytkownika
- Wprowadzenie `day_number` → walidacja zakresu, błąd inline.
- Wybór `date` → blokada wyboru poza zakresem, błąd inline.
- Wpisanie `theme` → licznik/limit, błąd inline po przekroczeniu.
- Submit „Utwórz i przejdź do dnia” → POST; po 201: redirect do `/groups/{group_id}/camp-days/{id}`.
- Submit „Utwórz i wróć do listy” → POST; po 201: redirect do `/groups/{group_id}/camp-days`.
- Cancel → nawigacja do listy bez zmian.

## 9. Warunki i walidacja
- Klient:
  - `day_number` ∈ [1, 30]
  - `date` format `YYYY-MM-DD` i zakres `[group.start_date, group.end_date]`
  - `theme` opcjonalne, max 280, trymowane
- Serwer (odwzorowanie błędów):
  - `DAY_OUT_OF_RANGE` → komunikat przy `day_number`
  - `DATE_OUT_OF_GROUP_RANGE` → komunikat przy `date`
  - `DUPLICATE_DAY_NUMBER` → komunikat globalny + przy `day_number`
  - `VALIDATION_ERROR` → mapowanie `details` na pola

## 10. Obsługa błędów
- Inline przy polach na podstawie walidacji klienta i mapowania odpowiedzi serwera.
- Baner/Toast (z `src/components/ui/sonner.tsx`) dla błędów globalnych (401/403/404/500).
- W stanie `submitting` przyciski disabled, spinner w przycisku.
- Przy 403 (nie admin) pokaż stronę stanu: „Brak uprawnień do tworzenia dni”.
- Sieć/timeout: ogólny komunikat i możliwość ponownego wysłania.

## 11. Kroki implementacji
1. Routing: utwórz `src/pages/groups/[group_id]/camp-days/new.astro` i wpiąć layout.
2. Klient API: dodaj `src/lib/camp-days/api.client.ts` z `createCampDay(groupId, payload)` (fetch POST, zwrot `ApiResponse<CampDayDTO>`).
3. Komponent: utwórz `src/components/camp-days/CampDayCreateForm.tsx`:
   - Stan VM, błędów, `submitting`.
   - Pobranie `group` i `permissions` przez `useGroupSettings(groupId)`.
   - Zod schemas: `CampDayCreateVmSchema`, `CampDayCreateSchema` (z refinem daty na bazie `group.start_date/end_date`).
   - Pola formularza i inline errors; ustaw `min`/`max` dla daty.
   - Dwa tryby submit: do szczegółu i do listy.
   - Mapowanie kodów błędów API na błędy formularza.
4. Strona Astro: w `new.astro` zamontuj `CampDayCreateForm` z `client:load` i przekaż `groupId` z params.
5. A11y/UX: dodać `aria-invalid`, `aria-describedby`, stany disabled, focus na pierwszym błędnym polu po submit.
6. Integracja nawigacji: po 201 pobierz `id` z `CampDayDTO` i wykonaj redirect zgodnie z wybranym trybem.
7. Komunikaty: skonfigurować toasty dla błędów globalnych i komunikat sukcesu.
8. E2E ręczne: przypadki poprawne i błędowe (duplikat numeru dnia, data poza zakresem, brak uprawnień).
9. Refaktoryzacja opcjonalna: wydzielić małe komponenty pól, jeśli potrzebne w innych miejscach.


