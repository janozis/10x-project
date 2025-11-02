# Plan implementacji widoku Szczegóły zadania

## 1. Przegląd
Widok służy do podglądu i edycji pojedynczego zadania grupy (GroupTask). Umożliwia przegląd podstawowych informacji (tytuł, opis, termin, status), powiązanie z aktywnością oraz wykonanie akcji edycyjnych (PATCH) i usunięcia (DELETE) zgodnie z uprawnieniami użytkownika w grupie. Wczytanie danych zadania odbywa się przez REST API `GET /api/tasks/{task_id}`. Edycja jest ograniczona do ról `admin` i `editor` – pozostali użytkownicy mają tryb tylko do odczytu.

Widok respektuje: dostępność (etykiety, focus, komunikaty `aria-live`), walidację (zod), bezpieczeństwo (sprawdzenie uprawnień przed edycją), oraz konwencje UI (Shadcn/ui, Tailwind 4).

## 2. Routing widoku
- Ścieżka: `/tasks/{task_id}`
- Plik strony: `src/pages/tasks/[task_id].astro`
- SSR: `export const prerender = false`
- Render: strona Astro osadza komponent React z `client:load` (interaktywna edycja po stronie klienta).

## 3. Struktura komponentów
```
TaskPage (Astro) [src/pages/tasks/[task_id].astro]
  └─ TaskDetailsView (React) [src/components/tasks/TaskDetailsView.tsx]
      ├─ TaskHeader [src/components/tasks/TaskHeader.tsx]
      │   └─ StatusBadge
      ├─ TaskForm [src/components/tasks/TaskForm.tsx]
      │   ├─ TitleField (input)
      │   ├─ DescriptionField (textarea)
      │   ├─ DueDateField (input type="date")
      │   ├─ StatusSelect (native select / shadcn select)
      │   ├─ ActivityLinkField (readonly + link)
      │   └─ FormActions (Save / Delete / Cancel)
      ├─ TaskMeta [src/components/tasks/TaskMeta.tsx]
      └─ InlineError / SuccessNotice
```

## 4. Szczegóły komponentów
### TaskPage (Astro)
- Opis: Strona routowana, pobiera `task_id` z parametrów, renderuje `TaskDetailsView` z `client:load`.
- Główne elementy: `Layout.astro`, wrapper `<main>`, komponent React z propem `taskId`.
- Interakcje: brak (delegowane do React).
- Walidacja: wstępna sanitacja `task_id` (opcjonalnie) – zasadnicza walidacja po stronie API.
- Typy: `{ taskId: string }` (prop do React).
- Propsy: `{ taskId: string }` przekazane do `TaskDetailsView`.

### TaskDetailsView (React)
- Opis: Kontener logiki i stanu. Odpowiada za: pobranie szczegółów zadania, pobranie uprawnień grupowych po poznaniu `group_id`, kontrolę trybu read-only vs edycja, obsługę zapisu i usunięcia.
- Główne elementy: `TaskHeader`, `TaskForm`, `TaskMeta`, baner błędu/sukcesu.
- Obsługiwane interakcje:
  - Inicjalizacja: `GET /api/tasks/{task_id}` -> po sukcesie `GET /api/groups/{group_id}/permissions`.
  - Klik „Zapisz” -> `PATCH /api/tasks/{task_id}`.
  - Klik „Usuń” -> `DELETE /api/tasks/{task_id}` (z potwierdzeniem).
  - Zmiana statusu -> aktualizacja wartości w formularzu (opcjonalnie zapis po przycisku „Zapisz”).
- Walidacja: kontrola formularza via zod (import `groupTaskUpdateSchema`), blokada zapisu gdy brak zmian.
- Typy: `TaskViewModel`, `TaskFormValues`, `GroupTaskDTO`, `GroupPermissionsDTO`, `ApiResponse<T>`.
- Propsy: `{ taskId: UUID }`.

### TaskHeader
- Opis: Nagłówek detalu zadania z tytułem i statusową odznaką.
- Główne elementy: `h1`, `StatusBadge` (na bazie `Badge` shadcn), opcjonalny link powrotny.
- Interakcje: brak (prezentacja).
- Walidacja: brak.
- Typy: `{ title: string; status: TaskStatus }`.
- Propsy: `{ title: string; status: TaskStatus }`.

### TaskForm
- Opis: Formularz edycji pól zadania. Sterowany przez `react-hook-form` + `zodResolver(groupTaskUpdateSchema)` do walidacji. Ustawia wartości domyślne na podstawie `GroupTaskDTO`. Wysyła tylko zmienione pola (payload zgodny z `GroupTaskUpdateCommand`).
- Główne elementy: `input[name=title]`, `textarea[name=description]`, `input[type=date][name=due_date]`, `StatusSelect`, prezentacja powiązania z aktywnością (link do `/activities/{activity_id}` jeśli istnieje), sekcja akcji: `Button` Zapisz, Usuń.
- Obsługiwane interakcje:
  - `onSubmit`: konstruuje payload z `dirtyFields`, wywołuje `PATCH` i po sukcesie resetuje `dirty`.
  - `onDelete`: potwierdzenie i `DELETE`, po sukcesie redirect do strony grupy lub dashboardu.
  - Zmiana pól: walidacja w locie, `isValid`, blokada przycisku „Zapisz” gdy brak zmian lub błędy.
