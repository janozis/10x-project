# Plan implementacji widoku Lista grup

## 1. Przegląd
Widok służy do przeglądania grup HAL, ich podstawowych informacji i szybkich akcji: utworzenia nowej grupy oraz dołączenia do grupy przez kod zaproszenia. Dodatkowo wspiera miękkie usuwanie i przywracanie grup (zakładka „Ostatnio usunięte”).

Cele UX:
- Szybki wgląd w listę grup użytkownika (karty, siatka, puste stany).
- Prosta ścieżka tworzenia i dołączania do grupy (dialogi formularzy).
- Jasna komunikacja błędów i wyników akcji (aria-live, stany przycisków, potwierdzenia).

## 2. Routing widoku
- Ścieżka: `/groups`
- Plik strony: `src/pages/groups.astro`
- SSR: Astro 5 (strona), interaktywne wyspy w React 19 dla formularzy i akcji.
- Dane: pobierane z REST API `GET /api/groups` po stronie klienta (fetch) w komponencie React.

## 3. Struktura komponentów
Struktura plików i komponentów (nowe jeśli nie istnieją):

```
src/pages/groups.astro                              // Layout + mount React wyspy
src/components/groups/GroupsView.tsx               // Kontener logiki i układu
src/components/groups/GroupsHeader.tsx             // Tytuł, CTA: "Utwórz", "Dołącz"
src/components/groups/GroupsGrid.tsx               // Siatka kart grup
src/components/groups/GroupCard.tsx                // Pojedyncza karta grupy
src/components/groups/EmptyState.tsx               // Pusty stan listy
src/components/groups/CreateGroupDialog.tsx        // Formularz tworzenia grupy (Dialog)
src/components/groups/JoinGroupDialog.tsx          // Formularz dołączania do grupy (Dialog)
src/components/groups/ConfirmDialog.tsx            // Generyjny dialog potwierdzenia (usuń/przywróć)

// UI (Shadcn/ui minimalny zestaw - jeśli brak):
src/components/ui/dialog.tsx
src/components/ui/input.tsx
src/components/ui/label.tsx
src/components/ui/textarea.tsx
src/components/ui/select.tsx
src/components/ui/card.tsx
src/components/ui/badge.tsx
```

Hooki i klient API (frontend):
```
src/lib/groups/api.client.ts        // Wywołania fetch do /api/groups...
src/lib/groups/useGroups.ts         // Lista grup (pobieranie, refresh)
src/lib/groups/useCreateGroup.ts    // Tworzenie grupy
src/lib/groups/useJoinGroup.ts      // Dołączanie do grupy
src/lib/groups/useDeleteGroup.ts    // Usuwanie (soft-delete)
src/lib/groups/useRestoreGroup.ts   // Przywracanie
```

## 4. Szczegóły komponentów

### GroupsView
- Opis: Kontener widoku. Odpowiada za pobranie listy grup, rozgałęzienie UI (grid vs pusty stan), sterowanie dialogami, ewentualny przełącznik „Aktywne / Ostatnio usunięte”.
- Główne elementy: `GroupsHeader`, `GroupsGrid` lub `EmptyState`, `CreateGroupDialog`, `JoinGroupDialog`, `ConfirmDialog`.
- Zdarzenia: `onCreateClick`, `onJoinClick`, `onDeleteRequest(groupId)`, `onRestoreRequest(groupId)`.
- Walidacja: brak bezpośrednia (delegowana do formularzy), kontrola stanów (np. blokada akcji w trakcie requestów).
- Typy: `GroupDTO` (z `src/types.ts`), `GroupCardVM` (nowy), stany hooków.
- Propsy: brak (komponent najwyższego poziomu na stronie), opcjonalnie `initialTab`.

### GroupsHeader
- Opis: Pasek z tytułem, liczbą grup, CTA „Utwórz grupę”, „Dołącz do grupy”, przełącznik zakładek (Aktywne/Ostatnio usunięte).
- Główne elementy: nagłówek, licznik, `Button`, ewentualny `SegmentedControl`/`Tabs`.
- Zdarzenia: `onOpenCreate`, `onOpenJoin`, `onTabChange`.
- Walidacja: n/d.
- Typy: proste callbacki, liczba elementów.
- Propsy: `{ total: number; onOpenCreate: () => void; onOpenJoin: () => void; tab: 'active'|'deleted'; onTabChange: (tab) => void }`.

### GroupsGrid
- Opis: Renderuje siatkę kart grup.
- Główne elementy: kontener siatki (Tailwind grid), lista `GroupCard`.
- Zdarzenia: propaguje akcje kart (delete/restore/copy/join etc.).
- Walidacja: n/d.
- Typy: `GroupCardVM[]`.
- Propsy: `{ items: GroupCardVM[]; onDelete: (id) => void; onRestore: (id) => void }`.

