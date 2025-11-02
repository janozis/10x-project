# Plan implementacji widoku Lista zadań

## 1. Przegląd
Widok listy zadań służy do planowania i śledzenia pracy w ramach konkretnej grupy HAL. Użytkownik widzi zadania zgrupowane po statusie, może szybko zmieniać status (np. przenosząc kartę lub używając akcji kontekstowych), przypisywać zadania do aktywności, filtrować po statusie i aktywności, tworzyć nowe zadania, wykonywać akcje zbiorcze (tylko desktop), a także obserwować zmiany w czasie rzeczywistym.

## 2. Routing widoku
- Ścieżka: `/groups/[group_id]/tasks`
- Plik strony: `src/pages/groups/[group_id]/tasks.astro`
- Widok osadzony jako wyspa React: komponent `TasksBoard` (React) montowany przez Astro.

## 3. Struktura komponentów
```
TasksPage (Astro) [/groups/[group_id]/tasks]
└─ TasksBoard (React)
   ├─ FiltersBar
   │  ├─ StatusFilter (segment/combobox)
   │  └─ ActivityFilter (combobox)
   ├─ ColumnsWrapper (responsywny grid z poziomym przewijaniem na mobile)
   │  ├─ TaskColumn status="pending"
   │  │  ├─ ColumnHeader (licznik, akcje)
   │  │  ├─ QuickAdd (tytuł + opis + data, opcjonalny kontekst aktywności)
   │  │  └─ TaskItem[]
   │  ├─ TaskColumn status="in_progress"
   │  │  ├─ ColumnHeader
   │  │  └─ TaskItem[]
   │  ├─ TaskColumn status="done"
   │  │  ├─ ColumnHeader
   │  │  └─ TaskItem[]
   │  └─ TaskColumn status="canceled"
   │     ├─ ColumnHeader
   │     └─ TaskItem[]
   ├─ BulkActionsBar (tylko ≥lg, widoczny gdy jest zaznaczenie)
   └─ ConfirmDialog / Toasts
```

## 4. Szczegóły komponentów

### TasksBoard
- Opis: Główny kontener logiki widoku. Odpowiada za pobieranie danych, grupowanie po statusie, subskrypcję real-time, akcje CRUD, obsługę paginacji i zaznaczeń do akcji zbiorczych.
- Główne elementy: `FiltersBar`, `ColumnsWrapper` (4 kolumny), `BulkActionsBar`, `ConfirmDialog`/toasty.
- Obsługiwane interakcje:
  - Zmiana filtrów (status, aktywność).
  - Tworzenie zadania (QuickAdd).
  - Aktualizacja pola (status, tytuł, opis, data, przypisana aktywność).
  - Usuwanie zadania (z potwierdzeniem).
  - Zaznaczanie wielu zadań (desktop) i akcje zbiorcze.
  - „Załaduj więcej” (paginacja kursorem).
- Walidacja (lustrzana do API):
  - title: min 1, max 200; description: min 1, max 4000.
  - due_date: `YYYY-MM-DD` lub null.
  - activity_id: UUID (opcjonalny) i należy do tej samej grupy.
  - status: `pending | in_progress | done | canceled`.
- Typy: korzysta z `GroupTaskDTO`, `GroupTaskCreateCommand`, `GroupTaskUpdateCommand` oraz własnych VM (sekcja 5).
- Propsy (interfejs):
  - `groupId: UUID`
  - `defaultActivityId?: UUID` (np. z query string jeśli przechodzimy z widoku aktywności)

### FiltersBar
- Opis: Pasek filtrów widoku listy zadań. Umożliwia zawężanie wyników po statusie i aktywności.
- Główne elementy: `Select`/`Combobox` (Shadcn/ui) dla statusu i aktywności; licznik wyników; reset filtrów.
- Interakcje: `onStatusChange(status?)`, `onActivityChange(activityId?)`, `onReset()`.
- Walidacja: dozwolone statusy; `activityId` musi istnieć na liście aktywności grupy.
- Typy: `TaskFiltersVM` (sekcja 5).
- Propsy:
  - `filters: TaskFiltersVM`
  - `activities: { id: UUID; title: string }[]`
  - `onChange: (patch: Partial<TaskFiltersVM>) => void`