- Walidacja (szczegółowa, zgodna z API):
  - `title`: min 1, max 200 (wymagane gdy edytowane).
  - `description`: min 1, max 4000 (wymagane gdy edytowane).
  - `due_date`: format `YYYY-MM-DD` lub `null`.
  - `status`: jedno z: `pending` | `in_progress` | `done` | `canceled`.
  - `activity_id`: UUID (lub `null`) – tylko prezentacja/zmiana poza zakresem MVP.
  - Co najmniej jedno pole w payload (API: „At least one field required”).
- Typy: `TaskFormValues` (lokalne), używa `GroupTaskUpdateCommand` do payloadu.
- Propsy: `{ task: GroupTaskDTO; canEdit: boolean; onSubmit(values), onDelete() }`.

### StatusSelect
- Theming: Tailwind + shadcn; w MVP dopuszczalny `native <select>` stylowany.
- Źródło wartości: `GROUP_TASK_STATUS_ENUM` z `src/lib/validation/groupTask`.
- Interakcje: `onChange` ustawia nowy status w formularzu.
- Walidacja: ograniczenie do wartości z enumeracji.
- Typy: `{ value: TaskStatus; onChange: (v: TaskStatus) => void; disabled?: boolean }`.
- Propsy: `{ value, onChange, disabled? }`.

### TaskMeta
- Opis: Prezentuje metadane: `created_at`, `updated_at`, `group_id` (z linkiem do `/groups/{group_id}`), `activity_id` (link do `/activities/{activity_id}` jeśli istnieje).
- Interakcje: kliknięcia linków.
- Walidacja: brak.
- Typy: `{ createdAt: string; updatedAt: string; groupId: UUID; activityId?: UUID | null }`.
- Propsy: `{ createdAt, updatedAt, groupId, activityId }`.

### InlineError / SuccessNotice
- Opis: Pasek komunikatu o błędzie/sukcesie dla akcji formularza, `role="alert"` / `aria-live="polite"`.
- Interakcje: brak.
- Walidacja: brak.
- Typy: `{ message?: string }`.
- Propsy: `{ message?: string }`.

## 5. Typy
- Reużywane z `src/types.ts`:
  - `GroupTaskDTO`: `{ id, group_id, activity_id, title, description, due_date, status, created_at, updated_at }`.
  - `GroupTaskUpdateCommand`: częściowy `{ title?, description?, due_date?, status?, activity_id? }`.
  - `TaskStatus`: `"pending" | "in_progress" | "done" | "canceled"` (alias `TaskStatus`).
  - `GroupPermissionsDTO`: `{ group_id, role, can_edit_all, can_edit_assigned_only }`.
  - `ApiResponse<T>` i `ApiError`.

- Nowe (lokalne dla widoku, w module komponentu):
  - `TaskViewModel`:
    - `task: GroupTaskDTO`
    - `canEdit: boolean` (pochodna z `GroupPermissionsDTO.role in {admin, editor}`)
    - `loading: boolean`
    - `error?: string`
  - `TaskFormValues` (spójny z `groupTaskUpdateSchema`/`GroupTaskUpdateCommand`):
    - `title?: string`
    - `description?: string`
    - `due_date?: string | null` (format YYYY-MM-DD)
    - `status?: TaskStatus`
    - `activity_id?: string | null`
  - Wyniki hooków:
    - `TaskFetchResult = { ok: true; data: GroupTaskDTO } | { ok: false; code: ApiErrorCode; message: string }`
    - `TaskMutationResult = { ok: true } | { ok: false; code: ApiErrorCode; message: string }`

## 6. Zarządzanie stanem
- Hooki:
  - `useTaskDetails(taskId: UUID)`:
    - Stan: `loading`, `error`, `task`.
    - Efekt: `fetch('/api/tasks/{task_id}')` na mount i po mutacjach.
  - `useTaskPermissions(groupId?: UUID)`:
    - Po otrzymaniu `groupId` z `task`, pobiera `GET /api/groups/{group_id}/permissions`.
    - Zwraca `role`, `canEdit` (role ∈ {admin, editor}).
  - `useUpdateTask(taskId: UUID)`:
    - Metoda `update(payload: GroupTaskUpdateCommand)` -> `PATCH`.
  - `useDeleteTask(taskId: UUID)`:
    - Metoda `remove()` -> `DELETE`.
- Formularz: `react-hook-form` + `zodResolver(groupTaskUpdateSchema)`; użycie `dirtyFields` do wysłania tylko zmienionych pól.
- Blokady: przycisk „Zapisz” disabled, gdy `!isValid || !isDirty || loading` lub `!canEdit`.

