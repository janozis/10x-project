# Plan implementacji widoku Edytor aktywności

## 1. Przegląd
Widok służy do edycji pojedynczej aktywności z pełną walidacją, autosave, zarządzaniem edytorami oraz przeglądem historii ocen AI. Zawiera 11 pól formularza (teksty + czas trwania), obsługuje kontrolę współbieżności (409 i diff konfliktu), respektuje uprawnienia (edycja tylko dla admina lub przypisanego edytora) i zapewnia dostępność (nawigacja klawiaturą, czytelne stany błędów).

## 2. Routing widoku
- Ścieżka: `/activities/{activity_id}/edit`
- Plik strony: `src/pages/activities/[activity_id]/edit.astro`
- SSR: render strony Astro + osadzenie aplikacji React jako klient (islands). 

## 3. Struktura komponentów
- `ActivityEditorPage` (Astro strona)
  - `ActivityEditorApp` (React root)
    - `ActivityHeader`
      - tytuł, status, skróty akcji: Zapisz, Poproś o ocenę AI, Cofnij zmiany (z draftu), Odtwórz szkic
    - `ActivityTabs`
      - zakładki: „Formularz”, „Edytorzy”, „Oceny AI”
      - `ActivityForm`
      - `EditorsManager`
      - `AIEvaluationPanel`
    - `AutosaveIndicator`
    - `DirtyPrompt` (blokada wyjścia przy brudnym formularzu)
    - `ConflictDiffModal` (porównanie wersji przy 409)
    - (opcjonalnie) `ReadOnlyOverlay`/`PermissionGuard`

## 4. Szczegóły komponentów
### ActivityEditorApp
- Opis: Kontener logiki widoku. Ładuje aktywność, uprawnienia, inicjalizuje formularz i hooki (autosave, dirty, konflikty), orchestration akcji.
- Główne elementy: wrapper, `ActivityHeader`, `ActivityTabs`, modale.
- Obsługiwane interakcje:
  - inicjalny fetch aktywności i uprawnień
  - zapis zmian (PATCH)
  - obsługa błędów (422/403/404/409)
- Walidacja: oddelegowana do `ActivityForm` (zod + RHF) i walidacji serwera.
- Typy: `ActivityWithEditorsDTO`, `GroupPermissionsDTO`, `ActivityUpdateCommand`, `ActivityEditorViewModel`, `ActivityFormValues`.
- Propsy: none (pobiera `activity_id` z adresu przez `Astro.params` przekazane w props do React).

### ActivityHeader
- Opis: Pasek tytułu/stanu z działaniami globalnymi.
- Elementy: tytuł, `Badge` statusu, przyciski: Zapisz, Poproś o ocenę AI, Cofnij/Odtwórz szkic.
- Interakcje: kliknięcia akcji globalnych, sygnalizacja stanu zapisu/kolejkowania AI.
- Walidacja: przy „Poproś o ocenę AI” wymagany brak brudnych zmian i poprawnie zapisany stan.
- Typy: `AIEvaluationRequestState` (local), `ActivityStatus` (z `types.ts`).
- Propsy: `{ vm: ActivityEditorViewModel, isDirty: boolean, canEdit: boolean, onSave: () => Promise<void>, onRequestAI: () => Promise<void>, autosave: AutosaveControls }`.

### ActivityTabs
- Opis: Nawigacja między sekcjami. React „Tabs” z Shadcn/ui.
- Elementy: TabList, TabTrigger, TabContent.
- Interakcje: zmiana zakładki, focus management.
- Walidacja: brak własnej, delegacja do dzieci.
- Typy: local state string.
- Propsy: `{ children, defaultTab?: 'form'|'editors'|'ai' }`.

### ActivityForm
- Opis: Formularz 11 pól z walidacją i integracją z autosave i zapisem.
- Elementy: `Input`, `Textarea`, `NumberInput` (czas), etykiety, opisy, komunikaty błędów.
- Interakcje: input/blur (autosave), submit, skróty klawiatury (Ctrl/Cmd+S zapis).
- Walidacja (frontend zgodna z API):
  - `title`, `objective`, `tasks`, `location`, `materials`, `responsible`, `knowledge_scope`, `participants`, `flow`, `summary` – wymagane, niepuste stringi
  - `duration_minutes` – liczba całkowita 5..1440