### TaskColumn
- Opis: Kolumna zadań dla konkretnego statusu. Renderuje nagłówek, opcjonalny `QuickAdd` (w „pending”) i listę `TaskItem`.
- Główne elementy: nagłówek z licznikiem, kontener listy, opcjonalny `QuickAdd`.
- Interakcje: obsługa przeciągania (opcjonalnie), `onDropToThis(status)` → zmiana statusu elementu.
- Walidacja: zmiana statusu do innego niż bieżący.
- Typy: `TaskColumnVM`, `TaskVM`.
- Propsy:
  - `status: TaskStatus`
  - `tasks: TaskVM[]`
  - `onUpdateTask: (id: UUID, patch: TaskUpdatePatch) => Promise<void>`
  - `onCreateQuick?: (input: QuickAddInput) => Promise<void>`

### TaskItem
- Opis: Pojedyncza karta zadania. Pokazuje tytuł, status, opcjonalnie przypisaną aktywność (badge) i termin. Ma menu akcji (zmiana statusu, przypisanie aktywności, edycja, usuń) i checkbox do zaznaczeń (desktop).
- Główne elementy: tytuł, podtytuł/opis skrócony, badge aktywności, badge statusu, due date pill, menu kontekstowe, checkbox (≥lg).
- Interakcje: `onToggleSelect`, `onQuickStatus`, `onAssignActivity`, `onEditInline` (tytuł/opis), `onDeleteConfirm`.
- Walidacja: tytuł/Opis zgodnie ze schematem; due_date format; status dopuszczalny.
- Typy: `TaskVM`, `TaskUpdatePatch`.
- Propsy:
  - `task: TaskVM`
  - `canEdit: boolean`
  - `onUpdate: (id: UUID, patch: TaskUpdatePatch) => Promise<void>`
  - `onDelete: (id: UUID) => Promise<void>`
  - `onSelectChange?: (id: UUID, selected: boolean) => void`

### QuickAdd
- The goal: szybkie dodanie zadania w kolumnie „pending” (z uwzględnieniem wymagań walidacji API).
- Główne elementy: `Input` (tytuł), `Textarea` (opis), `DatePicker` (due_date, opcjonalny), `ActivitySelect` (opcjonalny), `Button` „Dodaj”.
- Interakcje: `onSubmit(input)`, `onCancel`.
- Walidacja: jak w `groupTaskCreateSchema` (tytuł i opis są wymagane!).
- Typy: `QuickAddInput`.
- Propsy:
  - `defaultActivityId?: UUID`
  - `onCreate: (input: QuickAddInput) => Promise<void>`

### BulkActionsBar (desktop ≥lg)
- Opis: Pasek akcji zbiorczych wyświetlany u dołu/na górze widoku, gdy istnieje zaznaczenie.
- Główne elementy: przyciski „Oznacz jako Done”, „W toku”, „Oczekujące”, „Usuń wybrane”, licznik zaznaczeń.
- Interakcje: `onBulkStatus(targetStatus)`, `onBulkDeleteConfirm`.
- Walidacja: puste zaznaczenie – akcje nieaktywne; zmiana statusu tylko gdy różny.
- Typy: `BulkSelectionState`.
- Propsy:
  - `selectedIds: UUID[]`
  - `onBulkStatus: (status: TaskStatus) => Promise<void>`
  - `onBulkDelete: () => Promise<void>`

## 5. Typy
- Wykorzystanie istniejących (z `src/types.ts`):
  - `TaskStatus = "pending" | "in_progress" | "done" | "canceled"`
  - `GroupTaskDTO` (pola: `id, group_id, activity_id, title, description, due_date, status, created_at, updated_at`)
  - `GroupTaskCreateCommand` (`title, description, due_date?, activity_id?`)
  - `GroupTaskUpdateCommand` (dowolna kombinacja: `title?, description?, due_date?, status?, activity_id?`)

- Nowe typy ViewModel (frontend):
  - `TaskVM` – DTO rozszerzony o pochodne i uprawnienia:
    - `id: UUID`
    - `title: string`
    - `description: string`
    - `status: TaskStatus`
    - `activityId?: UUID | null`
    - `dueDate?: DateISO | null`
    - `createdAt: TimestampISO`
    - `updatedAt: TimestampISO`
    - Pochodne: `isOverdue: boolean`, `daysLeft?: number`, `statusLabel: string`, `activityTitle?: string`, `canEdit: boolean`
  - `TaskColumnVM`:
    - `status: TaskStatus`
    - `tasks: TaskVM[]`
  - `TaskFiltersVM`:
    - `status?: TaskStatus`
    - `activityId?: UUID`
  - `TaskUpdatePatch` – bezpieczny patch na froncie:
    - Podzbiór pól z `GroupTaskUpdateCommand`
  - `QuickAddInput` – dane formularza tworzenia:
    - `title: string`, `description: string`, `dueDate?: DateISO | null`, `activityId?: UUID | null`
  - `BulkSelectionState`:
    - `selectedIds: Set<UUID>`

