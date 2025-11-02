# Plan implementacji widoku Group Dashboard

## 1. Przegląd
Widok prezentuje kluczowe metryki postępu pracy grupy oraz ostatnią aktywność zespołu. Łączy SSR (kafle/makro metryki) z dynamiczną listą aktywności w React (real‑time), zapewnia skróty do najważniejszych działań i szybkie tworzenie zadania.

## 2. Routing widoku
- Ścieżka: `/groups/{group_id}/dashboard`
- Plik strony: `src/pages/groups/[group_id]/dashboard.astro`

## 3. Struktura komponentów
```
Page: groups/[group_id]/dashboard.astro (SSR)
├─ ArchivedBanner (SSR, opcjonalny)
├─ GroupDashboardTiles (SSR)
├─ DashboardShortcuts (SSR)
├─ QuickTaskForm (Client: React)
└─ RecentActivityFeed (Client: React, real-time)
```

## 4. Szczegóły komponentów
### ArchivedBanner
- Opis: Pasek ostrzegawczy u góry strony, widoczny gdy grupa ma status `archived`.
- Główne elementy: kontener z tłem, ikona, krótki opis, link do dokumentacji/archiwum.
- Interakcje: brak (statyczny).
- Walidacja: renderowany tylko gdy `group.status === "archived"`.
- Typy: wykorzystuje `GroupDTO['status']` (z `src/types.ts`).
- Propsy: `{ status: GroupStatus }`.

### GroupDashboardTiles
- Opis: Kafle z metrykami: `total_activities`, `evaluated_activities`, `% >7`, `tasks.pending/done` + pasek postępu.
- Główne elementy: grid 2–4 kolumny (Tailwind), każda karta z nagłówkiem i wartością; prosty progress bar dla `% >7`.
- Interakcje: brak (prezentacja), może emitować metadane do testów A11y.
- Walidacja:
  - `pct_evaluated_above_7` traktowane jako 0..1, wyświetlane w % (0–100). Clamp do zakresu.
  - Liczby całkowite dla `total_activities`, `evaluated_activities`, `tasks.pending`, `tasks.done`.
- Typy: wejście `GroupDashboardDTO` lub `DashboardTilesVM`.
- Propsy: `{ vm: DashboardTilesVM }`.

### DashboardShortcuts
- Opis: Zestaw skrótów (linki/przyciski) do najważniejszych widoków: Zajęcia, Zadania, Struktura dnia. Widoczne zawsze; część akcji może być warunkowa dla ról.
- Główne elementy: `<a>`/`Button` do: `/groups/{id}/activities`, `/groups/{id}/tasks`, `/groups/{id}/camp-days` (docelowo).
- Interakcje: kliknięcia linków.
- Walidacja: ukryj akcje admin‑only, jeśli brak uprawnień.
- Typy: `GroupPermissionsDTO`.
- Propsy: `{ groupId: UUID; permissions: GroupPermissionsDTO }`.

### QuickTaskForm (React)
- Opis: Szybki formularz utworzenia zadania (tytuł obowiązkowy, opcjonalnie termin i powiązanie z aktywnością). Widoczny tylko dla ról uprawnionych do tworzenia zadań (np. `admin`).
- Główne elementy: `<form>` z polami: `title` (text), `due_date` (date), `activity_id` (select/typed input), przycisk `Utwórz`.
- Interakcje: `onSubmit` → `POST /api/groups/{group_id}/tasks`.
- Walidacja:
  - `title`: wymagane, min 3 znaki.
  - `due_date`: opcjonalne, format `YYYY-MM-DD`.
  - `activity_id`: opcjonalne, jeśli podane to UUID.
  - Obsługa błędów API (`ApiError`).
- Typy: `GroupTaskCreateCommand`, `GroupTaskDTO`, lokalny `QuickTaskFormState`.
- Propsy: `{ groupId: UUID; canCreate: boolean; onCreated?: (task: GroupTaskDTO) => void }`.