## 7. Integracja API
- `GET /api/tasks/{task_id}` -> `ApiResponse<GroupTaskDTO>`
  - Wejście: param `task_id` (UUID).
  - Wyjście 200: `{ data: GroupTaskDTO }`
  - Błędy: `TASK_NOT_FOUND` (404), `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `INTERNAL_ERROR` (500).

- `PATCH /api/tasks/{task_id}` -> `ApiResponse<GroupTaskDTO>`
  - Wejście: `GroupTaskUpdateCommand` (co najmniej jedno pole). Walidacja: jak w `groupTaskUpdateSchema`.
  - Uprawnienia: wymaga roli `admin` lub `editor`.
  - Wyjście 200: `{ data: GroupTaskDTO }` (zaktualizowany rekord).

- `DELETE /api/tasks/{task_id}` -> `ApiResponse<{ id: UUID }>`
  - Uprawnienia: wymaga roli `admin` lub `editor`.
  - Wyjście 200: `{ data: { id } }`.

- `GET /api/groups/{group_id}/permissions` -> `ApiResponse<GroupPermissionsDTO>`
  - Używane do wyliczenia `canEdit`.

## 8. Interakcje użytkownika
- Wejście na stronę `/tasks/{task_id}`:
  - Pokaż loader -> `GET task` -> po sukcesie renderuj formularz; równolegle pobierz `permissions`.
  - Gdy `!canEdit`, formularz w trybie read-only (disabled inputs, ukryty „Zapisz”, „Usuń”).
- Edycja pól: walidacja w locie, znacznik zmian (`dirty`).
- Klik „Zapisz”: wyślij tylko zmienione pola; sukces -> komunikat i odśwież `task`.
- Zmiana statusu: aktualizacja w formularzu; zapis po „Zapisz”.
- Klik „Usuń”: potwierdzenie; sukces -> redirect (np. `/groups/{group_id}` lub `/groups`).
- Błędy: komunikat inline `role="alert"` i focus na ogłoszenie.

## 9. Warunki i walidacja
- Klient (spójnie z API):
  - `title`: min 1, max 200 gdy obecne w payloadzie.
  - `description`: min 1, max 4000 gdy obecne.
  - `due_date`: `YYYY-MM-DD` lub `null`.
  - `status`: dozwolone wartości z `GROUP_TASK_STATUS_ENUM`.
  - `activity_id`: UUID lub `null` (bez weryfikacji przynależności do grupy po stronie klienta).
  - Payload musi mieć ≥1 pole.
- Uprawnienia: `canEdit = role ∈ {admin, editor}`; w przeciwnym razie read-only.

## 10. Obsługa błędów
- 400 `VALIDATION_ERROR`: pokaż błędy per pole (mapowanie z Zod/serwera) + ogólny komunikat.
- 401 `UNAUTHORIZED`: komunikat i link/logowanie.
- 403 `FORBIDDEN_ROLE`: komunikat o braku uprawnień, tryb read-only.
- 404 `TASK_NOT_FOUND`: stan „Nie znaleziono zadania” i link powrotny.
- 500 `INTERNAL_ERROR` / sieć: komunikat „Spróbuj ponownie”, możliwość retry.
- Logika focus: po błędzie focus na `role="alert"` (a11y).

## 11. Kroki implementacji
1. Utwórz stronę `src/pages/tasks/[task_id].astro` z `prerender = false`, import `Layout` i osadzenie `TaskDetailsView` (`client:load`), przekazując `taskId` z `Astro.params.task_id`.
2. Dodaj katalog `src/components/tasks/` i komponenty: `TaskDetailsView.tsx`, `TaskForm.tsx`, `TaskHeader.tsx`, `TaskMeta.tsx`, `StatusSelect.tsx`.
3. W `TaskDetailsView` zaimplementuj hooki: `useTaskDetails`, `useTaskPermissions`, `useUpdateTask`, `useDeleteTask` (lokalnie lub w `src/lib/hooks/tasks/`), wykonujące wywołania `fetch` do API.
4. W `TaskForm` użyj `react-hook-form` + `zodResolver(groupTaskUpdateSchema)`. Zainicjalizuj `defaultValues` z `GroupTaskDTO`. Zbuduj payload na podstawie `dirtyFields` (tylko zmienione pola).
5. Zaimplementuj walidację pól (zod), stany `loading`, `success`, `error`. Zadbaj o `aria-live` i focus po błędzie/sukcesie.
6. Zaimplementuj `StatusSelect` na bazie `GROUP_TASK_STATUS_ENUM`. W MVP może to być `native <select>` stylowany Tailwind + shadcn `Button` dla akcji.
7. Obsłuż `DELETE` z potwierdzeniem (MVP: `window.confirm`). Po sukcesie przekieruj na `/groups/{group_id}` lub `/groups`.
8. Dodaj `TaskMeta` z datami i linkami do grupy/aktywności.
9. Testy ręczne: przypadki 200/400/401/403/404/500; walidacja daty; brak zmian (przycisk „Zapisz” disabled); tryb read-only.
10. Stylowanie spójne z Tailwind 4 i shadcn/ui (`Button`, `Card`, `Badge`).