### GroupCard
- Opis: Pojedyncza karta prezentująca: nazwę, okres (start–end), `lore_theme`, status, opcjonalnie `max_members`, akcyjne przyciski.
- Główne elementy: `Card`, `Badge` statusu, przyciski „Usuń”, „Przywróć” (dla usuniętych), „Szczegóły” (link do widoku szczegółów, TBD), „Kopiuj kod” (jeśli `invite.code`).
- Zdarzenia: `onDelete(id)`, `onRestore(id)`, `onCopyInvite(code)`.
- Walidacja: n/d.
- Typy: `GroupCardVM`.
- Propsy: `{ item: GroupCardVM; onDelete?: (id) => void; onRestore?: (id) => void; onCopyInvite?: (code: string) => void }`.

### EmptyState
- Opis: Pusty stan z CTA do utworzenia lub dołączenia.
- Główne elementy: ilustracja/ikona, opis, dwa przyciski.
- Zdarzenia: `onOpenCreate`, `onOpenJoin`.
- Walidacja: n/d.
- Typy: proste callbacki.
- Propsy: `{ onOpenCreate: () => void; onOpenJoin: () => void }`.

### CreateGroupDialog
- Opis: Dialog z formularzem tworzenia grupy.
- Główne elementy: `Dialog`, `form` z polami: `name`, `description`, `lore_theme`, `start_date` (input type=date), `end_date` (date), `max_members` (number).
- Zdarzenia: `onSubmit(values)`, `onClose()`; emisja sukcesu z przekazaniem utworzonej grupy.
- Walidacja (klient):
  - `name`, `description`, `lore_theme`: non-empty (min 1), max: 200/2000/200 znaków.
  - `start_date`, `end_date`: format `YYYY-MM-DD` i `end_date >= start_date`.
  - `max_members`: opcjonalne, int `1..500`.
- Typy: `GroupFormValues`, `ApiResponse<GroupDTO>`.
- Propsy: `{ open: boolean; onOpenChange: (v:boolean)=>void; onCreated?: (group: GroupDTO) => void }`.

### JoinGroupDialog
- Opis: Dialog z formularzem wpisania kodu zaproszenia i dołączenia do grupy.
- Główne elementy: `Dialog`, `form` z polem `code`.
- Zdarzenia: `onSubmit({code})`, `onClose()`; sukces: odświeżenie listy.
- Walidacja (klient): `code` regex `^[A-HJ-NP-Za-km-z1-9]{8}$` (bez znaków mylących 0,O,l,I).
- Typy: `JoinGroupFormValues`, `ApiResponse<GroupDTO>` (lub brak danych, zależnie od backendu).
- Propsy: `{ open: boolean; onOpenChange: (v:boolean)=>void; onJoined?: () => void }`.

### ConfirmDialog
- Opis: Prost y dialog potwierdzenia (usuń/przywróć). Działa w trybie generycznym.
- Główne elementy: `Dialog`, tytuł, opis, przyciski `Potwierdź`/`Anuluj`.
- Zdarzenia: `onConfirm()`, `onCancel()`.
- Typy: proste callbacki.
- Propsy: `{ open:boolean; onOpenChange:(v)=>void; title:string; description?:string; confirmText?:string; variant?:'destructive'|'default'; onConfirm:()=>void }`.

## 5. Typy

Wykorzystujemy istniejące typy z `src/types.ts`:
- `GroupDTO`, `GroupStatus`, `UUID`, `DateISO`, `TimestampISO`, `ApiResponse<T>`, `ApiListResponse<T>`, `GroupCreateCommand`.

Nowe typy na potrzeby widoku (ViewModel + formularze):

```ts
// Prezentacja karty grupy (pochodzi z GroupDTO z dodatkowymi polami wyliczonymi)
export interface GroupCardVM {
  id: UUID;
  name: string;
  periodLabel: string;     // np. "2025-07-01 — 2025-07-14"
  loreTheme: string;       // mapowane z lore_theme
  status: GroupStatus;
  inviteCode?: string | null;
  maxMembers?: number | null;
  createdAt: TimestampISO;
  updatedAt: TimestampISO;
  isArchived: boolean;     // status === 'archived'
}

// Dane formularza tworzenia (mirroring GroupCreateCommand; client-side optional for max_members)
export interface GroupFormValues {
  name: string;
  description: string;
  lore_theme: string;
  start_date: DateISO;
  end_date: DateISO;
  max_members?: number | null;
}

export interface JoinGroupFormValues {
  code: string; // 8 znaków zgodnie ze wzorcem serwera
}

export interface GroupsListState {
  loading: boolean;
  error?: string;
  items: GroupDTO[];
  showDeleted: boolean; // zakładki: Aktywne/Ostatnio usunięte (przyszłościowo)
}
```

