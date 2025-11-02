# Plan implementacji widoku Camp Days – edycja dnia

## 1. Przegląd
Widok służy do edycji metadanych dnia obozowego: daty (`date`) oraz tematu (`theme`). Dostęp ograniczony do administratorów grupy. Walidacja obejmuje sprawdzenie, czy `date` mieści się w zakresie dat grupy (`start_date..end_date`). Po sukcesie aktualizacji UI odświeża nagłówek/listę dni.

## 2. Routing widoku
- Ścieżka: `/groups/{id}/camp-days/{camp_day_id}/edit`
- Plik strony: `src/pages/groups/[id]/camp-days/[camp_day_id]/edit.astro`
- Serwerowo pobierane: szczegóły dnia (`GET /api/camp-days/{camp_day_id}`), opcjonalnie szczegóły grupy (`GET /api/groups/{id}`) dla zakresu dat, oraz uprawnienia (`GET /api/groups/{id}/permissions`) do warunkowania UI.

## 3. Struktura komponentów
- `edit.astro` (strona)
  - `CampDayEditForm.tsx` (React, klient)
    - `DateField` (wbudowany `<input type="date">`)
    - `ThemeTextarea` (`<textarea>`, możliwość wyczyszczenia)
    - `SaveCancelBar` (przyciski Zapisz/Anuluj; używa `components/ui/button`)
    - (opcjonalnie) `SaveStatusBar` – istniejący komponent dla spójności statusu zapisu
  - `PermissionGuard` – warunkowe renderowanie (admin-only) i maskowanie 404 dla braku członkostwa

Drzewo komponentów:

```
edit.astro
└─ CampDayEditForm (tsx)
   ├─ DateField
   ├─ ThemeTextarea
   └─ SaveCancelBar
```

## 4. Szczegóły komponentów

### CampDayEditForm
- Opis: Formularz edycji `date` i `theme` dla `camp_day_id`. Renderuje pola, waliduje dane z użyciem Zod, wysyła `PATCH`, obsługuje stany.
- Główne elementy:
  - `<form>`; pola: `<input type="date" name="date">`, `<textarea name="theme">`
  - Przyciski: Zapisz (primary), Anuluj (ghost)
  - (opcjonalnie) baner statusu zapisu (re-use `SaveStatusBar`)
- Obsługiwane interakcje:
  - Zmiana pola daty/tematu
  - Kliknięcie Zapisz (submit) → wywołanie `PATCH /api/camp-days/{camp_day_id}`
  - Kliknięcie Anuluj → powrót do widoku dnia (`/groups/{id}/camp-days`) lub detalicznego `/groups/{id}/camp-days/{camp_day_id}`
- Obsługiwana walidacja:
  - `date`: wymagane, format `YYYY-MM-DD`, musi mieścić się w zakresie `group.start_date .. group.end_date`
  - `theme`: tekst opcjonalny, możliwość ustawienia `""` (czyści pole po stronie serwera do `null`)
  - Błędy serwera: `DATE_OUT_OF_GROUP_RANGE`, `VALIDATION_ERROR` – mapowane do odpowiednich komunikatów
- Typy:
  - DTO: `CampDayDTO`, `ApiResponse<CampDayDTO>`
  - Command: `CampDayUpdateCommand`
  - ViewModel: `CampDayEditFormValues` (patrz sekcja Typy)
- Propsy:
  - `campDay: CampDayDTO`
  - `groupId: UUID`
  - `groupDateRange?: { startDate: DateISO; endDate: DateISO }`
  - `permissions?: GroupPermissionsDTO` (do wyłączenia przycisku Zapisz lub ukrycia sekcji)
  - `etag?: string` (opcjonalnie dla If-Match)

### PermissionGuard (w kontekście strony)
- Opis: Sprawdza członkostwo i rolę; renderuje formularz dla admina, maskuje 404 dla braku członkostwa.
- Elementy: logiczny wrapper w `edit.astro`, może wykorzystywać wynik `GET /api/groups/{id}/permissions`.
- Interakcje: brak bezpośrednich; kontroluje renderowanie/redirect.
- Walidacja: jeśli `not member` → 404; jeśli `member && !admin` → UI bez możliwości zapisu (lub redirect z komunikatem 403 – wg wymagań: admin-only w edycji).
- Typy: `GroupPermissionsDTO`.
- Propsy: `children`, `permissions`.

## 5. Typy
- Z istniejących w `src/types.ts`:
  - `UUID = string`
  - `DateISO = string`
  - `CampDayDTO = Pick<CampDayEntity, "id" | "group_id" | "day_number" | "date" | "theme" | "created_at" | "updated_at">`
  - `CampDayUpdateCommand = Partial<Pick<TablesUpdate<"camp_days">, "date" | "theme">>`
  - `GroupPermissionsDTO` (zawiera `role`, `can_edit_all`, `can_edit_assigned_only`, plus `group_id`)
  - `ApiResponse<T>` / `ApiSingle<T>`
  - (opcjonalnie) `ConcurrencyControlHeaders` dla `If-Match`

- Nowe ViewModel i pomocnicze:
  - `interface CampDayEditFormValues { date: DateISO; theme: string | "" }`
  - `interface GroupDateRange { startDate: DateISO; endDate: DateISO }`
  - `type PatchCampDayResponse = ApiResponse<CampDayDTO>`