- Typy: `ActivityFormSchema` (zod), `ActivityFormValues` (infer), `ActivityUpdateCommand`.
- Propsy: `{ form: UseFormReturn<ActivityFormValues>, readOnly: boolean }`.

### EditorsManager
- The purpose: Zarządzanie listą edytorów aktywności (GET/POST/DELETE), warunkowane rolą admina.
- Elementy: lista aktualnych edytorów, pole/selektor użytkownika, przyciski „Dodaj”/„Usuń”.
- Interakcje: dodanie edytora (POST), usunięcie (DELETE), odświeżenie listy.
- Walidacja: `user_id` wymagane UUID, obsługa błędów `ALREADY_ASSIGNED`, `USER_NOT_IN_GROUP`.
- Typy: `ActivityEditorDTO`, `UUID`.
- Propsy: `{ activityId: UUID, canManage: boolean }`.

### AIEvaluationPanel
- Opis: Lista ocen (najświeższe pierwsze), wgląd w szczegóły, trigger żądania nowej oceny (POST 202 + polling), wyświetlenie sugestii/punktacji.
- Elementy: tabela/karta ocen, szczegóły (expand/collapse), wskaźnik statusu (queued/processing), przycisk „Poproś o ocenę AI”.
- Interakcje: request nowej oceny, polling co `next_poll_after_sec` (fallback: 5s) do pojawienia się nowej wersji.
- Walidacja: zablokuj request przy brudnym formularzu lub braku uprawnień; egzekwuj cooldown (pokazuj komunikat z 429/AI_EVALUATION_COOLDOWN).
- Typy: `AIEvaluationDTO`, `AIEvaluationRequestState`.
- Propsy: `{ activityId: UUID, canRequest: boolean }`.

### ConflictDiffModal
- Opis: Modal porównujący wartości pól: lokalny formularz vs najnowsza wersja z serwera po 409.
- Elementy: lista pól z diffem (left/right), akcje: „Załaduj wersję z serwera”, „Nadpisz serwer”, „Scal ręcznie i zapisz”.
- Interakcje: wybór strategii rozwiązania konfliktu.
- Walidacja: przy „Nadpisz” wymagane potwierdzenie; przy „Scal” zmiany trafiają do formularza i ponowny zapis.
- Typy: `ConflictInfo`.
- Propsy: `{ open: boolean, conflict: ConflictInfo|null, onResolve: (resolution: ConflictResolution) => void }`.

### DirtyPrompt
- Opis: Ochrona przed utratą zmian (beforeunload + nawigacja wewnętrzna jeśli będzie dodana).
- Elementy: niewidoczny hook.
- Interakcje: blokada wyjścia, potwierdzenie.
- Walidacja: aktywny tylko gdy `isDirty===true`.
- Typy: none (local).
- Propsy: `{ active: boolean }`.

### AutosaveIndicator
- Opis: Status „zapisano szkic / błąd szkicu / przywrócono szkic”, licznik szkiców.
- Elementy: mały badge/toast.
- Interakcje: co kliknięcie można przeglądać szkice i przywrócić.
- Walidacja: limit 20 szkiców/5 MB – informuj i proponuj czyszczenie najstarszych (LRU).
- Typy: `AutosaveDraft`.
- Propsy: `{ lastSavedAt?: Date, draftsCount: number }`.

## 5. Typy
- Z istniejących (`src/types.ts`):
  - `UUID`, `TimestampISO`
  - `ActivityDTO`, `ActivityWithEditorsDTO`, `ActivityEditorDTO`
  - `AIEvaluationDTO`
  - `ActivityUpdateCommand`
  - `GroupPermissionsDTO`, `GroupRole`, `ActivityStatus`
- Nowe (ViewModel):
  - `ActivityFormValues`:
    - `title: string`
    - `objective: string`
    - `tasks: string`
    - `duration_minutes: number`
    - `location: string`
    - `materials: string`
    - `responsible: string`
    - `knowledge_scope: string`
    - `participants: string`
    - `flow: string`
    - `summary: string`
  - `ActivityEditorViewModel`:
    - `id: UUID`
    - `group_id: UUID`
    - `status: ActivityStatus`
    - `updated_at: TimestampISO`
    - `editors: ActivityEditorDTO[]`
    - `last_evaluation_requested_at?: TimestampISO|null`
  - `AutosaveDraft`:
    - `id: string` (np. ISO timestamp lub inkrement)
    - `activityId: UUID`
    - `values: ActivityFormValues`
    - `updatedAt: number` (ms)
    - `etag?: string` (opcjonalnie jeśli backend zwraca)
  - `ConflictInfo`:
    - `server: ActivityFormValues & { updated_at: TimestampISO }`
    - `local: ActivityFormValues`
    - `fieldsInConflict: Array<keyof ActivityFormValues>`
  - `ConflictResolution = 'takeServer' | 'overwriteServer' | 'manualMerge'`
  - `AIEvaluationRequestState`:
    - `queued: boolean`
    - `nextPollAfterSec?: number`
    - `error?: string`