Mapper VM:
- `GroupCardVM` = mapowanie z `GroupDTO`:
  - `periodLabel = `${start_date} — ${end_date}``
  - `loreTheme = lore_theme`
  - `inviteCode = data.invite?.code ?? null`
  - `isArchived = status === 'archived'`

## 6. Zarządzanie stanem
- Lokalny stan w `GroupsView` (otwarcie/zamknięcie dialogów, aktywna zakładka, identyfikatory dla operacji). 
- Dedykowane hooki do komunikacji z API i przechowywania stanu danych:
  - `useGroups()`:
    - odpowiedzialność: pobranie listy, trzymanie `loading/error/items`, `refresh()`.
    - opcjonalnie parametr `showDeleted` (gdy backend doda filtr).
  - `useCreateGroup()`:
    - `create(values: GroupFormValues): Promise<ApiResponse<GroupDTO>>`.
  - `useJoinGroup()`:
    - `join(code: string): Promise<ApiResponse<GroupDTO>>|Promise<ApiResponse<unknown>>`.
  - `useDeleteGroup()`:
    - `remove(id: UUID): Promise<ApiResponse<unknown>>` (204/200 zależnie od backendu).
  - `useRestoreGroup()`:
    - `restore(id: UUID): Promise<ApiResponse<GroupDTO>>|Promise<ApiResponse<unknown>>`.

Konwencje UX:
- Podczas requestów: blokada przycisków, spinnery (`aria-busy`, `aria-disabled`).
- Wyniki akcji: regiony `aria-live="polite"` (inline) zamiast toastów (jeśli brak systemu toastów).

## 7. Integracja API

Wywołania i oczekiwane payloady (zgodne z opisem endpointów i typami):

- `GET /api/groups`
  - Response: `ApiListResponse<GroupDTO>`.
  - W UI: mapuj `data` na `GroupCardVM[]` i pokaż siatkę lub `EmptyState`.

- `POST /api/groups`
  - Request body (JSON): `GroupCreateCommand` (z klienta: `GroupFormValues`).
  - Walidacja klienta musi odzwierciedlać serwerową (`end_date >= start_date`, `max_members 1..500`).
  - Response: `ApiResponse<GroupDTO>`. Po sukcesie odśwież listę.
  - (US-002) „Otrzymuje kod zaproszenia”: jeśli backend udostępnia `POST /api/groups/{id}/invite`, po utworzeniu wywołaj je i wyświetl kod w komunikacie sukcesu (fallback: informacja, że kod można wygenerować później).

- `DELETE /api/groups/{group_id}` (soft delete)
  - Response: `ApiResponse<unknown>` lub 204. Po sukcesie odśwież listę lub przenieś pozycję do zakładki „Ostatnio usunięte”.

- `POST /api/groups/{group_id}/restore`
  - Response: `ApiResponse<GroupDTO>` lub `ApiResponse<unknown>`. Po sukcesie odśwież listę.

- `POST /api/groups/join`
  - Request: `{ code: string }` (walidacja regex po stronie klienta + serwera).
  - Response: `ApiResponse<GroupDTO>` lub `ApiResponse<unknown>`. Po sukcesie odśwież listę i zasygnalizuj dołączenie.

Obsługa błędów wg kodów (`ApiErrorCode`):
- 400: `VALIDATION_ERROR`, `DATE_RANGE_INVALID`, `GROUP_LIMIT_REACHED`, `BAD_REQUEST` → pokaż błędy pól/baner błędu.
- 401: `UNAUTHORIZED` → CTA do logowania.
- 404: `NOT_FOUND` → w usuwaniu/przywracaniu/join (nieistniejąca grupa/kod) – baner błędu.
- 409: `CONFLICT` → kolizje stanu.
- 429: `RATE_LIMIT_EXCEEDED` → komunikat o limitach.
- 5xx: `INTERNAL_ERROR` → gener. komunikat i instrukcja ponowienia.

