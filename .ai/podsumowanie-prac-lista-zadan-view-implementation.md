# Podsumowanie prac – widok „Lista zadań”

## 1) Zakres i efekt
- Zaimplementowano widok listy zadań w układzie kolumn (statusy: pending, in_progress, done, canceled) z filtrowaniem po statusie i aktywności, szybkim dodawaniem zadań, edycją inline oraz akcjami zbiorczymi (desktop).
- Widok wspiera paginację kursorem (przycisk + auto-doładowanie), realtime (Supabase) oraz kontrolę uprawnień (rola steruje widocznością/aktywnością akcji).
- Filtry są synchronizowane z URL (status, activity_id) – umożliwia to linkowanie stanu.

## 2) Kluczowe pliki i komponenty
- Strona: `src/pages/groups/[group_id]/tasks.astro`
  - Montuje wyspę React `TasksBoard` i przekazuje `groupId` oraz `defaultActivityId` z query.
- Warstwa UI (React):
  - `src/components/groups/tasks/TasksBoard.tsx` – kontener logiki: filtry, siatka 4 kolumn, paginacja, zaznaczenia, potwierdzenia.
  - `src/components/groups/tasks/FiltersBar.tsx` – pasek filtrów (status, aktywność) + reset.
  - `src/components/groups/tasks/TaskColumn.tsx` – nagłówek kolumny, opcjonalny `QuickAdd` w „pending”, lista `TaskItem`.
  - `src/components/groups/tasks/TaskItem.tsx` – karta zadania: tytuł (edit inline), status, aktywność, termin, delete z potwierdzeniem; checkbox (≥lg); wyróżnienie zaległych terminów.
  - `src/components/groups/tasks/QuickAdd.tsx` – szybkie dodawanie z walidacją pól i mapowaniem błędów z API do hintów.
  - `src/components/groups/tasks/BulkActionsBar.tsx` – akcje zbiorcze (statusy, usuń) widoczne tylko dla ról edycyjnych.
  - `src/components/groups/ConfirmDialog.tsx` – dialog potwierdzeń (reuse).
- Hooki i klient API:
  - `src/lib/groups/tasks/api.client.ts` – list/create/patch/delete dla zadań; obsługa kursora.
  - `src/lib/groups/tasks/useGroupTasks.ts` – stan, filtry, grupowanie do kolumn, CRUD, paginacja, permissions, URL-sync.
  - `src/lib/groups/tasks/useRealtimeTasks.ts` – subskrypcja Insert/Update/Delete na `group_tasks` filtrowana po `group_id`.

## 3) Integracja API
- `GET /api/groups/{group_id}/tasks?status=&activity_id=&limit=&cursor=` – lista (z nextCursor).
- `POST /api/groups/{group_id}/tasks` – tworzenie zadania.
- `GET /api/tasks/{task_id}` – szczegóły.
- `PATCH /api/tasks/{task_id}` – aktualizacja dowolnego pola (status, tytuł, opis, due_date, activity_id).
- `DELETE /api/tasks/{task_id}` – usunięcie.
- `GET /api/groups/{group_id}/permissions` – rola i flagi uprawnień (sterują UI).
- Dodatkowo: `listActivities(groupId)` dla etykiet aktywności w filtrach i kartach.

## 4) Zarządzanie stanem i realtime
- `useGroupTasks` przechowuje: filters, columns, loading, error, nextCursor, canEdit; metody: create/update/delete/loadMore/setFilters.
- Grupowanie do kolumn po statusie; VM zawiera pochodne (isOverdue, daysLeft, statusLabel).
- Realtime (useRealtimeTasks) dopina inkrementalne zmiany (INSERT/UPDATE/DELETE) i respektuje aktywne filtry.

## 5) Uprawnienia i UX warunkowy
- `canEdit` ustawiane na podstawie roli (admin/editor -> true; member -> false).
- Ukrywanie/wyłączanie: QuickAdd, checkboxy wyboru, BulkActionsBar, kontrolki edycyjne.

## 6) Interakcje i nawigacja
- Filtry: natychmiastowa rewalidacja listy; stan w URL.
- QuickAdd: walidacja jak w backendzie (1..200, 1..4000, data YYYY-MM-DD, aktywność UUID) + mapowanie błędów z API do pól.
- Edycja inline: tytuł (Enter/blur), opis, termin; wybór statusu i aktywności (selecty) z komunikatami sukces/błąd.
- Usuwanie: pojedyncze (ConfirmDialog) i zbiorcze z potwierdzeniem.
- Paginacja: przycisk „Załaduj więcej” + auto-doładowanie (IntersectionObserver).

## 7) Obsługa błędów i przypadki brzegowe
- Komunikaty walidacji per pole (QuickAdd), toasty na operacjach inline, baner błędu dla błędów krytycznych.
- Puste stany: informacja u góry widoku + „Reset filtrów”.
- Read-only dla roli member – brak akcji edycyjnych.

## 8) Wydajność i rozszerzalność
- Podział na mniejsze komponenty; brak wirtualizacji (do rozważenia przy bardzo długich listach).
- Realtime odfiltrowuje zdarzenia niepasujące do aktywnych filtrów.

## 9) Świadomie odłożone na kolejną fazę
- Drag & Drop między kolumnami (@dnd-kit/core).
- Wirtualizacja listy dla bardzo długich kolumn.

## 10) Sanity test – checklista
- Utwórz zadanie (min. tytuł+opis), z/bez terminu i aktywności.
- Zmień status, przypisz/odepnij aktywność, zaktualizuj opis i termin (walidacja, toasty).
- Filtrowanie po statusie/aktywności, reset filtrów, URL-sync (wejście z parametrami).
- Paginacja: przycisk i auto-doładowanie (przewiń do dołu; sentinel).
- Realtime: w drugim oknie wstaw/aktualizuj/usuń – lista aktualizuje się.
- Uprawnienia: rola member – brak akcji edycyjnych; admin/editor – pełne akcje.

---
Gotowe do przeglądu. W kolejnym etapie proponuję dodać DnD i ewentualną wirtualizację przy większych wolumenach danych.