### RecentActivityFeed (React, real‑time)
- Opis: Lista „ostatnia aktywność” z danymi początkowymi z SSR i aktualizacjami w czasie rzeczywistym (Supabase Realtime). Pozwala szybko zobaczyć nowe aktywności, zmiany zadań, oceny AI.
- Główne elementy: lista pozycji z ikoną, tytułem/opisem, znacznikiem czasu, użytkownikiem.
- Interakcje: przewijanie, linki do szczegółów (opcjonalnie), aktualizacja w czasie rzeczywistym.
- Walidacja:
  - Gdy brak danych: placeholder „Brak aktywności”.
  - Limit elementów w pamięci (np. 50) i stronicowanie/ładowanie więcej (opcjonalne w MVP).
- Typy: `RecentActivityItemVM[]` (VM), wejście z `GroupDashboardDTO['recent_activity']`.
- Propsy: `{ groupId: UUID; initialItems: RecentActivityItemVM[]; onAnyChange?: () => void }`.

## 5. Typy
Wykorzystujemy istniejące DTO z `src/types.ts` i dodajemy lekkie ViewModel‑e do prezentacji.

```ts
// VM dla kafli (pochodne z GroupDashboardDTO)
export interface DashboardTilesVM {
  groupId: UUID;
  totalActivities: number;
  evaluatedActivities: number;
  pctEvaluatedAbove7: number; // 0..100, zaokrąglone do całych
  tasksPending: number;
  tasksDone: number;
  canCreateTasks: boolean;
}

// VM dla pozycji feedu
export type ActivityEventType =
  | 'activity_created'
  | 'activity_updated'
  | 'task_created'
  | 'task_updated'
  | 'task_done'
  | 'ai_evaluated'
  | 'other';

export interface RecentActivityItemVM {
  id: UUID;
  type: ActivityEventType;
  title: string; // zmapowany, np. "Dodano zajęcie …"
  at: TimestampISO;
  userId: UUID;
  icon: string; // nazwa ikony lub emoji, np. '📝'
  href?: string; // opcjonalny link do szczegółów
}

// Stan formularza szybkiego zadania
export interface QuickTaskFormState {
  title: string;
  description: string;
  dueDate?: DateISO;
  activityId?: UUID;
  isSubmitting: boolean;
  error?: string;
}
```

Mapowania:
- `GroupDashboardDTO.pct_evaluated_above_7 (0..1)` → `DashboardTilesVM.pctEvaluatedAbove7 (0..100)`.
- `recent_activity` → `RecentActivityItemVM[]` (zachowanie nieznanych typów jako `other`).

## 6. Zarządzanie stanem
- SSR: `dashboardData`, `permissions`, opcjonalnie `group.status` (dla bannera) ładowane w `dashboard.astro`.
- Client (React):
  - `RecentActivityFeed`: lokalny stan listy, kolejka przychodzących eventów, limit elementów, `isRealtimeConnected`.
  - `QuickTaskForm`: `QuickTaskFormState` z kontrolą pól i `isSubmitting`.
- Hooki niestandardowe:
  - `useDashboardRealtime(groupId, onInvalidate: () => void)` – subskrybuje kanały Supabase na tabelach: `activities`, `group_tasks`, `ai_evaluations`; na zdarzenia `INSERT/UPDATE` wywołuje `onInvalidate` (debounce) do refetchu metryk (i/lub aktualizacji feedu).
  - `useFetch<T>(url)` (opcjonalnie) – prosty fetcher z anulowaniem.

## 7. Integracja API
- SSR (Astro):
  - `GET /api/groups/{group_id}/dashboard` → `ApiSingle<GroupDashboardDTO>`.
  - `GET /api/groups/{group_id}/permissions` → `ApiSingle<GroupPermissionsDTO>`.
  - (opcjonalnie) `GET /api/groups/{group_id}` → `ApiSingle<GroupDTO>` dla `status`.