## 6. Zarządzanie stanem
- Lokalny stan w `TasksBoard` + dedykowane hooki:
  - `useGroupTasks(groupId: UUID, initialFilters?: TaskFiltersVM)` – pobieranie listy, grupowanie do kolumn, paginacja kursorem, akcje CRUD, synchronizacja z real-time, uprawnienia.
  - `useRealtimeTasks(groupId: UUID, onEvent: (evt) => void)` – subskrypcja Insert/Update/Delete dla tabeli `group_tasks` filtrowana po `group_id`.
  - `useBulkSelection()` – zaznaczanie i operacje zbiorcze (desktop).
- Dane wtórne: mapowanie `GroupTaskDTO` → `TaskVM` (wyliczanie `isOverdue`, `daysLeft`, `statusLabel`, `activityTitle` po lookupie z listy aktywności).
- Uprawnienia: jednorazowe pobranie `GET /api/groups/{group_id}/permissions` i osadzenie `canEdit` (admin/editor mogą tworzyć/edytować/usuwać; member – tylko odczyt).

## 7. Integracja API
- Endpoints:
  - `GET /api/groups/{group_id}/tasks?status=&activity_id=&limit=&cursor=` → `ApiList<GroupTaskDTO>` (+ `nextCursor`)
  - `POST /api/groups/{group_id}/tasks` body: `GroupTaskCreateCommand` → `ApiSingle<GroupTaskDTO>` (201)
  - `GET /api/tasks/{task_id}` → `ApiSingle<GroupTaskDTO>`
  - `PATCH /api/tasks/{task_id}` body: `GroupTaskUpdateCommand` → `ApiSingle<GroupTaskDTO>`
  - `DELETE /api/tasks/{task_id}` → `{ data: { id } }`
- Walidacja po stronie serwera (na podstawie `groupTask.ts`):
  - `title` i `description` – wymagane przy tworzeniu; przy aktualizacji opcjonalne z limitem długości.
  - `due_date` – `YYYY-MM-DD` lub `null`.
  - `activity_id` – UUID należący do tej samej grupy.
- Paginacja: kursorem (`nextCursor`) z możliwością „Załaduj więcej”.
- Real-time: kanał Supabase na `group_tasks` filtrowany po `group_id` (Insert/Update/Delete) aktualizuje lokalny store.

Przykładowe kształty żądań (TypeScript – frontend):
```ts
// Tworzenie
const bodyCreate: GroupTaskCreateCommand = {
  title: "Zakupy materiałów",
  description: "Lista: sznurek, plandeka, farby",
  due_date: "2025-07-01",
  activity_id: undefined,
};

// Aktualizacja statusu
const bodyUpdate: GroupTaskUpdateCommand = { status: "done" };
```

## 8. Interakcje użytkownika
- Zmiana filtrów: natychmiastowe odświeżenie listy (reset kursora), zachowanie w URL jako query (`?status=&activity_id=`).
- QuickAdd: walidacja pól; po sukcesie reset formularza i focus na tytuł; element trafia do kolumny `pending` (domyślnie).
- Edycja inline: tytuł/termin/aktywność; zapisywanie `PATCH` po blur/Enter z optymistyczną aktualizacją i rollbackiem przy błędzie.
- Zmiana statusu: menu szybkiej zmiany lub przeciągnięcie (opcjonalnie). Optymistycznie zmieniamy kolumnę; w tle `PATCH`.
- Usuwanie: potwierdzenie w `AlertDialog`; optymistyczne usunięcie + rollback w razie błędu.
- Akcje zbiorcze (desktop): zmiana statusu dla wielu, usuwanie wielu – z potwierdzeniem.
- Paginacja: przycisk „Załaduj więcej” u dołu siatki.

## 9. Warunki i walidacja
- Formularze tworzenia/edycji:
  - title: [1..200], required; description: [1..4000], required; due_date: `YYYY-MM-DD` lub puste; activity_id: zgodne z listą aktywności.