- Schemat walidacji Zod (`ActivityFormSchema`):
```ts
const ActivityFormSchema = z.object({
  title: z.string().min(1),
  objective: z.string().min(1),
  tasks: z.string().min(1),
  duration_minutes: z.number().int().min(5).max(1440),
  location: z.string().min(1),
  materials: z.string().min(1),
  responsible: z.string().min(1),
  knowledge_scope: z.string().min(1),
  participants: z.string().min(1),
  flow: z.string().min(1),
  summary: z.string().min(1),
});
```

## 6. Zarządzanie stanem
- `react-hook-form` + `@hookform/resolvers/zod` dla formularza; źródłem prawdy są wartości RHF.
- `useActivity(activityId)` – ładuje `ActivityWithEditorsDTO`, mapuje do `ActivityFormValues` i `ActivityEditorViewModel`, przechowuje `updated_at`.
- `useAutosaveDrafts(activityId)` – zapisuje do `localStorage` pod kluczem `lp:activity:{id}:drafts` (LRU, max 20 wpisów lub do ~5 MB; przy przekroczeniu usuwa najstarsze). API: `saveDraft(values)`, `listDrafts()`, `restoreDraft(id)`, `clearOld()`.
- `useDirtyPrompt(isDirty)` – rejestruje `beforeunload` i ewentualnie integrację z nawigacją SPA (w przyszłości).
- `useConflictDetection()` – wykrywa 409, pobiera najnowszą wersję z serwera i buduje `ConflictInfo` (porównanie po kluczach), otwiera `ConflictDiffModal`.
- `useAIEvaluations(activityId)` – stan listy ocen, `request()` (POST 202), `poll()` (GET co `nextPollAfterSec`/5s do zmiany `version` lub pojawienia się nowego `id`).
- `useEditors(activityId)` – `list()`, `assign(userId)`, `remove(userId)`.
- `usePermissions(groupId)` – ładuje `GroupPermissionsDTO` i wyprowadza `canEdit`, `canManageEditors`, `canRequestAI` (admin || assigned editor).

## 7. Integracja API
- Pobranie aktywności: `GET /api/activities/{activity_id}`
  - Odp.: `ApiSingle<ActivityWithEditorsDTO>` (lub `ActivityDTO` + oddzielne `GET editors` – wówczas 2 zapytania).
- Zapis aktywności: `PATCH /api/activities/{activity_id}`
  - Body: pełny obiekt pól formularza + `status?`, obowiązkowo `updated_at` do kontroli współbieżności.
  - 204/200 sukces; 409 konflikt; 422 walidacja; 403/404 wg uprawnień/istnienia.
- Edytorzy:
  - `GET /api/activities/{id}/editors` → `ApiList<ActivityEditorDTO>`
  - `POST /api/activities/{id}/editors` body `{ user_id }`
  - `DELETE /api/activities/{id}/editors/{user_id}`
- Oceny AI:
  - `GET /api/activities/{id}/ai-evaluations` → `ApiList<AIEvaluationDTO>` (latest first)
  - `POST /api/activities/{id}/ai-evaluations` → 202 `{ data: { queued: true, next_poll_after_sec: 5 } }`
  - Obsługa 429 `AI_EVALUATION_COOLDOWN`.
- Uprawnienia: `GET /api/groups/{group_id}/permissions` → `GroupPermissionsDTO`.
- Serwisy frontend (`src/lib/services/*.ts`):
  - `activities.service.ts`: `getActivity`, `patchActivity`
  - `activity-editors.service.ts`: `listEditors`, `assignEditor`, `removeEditor`
  - `ai-evaluations.service.ts`: `listEvaluations`, `requestEvaluation`
  - `permissions.service.ts`: `getGroupPermissions`