- Client:
  - Szybkie zadanie: `POST /api/groups/{group_id}/tasks` z `GroupTaskCreateCommand` → `ApiSingle<GroupTaskDTO>`.
  - Odświeżenie metryk po zdarzeniach realtime: `GET /api/groups/{group_id}/dashboard`.
- Obsługa błędów: Spodziewane `ApiError` z `error.code` (np. `UNAUTHORIZED`, `NOT_FOUND`, `FORBIDDEN_ROLE`). SSR powinien zwrócić odpowiednie `Astro.response.status` (403/404) i bezpieczne komunikaty.

## 8. Interakcje użytkownika
- Ogląd kafli: tylko odczyt; wartości aktualizowane automatycznie po odświeżeniu lub zdarzeniach real‑time (refetch w tle).
- Tworzenie zadania: wypełnienie formularza → walidacja → `POST` → reset formularza → komunikat sukcesu → feed/metyki odświeżone.
- Przegląd feedu: nowe wydarzenia pojawiają się bez przeładowania (aria‑live=polite). Kliknięcie pozycji może prowadzić do szczegółów (opcjonalnie).
- Skróty: nawigacja do dedykowanych widoków grupy.

## 9. Warunki i walidacja
- Uprawnienia: wygaszaj/ukrywaj `QuickTaskForm` gdy `permissions.role !== 'admin'` i brak możliwości tworzenia zadań.
- Archiwum: `ArchivedBanner` wyświetlany dla `GroupStatus === 'archived'`; formularze i akcje modyfikujące mogą być zablokowane.
- Walidacja formularza zadania (przed wysłaniem):
  - `title` wymagane (trim, min 3).
  - `due_date` zgodne z `DateISO` (YYYY‑MM‑DD) jeśli podane.
  - `activity_id` jako UUID jeśli podane.
- Dane z API:
  - `pct_evaluated_above_7` clamp(0,1) → prezentacja w %.
  - Brak `recent_activity` → placeholder.

## 10. Obsługa błędów
- SSR:
  - 401/403 → strona z informacją o braku dostępu (zachowanie spójne z middleware).
  - 404 → komunikat „Grupa nie znaleziona”.
  - 5xx → ogólny błąd z możliwością ponowienia.
- Client:
  - `QuickTaskForm`: wyświetlenie błędu walidacji lokalnej; dla `ApiError` pokaż komunikat z `error.message` lub mapowany friendly text.
  - Realtime: toleruj chwilowe rozłączenia; pokaż wskaźnik `isRealtimeConnected` (np. punkt statusu w nagłówku feedu).

## 11. Kroki implementacji
1. Utwórz stronę `src/pages/groups/[group_id]/dashboard.astro` z SSR ładowaniem: dashboard, permissions, (opcjonalnie) group.
2. Zaimplementuj `ArchivedBanner` i warunkowe renderowanie wg `GroupStatus`.
3. Zaimplementuj `GroupDashboardTiles` i mapper `GroupDashboardDTO → DashboardTilesVM` (formatowanie % i clamp).
4. Zaimplementuj `DashboardShortcuts` (linki), uwzględnij role w widoczności akcji.
5. Zaimplementuj `QuickTaskForm` (React): UI, walidacja, `POST /tasks`, callback `onCreated`.
6. Zaimplementuj `RecentActivityFeed` (React): lista, placeholder, `aria-live`, wpięcie hooka realtime.
7. Dodaj `useDashboardRealtime` (Supabase) – subskrypcje na `activities`, `group_tasks`, `ai_evaluations`; na zdarzenia odśwież metryki i dopisz pozycję do feedu.
8. Styluj widok (Tailwind): grid kafli, odstępy, warianty dla małych ekranów, kontrast A11y.
9. Obsłuż stany ładowania: skeleton dla kafli (SSR fallback) i shimmer dla feedu (Client) do czasu inicjalizacji.
10. Testy manualne: 
    - 403/404, grupa z `archived`, brak aktywności, aktualizacje realtime, tworzenie zadania.
11. Hardening: debounce refetch, ograniczenie rozmiaru feedu, zabezpieczenia na nieznane typy zdarzeń.