## 8. Interakcje użytkownika
- „Utwórz grupę” → otwiera `CreateGroupDialog` → walidacja → `POST /api/groups` → (opcjonalnie) wygeneruj zaproszenie → aria-live sukces → odśwież listę → fokus zwrotny na nową kartę (jeśli łatwe; inaczej na nagłówek).
- „Dołącz do grupy” → otwiera `JoinGroupDialog` → walidacja kodu → `POST /api/groups/join` → sukces → odśwież listę.
- „Usuń” na karcie → `ConfirmDialog` → `DELETE` → sukces → usuń z listy lub przenieś do „Ostatnio usunięte”.
- „Przywróć” (w zakładce „Ostatnio usunięte”) → `POST restore` → sukces → wraca do „Aktywne”.
- „Kopiuj kod” → skopiuj `invite.code` do schowka, aria-live potwierdzenie (jeśli dostępne).

## 9. Warunki i walidacja
- Create:
  - `name`: min 1, max 200.
  - `description`: min 1, max 2000.
  - `lore_theme`: min 1, max 200.
  - `start_date`, `end_date`: `YYYY-MM-DD`, `end_date >= start_date` (walidacja w `handleSubmit` + zodResolver).
  - `max_members`: opcjonalne; jeśli podane: `1..500`.
- Join:
  - `code`: regex `^[A-HJ-NP-Za-km-z1-9]{8}$`.
- Usuwanie/Przywracanie:
  - Potwierdzenie akcji; w UI blokada wielokrotnego wysłania w trakcie requestu.

Wpływ na stan UI:
- Błędy pól → komunikaty przy polach + `aria-invalid`, `aria-describedby`.
- Błędy globalne → baner nad formularzem (region `aria-live`).
- Przy requestach → `isSubmitting`, `aria-busy`, spinner w przycisku.

## 10. Obsługa błędów
- Mapowanie kodów błędów do UI:
  - `DATE_RANGE_INVALID` → błąd przy `end_date` + informacja globalna.
  - `GROUP_LIMIT_REACHED` → baner z informacją o limicie i obecnym stanie.
  - `INVITE_INVALID`, `INVITE_EXPIRED`, `INVITE_MAXED` (Join) → błąd pola `code`.
  - `UNAUTHORIZED` → CTA do logowania.
  - Brak sieci / `INTERNAL_ERROR` → gener. komunikat, instrukcja „spróbuj ponownie”.
- Retry: umożliwić ponowne wysłanie formularza, przycisk „Spróbuj ponownie”.
- Optymistyczne aktualizacje: nie wymagane; preferowany twardy refresh po sukcesie operacji modyfikujących.

## 11. Kroki implementacji
1) Routing i strona:
   - Utwórz `src/pages/groups.astro` z layoutem i mountem `GroupsView` (React island).
2) UI i podstawowy szkielet:
   - Dodaj `GroupsView`, `GroupsHeader`, `GroupsGrid`, `GroupCard`, `EmptyState`.
   - Jeśli brak, dodaj minimalne komponenty Shadcn/ui: `dialog`, `input`, `label`, `textarea`, `select`, `card`, `badge` (zgodnie z istniejącym stylem `button.tsx`).
3) Klient API i hooki:
   - `api.client.ts`: `listGroups()`, `createGroup()`, `joinGroup()`, `deleteGroup()`, `restoreGroup()`, (opcjonalnie) `generateInvite(groupId)`.
   - `useGroups` (pobieranie + `refresh`), `useCreateGroup`, `useJoinGroup`, `useDeleteGroup`, `useRestoreGroup`.
4) Formularze:
   - `CreateGroupDialog`: `react-hook-form` + `zodResolver`; walidacja jak na serwerze.
   - `JoinGroupDialog`: walidacja regex kodu.
5) Integracja akcji:
   - Podłącz CTA w `GroupsHeader` i `EmptyState` (otwieranie dialogów).
   - Podłącz akcje kart (usuń/przywróć/kopiuj kod).
6) Stany i dostępność:
   - `aria-live` dla komunikatów globalnych, `aria-invalid` i `aria-describedby` dla pól.
   - Blokady przy requestach (`disabled`, `aria-busy`), focus management po sukcesie/błędzie.
7) Obsługa błędów i komunikaty:
   - Mapowanie `ApiError.error.code` na komunikaty w formularzach i ogólne.
8) „Ostatnio usunięte” (przyszłościowo):
   - Dodać przełącznik zakładek w UI.
   - Gdy backend udostępni, obsłużyć filtr w `useGroups(showDeleted)`.
9) Testy manualne / scenariusze:
   - Tworzenie z poprawnymi i błędnymi danymi (data, limity, puste pola).
   - Dołączanie z poprawnym/niepoprawnym kodem.
   - Usunięcie i przywrócenie (po wdrożeniu backendu).
10) Perf i edge cases:
   - Skeleton dla listy podczas ładowania.
   - Paginate (opcjonalnie) – dodać dopiero przy dużej liczbie grup.


