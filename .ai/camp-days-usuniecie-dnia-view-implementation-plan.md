## Plan implementacji widoku Camp Days – usunięcie dnia

## 1. Przegląd
Widok dotyczy akcji usunięcia wybranego dnia obozu (hard delete) wraz z powiązanymi slotami. Akcja jest dostępna wyłącznie dla roli admin w kontekście danej grupy. Po potwierdzeniu usunięcia UI powinien: (a) na liście odświeżyć listę dni, (b) z poziomu widoku dnia przekierować na listę dni grupy. Komunikacja stanu i błędów odbywa się przez ConfirmDialog oraz toasty.

## 2. Routing widoku
- Brak dedykowanej ścieżki – akcja wykonywana z:
  - listy dni: `src/pages/groups/[group_id]/camp-days.astro` → `CampDaysPage`
  - widoku dnia: `src/pages/groups/[group_id]/camp-days/[camp_day_id].astro` → `CampDayView`
- API: `DELETE /api/camp-days/{camp_day_id}` (istniejący endpoint)

## 3. Struktura komponentów
- CampDaysPage (istniejący szkic)
  - CampDayList (dopełniane przy okazji – minimalny zakres dla akcji usuń)
    - CampDayRow/Card
      - CampDayActions
        - DeleteCampDayButton → ConfirmDialog
- CampDayView (istniejący)
  - DayHeader
  - CampDayPageActions (nowy, mały pasek akcji) lub przycisk obok nagłówka
    - DeleteCampDayButton → ConfirmDialog
- ConfirmDialog (istniejący, wspólny)
- Toaster (istniejący konfigurator `sonner`)

## 4. Szczegóły komponentów
### DeleteCampDayButton
- Opis: Mały kontroler renderujący przycisk „Usuń dzień”, zarządzający ConfirmDialog oraz wywołaniem API. Warianty użycia: lista (odświeża listę) i widok dnia (redirect po sukcesie).
- Główne elementy: `Button` (variant="destructive"), `ConfirmDialog` z tytułem/treścią, integracja z toastami.
- Obsługiwane interakcje:
  - click „Usuń dzień” → otwarcie ConfirmDialog
  - click „Potwierdź” → wywołanie `DELETE /api/camp-days/{camp_day_id}` i obsługa sukces/błąd
- Obsługiwana walidacja:
  - Admin-only: warunkowe renderowanie na podstawie `GroupPermissionsDTO.role === "admin"`
  - W trakcie requestu: disabled/aria-busy, ConfirmDialog `loading=true`
- Typy: `UUID`, `GroupPermissionsDTO`, `ApiResponse<{ id: UUID }>`
- Propsy:
  - `campDayId: UUID`
  - `groupId: UUID`
  - `canDelete: boolean` (z perm-fetcha lub przekazane z rodzica)
  - `mode: "list" | "details"` (steruje post-akcją: refresh vs redirect)
  - `onDeleted?: () => Promise<void> | void` (umożliwia odświeżenie listy)

### CampDayActions (lista)
- Opis: Zestaw akcji dla elementu listy. W tym zakresie: integracja z `DeleteCampDayButton`.
- Główne elementy: `Button`/`Dropdown` + `DeleteCampDayButton`.
- Obsługiwane interakcje: click „Usuń” → ConfirmDialog → DELETE → toast + `onDeleted()`.
- Obsługiwana walidacja: ukrycie „Usuń” gdy brak uprawnień admin.
- Typy: `UUID`, `GroupPermissionsDTO`.
- Propsy: `{ campDayId: UUID; groupId: UUID; canManageDays: boolean; onDeleted: () => void }`.

### CampDayPageActions (widok dnia)
- Opis: Pasek akcji w widoku dnia; zawiera „Usuń dzień”. Po sukcesie przekierowuje na listę dni grupy.
- Główne elementy: `DeleteCampDayButton` z `mode="details"`.
- Obsługiwane interakcje: confirm → DELETE → toast → `window.location.href = "/groups/${groupId}/camp-days"`.
- Obsługiwana walidacja: admin-only.
- Typy: `UUID`, `GroupPermissionsDTO`.
- Propsy: `{ campDayId: UUID; groupId: UUID; canManageDays: boolean }`.

### ConfirmDialog (istniejący `src/components/groups/ConfirmDialog.tsx`)
- Opis: Dialog potwierdzenia akcji destrukcyjnych. Reużywamy istniejący interfejs.
- Główne elementy: nagłówek, opis, przyciski Anuluj/Potwierdź.
- Obsługiwane interakcje: `onConfirm`, `onOpenChange`.
- Obsługiwana walidacja: stany ładowania; focus management; aria.
- Typy: `ConfirmDialogProps` (istniejące).
- Propsy: `open`, `title`, `description`, `confirmText`, `variant`, `loading`, `onConfirm`, `onOpenChange`.

## 5. Typy
- DTO (istniejące w `src/types.ts`):
  - `UUID`, `CampDayDTO`, `GroupPermissionsDTO`, `ApiResponse<T>`
  - Endpoint delete zwraca: `ApiResponse<{ id: UUID }>`
- ViewModel (nowe, lekkie – tylko jeśli potrzebne w liście):
  - `CampDayListItemVM`:
    - `id: UUID`
    - `groupId: UUID`
    - `dayNumber: number`
    - `date: DateISO`
    - `theme?: string | null`
    - (opcjonalnie) `slotsCount?: number`, `totalMinutes?: number`

## 6. Zarządzanie stanem
- Uprawnienia:
  - Lista: `useGroupPermissions(groupId)` lub jednorazowy fetch w komponencie nadrzędnym i przekazanie `canManageDays = permissions.role === "admin"`.
  - Widok dnia: `permissions` już ładowane w `.astro`; w `CampDayView` są dostępne – przekazać dalej do akcji.