## 8. Interakcje użytkownika
- Pisanie w polach → walidacja onBlur/onChange; autosave co 2s od ostatniego inputu lub onBlur.
- Klik „Zapisz” lub Ctrl/Cmd+S → walidacja, PATCH, toast sukcesu/błędu, aktualizacja `updated_at`.
- Przejście z brudnym formularzem → `DirtyPrompt` pyta o potwierdzenie.
- „Poproś o ocenę AI” → jeśli brak brudnych zmian i uprawnienia, POST 202, pokazanie stanu „oczekiwanie”, polling do pojawienia się nowej oceny.
- Dodanie/Usunięcie edytora → aktualizacja listy, komunikaty błędów domenowych.
- 409 po zapisie → `ConflictDiffModal`, wybór strategii i ponowny zapis.

## 9. Warunki i walidacja
- Pola formularza: wymagane stringi niepuste; `duration_minutes` w przedziale 5..1440.
- Warunek zapisu: użytkownik ma uprawnienie edycji (admin lub przypisany edytor zgodnie z `GroupPermissionsDTO`).
- Warunek request AI: zapisane zmiany (nie-dirty), posiadane uprawnienia, brak cooldownu (wykrywane z błędu 429 i ewentualnego `Retry-After`/komunikatu).
- Uprawnienia: jeśli `can_edit_assigned_only` i użytkownik nie jest w `editors` → formularz w trybie read-only, `EditorsManager` ukryty, akcje zapisu/AI zablokowane.
- A11y: kolejność TAB, `aria-describedby` dla błędów, rozmiary dotykowe przycisków, skróty klawiatury: zapisz, przełączanie zakładek.

## 10. Obsługa błędów
- 404 `ACTIVITY_NOT_FOUND` → stan pusty „Nie znaleziono aktywności”.
- 403 `FORBIDDEN_ROLE` → komunikat o braku uprawnień + tryb tylko-do-odczytu.
- 422 `VALIDATION_ERROR` → mapowanie błędów pól do RHF (nazwy kluczy = nazwy pól).
- 409 konflikt → `ConflictDiffModal` + ponowny zapis wg wybranej strategii.
- 429 `AI_EVALUATION_COOLDOWN` → komunikat z pozostałym czasem, zablokowanie przycisku do końca cooldownu.
- Sieć/nieznane → toast błędu, opcja retry, zachowanie szkicu lokalnego.

## 11. Kroki implementacji
1. Routing: utwórz `src/pages/activities/[activity_id]/edit.astro` z osadzeniem komponentu `ActivityEditorApp` i layoutem.
2. UI lib: jeśli brak, dodać brakujące komponenty Shadcn/ui (`input`, `textarea`, `tabs`, `badge`, `dialog`, `toast`) w `src/components/ui`.
3. Serwisy: uzupełnij `activities.service.ts`, `activity-editors.service.ts`, `ai-evaluations.service.ts`, `permissions.service.ts` o opisane metody (GET/PATCH/POST/DELETE) i typy z `src/types.ts` + mapery z `src/lib/mappers/activity.mapper.ts`.
4. Hooki: zaimplementuj `useActivity`, `useAutosaveDrafts`, `useDirtyPrompt`, `useConflictDetection`, `useAIEvaluations`, `useEditors`, `usePermissions` w `src/lib`.
5. Formularz: utwórz `ActivityForm` z RHF + zod, powiąż z autosave i skrótami klawiaturowymi; zwróć kontrolki i komunikaty błędów.
6. Nagłówek: dodaj `ActivityHeader` z przyciskami Zapisz/AI i stanami (loading, disabled, cooldown).
7. Zakładki: zbuduj `ActivityTabs` i włącz `EditorsManager` oraz `AIEvaluationPanel`.
8. Konflikty: dodaj `ConflictDiffModal` i integrację w zapisie (wykrywanie 409, pobranie aktualnych danych, diff, ponowny zapis wg decyzji).
9. Uprawnienia: użyj `usePermissions` + lista `editors`, aby wymusić read-only i ukryć akcje.
10. A11y: skonfiguruj focus order, aria-* dla błędów, rolę `dialog` w modalach, operacje klawiaturą.
11. Testy ręczne: ścieżki szczęśliwe (zapis, AI), błędy (422/403/404/409/429), read-only, autosave limit, przywracanie szkicu.
12. Telemetria/toasty: dodaj czytelne komunikaty sukcesu/błędu i wskaźniki stanów.