## 6. Zarządzanie stanem
- Lokalny stan formularza w `CampDayEditForm`:
  - `values: CampDayEditFormValues`
  - `errors: { date?: string; theme?: string }`
  - `isSubmitting: boolean`
  - `apiError?: string | null`
  - `etag?: string` (jeśli używamy ETag z GET, do If-Match)
- Źródła danych (ładowane w `edit.astro` i przekazywane jako propsy):
  - `campDay` (prefill)
  - `groupId`, `groupDateRange` (dla walidacji zakresu)
  - `permissions`
- Hooki (opcjonalne, jeżeli występują re-use):
  - `useCampDayEditForm(initial: ..., range: GroupDateRange)` – enkapsulacja walidacji Zod i submit
  - Alternatywnie prosta implementacja w komponencie bez dedykowanego hooka

## 7. Integracja API
- Pobranie dnia: `GET /api/camp-days/{camp_day_id}` → `ApiSingle<CampDayDTO>`
- Aktualizacja: `PATCH /api/camp-days/{camp_day_id}` body: `CampDayUpdateCommand` → `ApiSingle<CampDayDTO>`
  - Nagłówki: `Content-Type: application/json`
  - (opcjonalnie) `If-Match: <etag>` gdy obsługujemy współbieżność
- Uprawnienia: `GET /api/groups/{group_id}/permissions` → `ApiSingle<GroupPermissionsDTO>`
- (rekomendowane) Szczegóły grupy: `GET /api/groups/{group_id}` → zawiera `start_date`, `end_date` (dla walidacji zakresu). Jeżeli brak – UI wykonuje tylko walidację formatową, a zakres pozostawia serwerowi, pokazując błąd zwrotny.

## 8. Interakcje użytkownika
- Edycja pola daty → natychmiastowa walidacja formatu oraz (jeśli dostępny zakres) walidacja przedziału
- Edycja pola `theme` → możliwość ustawienia pustego ciągu w celu wyczyszczenia
- Kliknięcie Zapisz → wysyłka PATCH, blokada przycisku, spinner; po sukcesie: toast sukcesu i nawigacja/odświeżenie nagłówka/listy
- Kliknięcie Anuluj → powrót (router.back lub link) do listy/detalu dnia

## 9. Warunki i walidacja
- Admin-only: tylko admin może zapisać zmiany (przycisk Zapisz ukryty/wyłączony dla nie-admina). Brak członkostwa → 404 mask.
- `date`:
  - format `YYYY-MM-DD`
  - jeżeli znany `group.start_date` i `group.end_date`, to `start_date <= date <= end_date`
- `theme`:
  - opcjonalne, akceptuje pusty ciąg jako „wyczyść”
- Wpływ na UI: błędy inline pod polami, przycisk Zapisz zablokowany przy błędach, sonner toast dla sukcesu/porażki.

## 10. Obsługa błędów
- `DATE_OUT_OF_GROUP_RANGE`: komunikat „Data musi mieścić się w zakresie dat grupy”
- `VALIDATION_ERROR`: mapowanie do pól (jeśli `details` zawiera wskazanie pola), inaczej komunikat ogólny
- `FORBIDDEN`: dla braku uprawnień admina – zablokuj zapis; jeśli brak członkostwa – maskuj 404
- `NOT_FOUND`: render Astro 404
- `RATE_LIMIT_EXCEEDED`/`INTERNAL_ERROR`: pokaż toast z prośbą o ponowną próbę

## 11. Kroki implementacji
1. Routing: utwórz `src/pages/groups/[id]/camp-days/[camp_day_id]/edit.astro` (SSR)
   - W `get`/loaderze pobierz: `campDay`, `permissions`, (opcjonalnie) `group` dla zakresu dat
   - Zaimplementuj maskowanie 404 dla braku członkostwa
2. Komponent formularza: dodaj `src/components/camp-days/CampDayEditForm.tsx`
   - Pola: `<input type="date">`, `<textarea>`; przyciski Zapisz/Anuluj (z `components/ui/button`)
   - Walidacja: Zod schema z refine na zakres dat jeśli dostępny
3. Integracja API PATCH: dodaj/wykorzystaj helper w `src/lib/camp-days/updateCampDay.ts`
   - Sygnatura: `(campDayId: UUID, body: CampDayUpdateCommand, headers?: ConcurrencyControlHeaders) => Promise<ApiResponse<CampDayDTO>>`
4. Pobranie danych wejściowych: dodaj/wykorzystaj `src/lib/camp-days/getCampDay.ts`, `src/lib/groups/getGroup.ts`, `src/lib/groups/getPermissions.ts`
5. UI stanów: dodaj blokadę submitu, obsługę `apiError`, mapowanie kodów błędów do komunikatów
6. Uprawnienia: ukryj/wyłącz Zapisz, jeśli użytkownik nie ma roli admin w danej grupie
7. UX po sukcesie: pokaż toast (użyj `components/ui/sonner`), odśwież nagłówek/listę dni; nawiguj do widoku dnia lub listy
8. Testy ręczne: zakres dat, czyszczenie `theme`, brak członkostwa (404), nie-admin (brak możliwości zapisu), błędy serwera

---

## Załączniki – definicje walidacji (przykład Zod)

```ts
import { z } from "zod";

export const campDayEditSchema = (range?: { startDate: string; endDate: string }) =>
  z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/u, "Nieprawidłowy format daty (YYYY-MM-DD)")
      .superRefine((val, ctx) => {
        if (!range) return;
        if (val < range.startDate || val > range.endDate) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Data poza zakresem grupy" });
        }
      }),
    theme: z.string().optional().transform((v) => v ?? ""),
  });
```