- Status: dowolna zmiana do innego statusu (UI blokuje wybór bieżącego).
- Uprawnienia: gdy `member`, ukrywamy `QuickAdd`, menu edycji i checkboxy; interakcje „read-only”.
- API błędy walidacji: prezentowane per pole przy tworzeniu/edycji; fallback jako toast.

## 10. Obsługa błędów
- 400 VALIDATION_ERROR: wyświetlenie błędów pól w formularzach; dla PATCH – komunikat inline nad elementem, z opcją cofnięcia.
- 401/403 (UNAUTHORIZED/FORBIDDEN): chowanie akcji/maskowanie UI; toast informacyjny.
- 404 TASK_NOT_FOUND: jeśli zdarzy się podczas real-time/odświeżania – usunięcie elementu z listy i toast.
- 409/429 (CONFLICT/RATE_LIMIT_EXCEEDED – jeśli pojawią się w przyszłości): komunikat i ponów po krótkim czasie.
- 5xx: toast z sugestią ponowienia; automatyczny rollback optymistycznych zmian.

## 11. Kroki implementacji
1) Routing strony
   - Utwórz `src/pages/groups/[group_id]/tasks.astro` i zamontuj `TasksBoard` z przekazaniem `groupId` (z params) i `defaultActivityId` (z query).

2) Warstwa usług i typy pomocnicze (frontend)
   - Reużyj istniejących endpointów i typów: `GroupTaskDTO`, `GroupTaskCreateCommand`, `GroupTaskUpdateCommand`.
   - Dodaj funkcje fetch w utilu/hooku: `list`, `create`, `update`, `remove` (+ obsługa `nextCursor`).

3) Hook `useGroupTasks`
   - Stan: `filters`, `columns`, `loading`, `error`, `selectedIds`, `nextCursor`.
   - Akcje: `setFilters`, `createTask`, `updateTask`, `deleteTask`, `bulkUpdateStatus`, `bulkDelete`, `loadMore`.
   - Mapowanie DTO→VM i grupowanie po statusie.

4) Hook `useRealtimeTasks`
   - Subskrypcja Supabase na `group_tasks` z filtrem `group_id` (Insert/Update/Delete) i inkrementalna aktualizacja store.
   - Fallback: po nieudanej subskrypcji – okresowa rewalidacja (np. po akcjach użytkownika).

5) Pobranie uprawnień
   - `GET /api/groups/{group_id}/permissions`; ustaw `canEdit` (admin/editor) i warunkowo renderuj akcje edycji.

6) UI komponenty
   - `FiltersBar`: status combobox (wszystkie/konkretne), activity combobox (z listy aktywności), reset.
   - `TaskColumn`: nagłówek z licznikiem; w „pending” wstaw `QuickAdd`.
   - `TaskItem`: layout karty z menu; checkbox tylko na desktop.
   - `BulkActionsBar`: przyciski statusów i usuń; responsywność – ukryty < lg.
   - Użyj istniejących komponentów Shadcn/ui: `button`, `card`, `badge` (w `src/components/ui`).

7) Walidacja na froncie
   - Odzwierciedl reguły Zod (prosty validator w hooku/formie) i mapuj błędy z API do pól.

8) Interakcje i UX
   - Optymistyczne aktualizacje zadań przy PATCH/DELETE; rollback przy błędzie.
   - Paginacja przyciskiem „Załaduj więcej”; blokada przy braku `nextCursor`.
   - Zapamiętaj filtry w URL (synch. z `useSearchParams`).

9) Testy ręczne / sanity checks
   - Tworzenie zadania z minimalnym zestawem pól (tytuł+opis) i opcjonalnym `due_date`/`activity_id`.
   - Zmiany statusów w każdą stronę, przypisanie/odpięcie aktywności, usuwanie.
   - Filtry status/aktywność, paginacja, akcje zbiorcze (desktop), read-only dla roli `member`.
   - Real-time: w drugim oknie dodać/zmienić/usunąć zadanie i potwierdzić aktualizacje.

10) (Opcjonalnie) Drag&Drop
   - Jeśli wymagane, dodaj `@dnd-kit/core` i obsłuż `onDragEnd` → `updateTask(id, { status: target })`.

11) Performance
   - Memoizacja list/kolumn, wirtualizacja przy bardzo długich listach (MVP+ jeśli potrzebne).