- Lokalny stan przycisku:
  - `openConfirm: boolean`, `isDeleting: boolean`, `error?: string` (tylko na czas akcji)
- Odświeżanie danych:
  - Lista: po sukcesie delete wywołanie `refresh()` listy (lub `onDeleted()` przekazane z listy/rodzica)
  - Widok dnia: redirect na listę grupy po sukcesie

## 7. Integracja API
- `DELETE /api/camp-days/{camp_day_id}`
  - Request: bez body
  - Response (200): `{"data": {"id": UUID}}`
  - Błędy: 401 `UNAUTHORIZED`, 403 `FORBIDDEN_ROLE`, 404 `NOT_FOUND`, 500 `INTERNAL_ERROR`
- `GET /api/groups/{group_id}/camp-days` (odświeżenie listy)
  - Response: `ApiListResponse<CampDayDTO>`
- Klient (nowy): `src/lib/camp-days/api.client.ts`
  - `deleteCampDay(campDayId: UUID): Promise<ApiResponse<{ id: UUID }>>`
  - `listCampDays(groupId: UUID): Promise<ApiListResponse<CampDayDTO>>` (jeśli lista będzie w tym zadaniu potrzebna do refresh)

## 8. Interakcje użytkownika
- Z listy:
  - Użytkownik (admin) klika „Usuń” przy wybranym dniu → ConfirmDialog z ostrzeżeniem o usunięciu powiązanych slotów → Potwierdź → sukces: toast „Usunięto dzień”, odświeżenie listy → przycisk w trakcie disabled.
- Z widoku dnia:
  - Użytkownik (admin) klika „Usuń dzień” → ConfirmDialog → Potwierdź → sukces: toast + redirect na `/groups/{group_id}/camp-days`.
- Osoba bez uprawnień:
  - Przycisk nie jest renderowany (admin-only). Jeśli wymusi request → 403 i toast z błędem.

## 9. Warunki i walidacja
- Admin-only:
  - Lista: ukryj przycisk, jeśli `permissions.role !== "admin"`.
  - Widok dnia: analogicznie.
- Identyfikatory:
  - Wymagane `camp_day_id` (komponent usuwa konkretny rekord); `groupId` potrzebny do przekierowania.
- Dostępność:
  - ConfirmDialog: focus trap, `aria-labelledby`, opisy, `variant="destructive"` dla semantycznego sygnału.
- Stany ładowania:
  - Zablokowanie potwierdzenia podczas requestu, `aria-busy`.

## 10. Obsługa błędów
- 401: Toast „Musisz być zalogowany, aby wykonać tę akcję.”
- 403: Toast „Brak uprawnień do usunięcia dnia.”
- 404:
  - Z listy: Toast „Dzień nie istnieje lub został już usunięty.” i odświeżenie listy.
  - Z widoku dnia: Toast, a następnie redirect na listę.
- 500/unknown: Toast „Nie udało się usunąć dnia. Spróbuj ponownie.”
- Sieć: Toast z generycznym błędem; brak redirectu, pozostaw dialog zamknięty i stan przywrócony.

## 11. Kroki implementacji
1. Dodaj klienta API: `src/lib/camp-days/api.client.ts` z funkcjami `deleteCampDay` i (opcjonalnie) `listCampDays` na wzór istniejących klientów (`lib/groups/api.client.ts`).
2. Utwórz komponent `DeleteCampDayButton.tsx` w `src/components/camp-days/`:
   - Propsy: `campDayId`, `groupId`, `canDelete`, `mode`, `onDeleted`.
   - Renderuj przycisk (variant="destructive") i `ConfirmDialog` z:
     - `title="Usuń dzień obozu"`
     - `description="Usunięcie spowoduje skasowanie wszystkich slotów tego dnia. Tej operacji nie można cofnąć."`
     - `confirmText="Usuń"`, `variant="destructive"`
   - `onConfirm`: wywołaj `deleteCampDay(campDayId)`; na sukces:
     - `mode="list"`: `toast.success("Usunięto dzień.")`; `await onDeleted?.()`
     - `mode="details"`: `toast.success("Usunięto dzień.")`; `window.location.href = "/groups/${groupId}/camp-days"`
   - Obsłuż błędy wg sekcji 10.
3. Lista: zintegrować w `CampDaysPage` minimalny szkielet z elementami listy (jeśli już powstaje) lub tymczasowo dodać przycisk delete dla scenariusza testowego jednego elementu. Docelowo w `CampDayActions` użyj `DeleteCampDayButton` z `mode="list"` i podpiętym `onDeleted()`.
4. Widok dnia: dodaj lekki `CampDayPageActions` obok `DayHeader` w `CampDayView.tsx` i umieść tam `DeleteCampDayButton` z `mode="details"`. Przekaż `groupId`, `campDayId` i wylicz `canDelete = permissions?.role === "admin"`.
5. Dostępność i UX:
   - Dodaj `aria-label`/`title` do przycisku (np. „Usuń dzień”).
   - Upewnij się, że `ConfirmDialog` ma poprawny focus i `loading` blokuje ponowne kliknięcia.
6. Toasty: wykorzystaj `toast.success`/`toast.error` (istniejący `sonner`).
7. Testy ręczne:
   - Bez uprawnień (członek/edytor): przycisk niewidoczny.
   - Admin: sukces usunięcia (lista – odświeżenie; widok – redirect).
   - 404: zachowanie wg sekcji 10.
   - Sieć: obsługa błędu, brak redirectu.
8. Porządek i linter: sprawdź importy, typy TS, dopasowanie do istniejącej konwencji klientów fetch.
9. E2E manual: przejście z listy do dnia, usunięcie z poziomu dnia, powrót na listę.


