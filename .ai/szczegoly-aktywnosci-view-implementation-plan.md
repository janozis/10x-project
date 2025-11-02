## Plan implementacji widoku Szczegóły aktywności

## 1. Przegląd
Widok służy do prezentacji pełnych danych pojedynczej aktywności w trybie tylko do odczytu. Użytkownik widzi 10 pól definicji aktywności, status, listę przypisanych edytorów, skrócony panel ostatnich ocen AI (timeline + ostatnia ocena) oraz informacje o ostatniej edycji. Akcje są zależne od uprawnień: przycisk „Edytuj” oraz „Poproś o ocenę AI” są dostępne tylko dla uprawnionych. Panel AI obsługuje cooldown (429) z widocznym countdownem oraz badge „nieaktualna”, gdy ocena AI jest starsza niż ostatnia modyfikacja aktywności.

## 2. Routing widoku
- Ścieżka: `/activities/{id}`
- Plik strony: `src/pages/activities/[activity_id].astro`
- Renderowanie: CSR (komponenty React uruchamiane z Astro). SSR nie jest wymagane na MVP.

## 3. Struktura komponentów
- ActivityDetailsView (kontener)
  - ActivityHeader
  - ActivityFieldsSection
  - Sidebar
    - EditorsList
  - AIEvaluationPanel
    - AIEvaluationSummary (ostatnia ocena)
    - AIEvaluationTimeline (ostatnie N ocen)
  - ActionsBar (CTA: Edytuj, Poproś o ocenę AI)
  - Countdown (zintegrowany w CTA AI)

## 4. Szczegóły komponentów
### ActivityDetailsView
- Opis komponentu: Kontener strony, odpowiada za pobranie danych (aktywność, edytorzy, oceny AI, uprawnienia grupowe), agregację stanu, warunki uprawnień oraz render hierarchii komponentów.
- Główne elementy:
  - Wrapper layoutu (sekcja z tytułem, meta, treścią główną i sidebarem)
  - Dzieci: `ActivityHeader`, `ActivityFieldsSection`, `EditorsList`, `AIEvaluationPanel`, `ActionsBar`
- Obsługiwane interakcje:
  - Odświeżenie danych po udanym zamówieniu oceny AI
  - Przejście do edycji (nawigacja do `/activities/{id}/edit`, jeśli dostępna)
- Obsługiwana walidacja:
  - Wejściowy `activity_id` jako UUID (walidacja lekką ręką po stronie klienta; błędy i tak obsłuży API)
- Typy:
  - `ActivityDTO`, `ActivityEditorDTO`, `AIEvaluationDTO`, `GroupPermissionsDTO`
  - ViewModel: `ActivityDetailsViewModel` (patrz sekcja 5)
- Propsy: Brak (ID z parametru routingu przez stronę Astro przekazywane jako prop `activityId` lub pobrane z URL po stronie klienta)

### ActivityHeader
- Opis komponentu: Nagłówek szczegółów aktywności: tytuł, status (badge), informacja „ostatnio edytowano”, badge „nieaktualna” jeśli ostatnia ocena AI jest starsza od `activity.updated_at`.
- Główne elementy:
  - Tytuł z `activity.title`
  - Badge statusu (`draft | review | ready | archived`)
  - Tekst meta: `updated_at` (format względny) i ewentualnie autor, jeśli będzie dostępny w przyszłości
  - Badge „nieaktualna” (gdy `latestEvaluation.created_at < activity.updated_at`)
- Obsługiwane interakcje: Brak
- Walidacja: Brak (prezentacja)
- Typy: `ActivityDTO`, opcjonalnie `AIEvaluationDTO`
- Propsy:
  - `activity: ActivityDTO`
  - `latestEvaluation: AIEvaluationDTO | null`

### ActivityFieldsSection
- Opis komponentu: Prezentacja 10 pól aktywności zgodnie z PRD (cel, zadania, czas, miejsce, materiały, odpowiedzialni, zakres wiedzy, uczestnicy, przebieg, podsumowanie). Formatowanie przyjazne do czytania.
- Główne elementy:
  - Lista opisowa (Description List) lub sekcje nagłówek + treść
  - Długa treść wielolinijkowa z bezpiecznym renderem (plain text)
- Obsługiwane interakcje: Collapsy (opcjonalnie) dla długich pól
- Walidacja: Brak (read-only)
- Typy: `ActivityDTO`
- Propsy:
  - `activity: ActivityDTO`

### EditorsList
- Opis: Lista przypisanych edytorów (user_id oraz data przypisania). Na MVP wyświetlamy `user_id` (brak profili użytkowników w typach). 
- Główne elementy: Lista z identyfikatorami, datą `assigned_at`
- Interakcje: Brak (read-only)
- Walidacja: Brak (read-only)
- Typy: `ActivityEditorDTO[]`
- Propsy:
  - `editors: ActivityEditorDTO[]`

### AIEvaluationPanel
- Opis: Panel skrótu ocen AI z ostatnią oceną oraz krótkim timeline. Zawiera CTA do zamówienia nowej oceny AI z countdownem przy 429.
- Główne elementy:
  - AIEvaluationSummary: dwie oceny (lore, harcerstwo) w badge’ach, krótkie feedbacki (złamanie linii), opcjonalny licznik tokenów
  - AIEvaluationTimeline: lista ostatnich N ocen (np. 5), z datą i wynikami
  - CTA „Poproś o ocenę AI” z tooltipem/komunikatem o braku uprawnień lub cooldownie
- Obsługiwane interakcje:
  - Kliknięcie „Poproś o ocenę AI”: POST `/api/activities/{id}/ai-evaluations`, obsługa 202 i odświeżenia listy po krótkim pollingu
  - Pokazanie countdownu, gdy obowiązuje cooldown (z `activity.last_evaluation_requested_at` + 5 min)
- Walidacja i warunki:
  - Uprawnienia do żądania: `admin` lub (`can_edit_all` === true) lub (`can_edit_assigned_only` === true i użytkownik jest na liście edytorów)
  - Cooldown: blokada CTA i render countdownu do 0
  - Badge „nieaktualna” sygnalizowana przez `ActivityHeader`
- Typy: `AIEvaluationDTO[]`, `ActivityDTO`, `GroupPermissionsDTO`
- Propsy:
  - `activity: ActivityDTO`
  - `evaluations: AIEvaluationDTO[]`
  - `canRequest: boolean`
  - `cooldownRemainingSec: number`
  - `onRequestEvaluation: () => Promise<void>`

### AIEvaluationTimeline
- Opis: Skrócony timeline, najnowsza pierwsza. Możliwość „Pokaż więcej” (opcjonalnie) lub link do pełnej historii w przyszłości.
- Elementy: pozycje listy z datą, `version`, `lore_score`, `scouting_values_score`
- Interakcje: Brak (MVP)
- Walidacja: Brak
- Typy: `AIEvaluationDTO[]`
- Propsy: `evaluations: AIEvaluationDTO[]`

### ActionsBar
- Opis: Pasek działań z przyciskami „Edytuj” i „Poproś o ocenę AI”.
- Elementy: `Button` (z `src/components/ui/button.tsx`), tooltip/aria-label przy disabled
- Interakcje:
  - Klik „Edytuj” → nawigacja do `/activities/{id}/edit` (przygotowanie pod przyszły widok edycji)
  - Klik „Poproś o ocenę AI” → delegacja do `onRequestEvaluation`
- Walidacja: Gating uprawnień; cooldown (disabled + aria-disabled + tooltip)
- Typy: Brak
- Propsy:
  - `canEdit: boolean`
  - `canRequest: boolean`
  - `cooldownRemainingSec: number`
  - `onRequestEvaluation: () => Promise<void>`

### Countdown
- Opis: Prezentacja czasu do końca cooldownu w formacie `MM:SS`.
- Elementy: prosty tekst, `aria-live="polite"`
- Interakcje: Brak (odliczanie wewnętrzne)
- Walidacja: Nie pozwala zejść poniżej 0
- Typy: Liczba sekund
- Propsy: `seconds: number`

## 5. Typy
- DTO (istniejące):
  - `ActivityDTO` (zawiera m.in. `id`, `group_id`, 10 pól treści, `status`, `last_evaluation_requested_at`, `updated_at`)
  - `ActivityEditorDTO` (`activity_id`, `user_id`, `assigned_at`, `assigned_by_user_id`)
  - `AIEvaluationDTO` (`id`, `activity_id`, `version`, `lore_score`, `scouting_values_score`, `lore_feedback`, `scouting_feedback`, `suggestions: string[]`, `tokens`, `created_at`)
  - `GroupPermissionsDTO` (`group_id`, `role`, `can_edit_all`, `can_edit_assigned_only`)
- Nowe typy (ViewModel):
  - `type AIEvaluationPostResponse = { data: { queued: boolean; next_poll_after_sec: number } }`
  - `interface AIEvaluationSummaryItem { id: string; created_at: string; lore_score: number; scouting_values_score: number; version: number }`
  - `interface PermissionsComputed { canEdit: boolean; canRequestEvaluation: boolean }`
  - `interface ActivityDetailsViewModel { activity: ActivityDTO; editors: ActivityEditorDTO[]; evaluations: AIEvaluationDTO[]; latestEvaluation: AIEvaluationDTO | null; permissions: GroupPermissionsDTO; computed: PermissionsComputed; cooldownRemainingSec: number; isEvaluationStale: boolean }`

## 6. Zarządzanie stanem
- Hooki niestandardowe:
  - `useActivityDetails(activityId: string)`
    - Pobiera: `GET /api/activities/{id}`, `GET /api/activities/{id}/editors`, `GET /api/activities/{id}/ai-evaluations`
    - Następnie: `GET /api/groups/{group_id}/permissions` (po uzyskaniu `group_id` z aktywności)
    - Zwraca: `ActivityDetailsViewModel`, `loading`, `error`, `refresh()`
    - Obliczenia: `latestEvaluation`, `isEvaluationStale`, `computed.canEdit`, `computed.canRequestEvaluation`
  - `useAIEvaluationRequest(activity: ActivityDTO, editors: ActivityEditorDTO[], permissions: GroupPermissionsDTO)`
    - Zapewnia: `request()`, `requesting`, `cooldownRemainingSec`, `error`
    - `request()` → POST `/api/activities/{id}/ai-evaluations` → po 202 ustawia timeout/polling `GET .../ai-evaluations` po `next_poll_after_sec`, a następnie wywołuje `refresh()` z `useActivityDetails`
  - `useCooldown(startTimestamp?: string, windowSec: number = 300)`
    - Liczy pozostały czas do końca cooldownu (z `last_evaluation_requested_at`)
- Przechowywanie stanu: lokalny stan komponentu (React state) + hooki; brak globalnego store na MVP.

## 7. Integracja API
- `GET /api/activities/{activity_id}` → `ApiSingle<ActivityDTO>`
  - 200: `{ data: ActivityDTO }`
  - 404: `ACTIVITY_NOT_FOUND`
  - 401/403/500: zgodnie z serwerem
- `GET /api/activities/{activity_id}/editors` → `ApiList<ActivityEditorDTO>`
  - 200: `{ data: ActivityEditorDTO[] }`
  - 400/401/403/404/409/500: zgodnie z serwerem
- `GET /api/activities/{activity_id}/ai-evaluations` → `ApiList<AIEvaluationDTO>`
  - 200: `{ data: AIEvaluationDTO[] }` (najnowsze pierwsze)
  - 400/401/403/404/429/500: zgodnie z serwerem
- `POST /api/activities/{activity_id}/ai-evaluations` → żądanie oceny
  - 202: `{ data: { queued: true, next_poll_after_sec: number } }`
  - 429: `{ error: { code: "AI_EVALUATION_COOLDOWN" } }` (frontend liczy countdown z `activity.last_evaluation_requested_at`)
  - 401/403/404/409/500: zgodnie z serwerem
- `GET /api/groups/{group_id}/permissions` → `ApiSingle<GroupPermissionsDTO>`
  - 200: `{ data: GroupPermissionsDTO }`
  - 401/404/500: zgodnie z serwerem

## 8. Interakcje użytkownika
- Wejście na `/activities/{id}` → ładowanie danych, pokazanie skeletonów, po sukcesie render treści.
- Klik „Edytuj” → jeśli `canEdit`, przejście do `/activities/{id}/edit`; w przeciwnym razie disabled + tooltip.
- Klik „Poproś o ocenę AI” → jeśli `canRequestEvaluation` i `cooldownRemainingSec === 0`: wyślij POST → pokaż stan „kolejkowanie…” → po 202 odczekaj `next_poll_after_sec` i odśwież listę ocen.
- Gdy `cooldownRemainingSec > 0` → CTA disabled, render `Countdown` `MM:SS` (aria-live), tooltip „Odczekaj X:YY”.
- Przegląd timeline → tylko podgląd, brak interakcji (MVP).

## 9. Warunki i walidacja
- Gating uprawnień (żądanie oceny i edycja):
  - `canEdit = permissions.role === 'admin' || permissions.can_edit_all || (permissions.can_edit_assigned_only && currentUser ∈ editors)`
  - `canRequestEvaluation = canEdit`
- Cooldown (429):
  - Oblicz `cooldownRemainingSec = max(0, (last_evaluation_requested_at + 300s) - now)`
  - Gdy > 0 → CTA disabled + countdown
- Badge „nieaktualna”:
  - `isEvaluationStale = latestEvaluation && latestEvaluation.created_at < activity.updated_at`
- Walidacja ID po stronie klienta (opcjonalna) i pełna po stronie API.

## 10. Obsługa błędów
- 401: komunikat „Wymagane logowanie” + CTA do logowania (opcjonalnie redirect globalny z middleware).
- 403: komunikat „Brak uprawnień do tej akcji”. CTA ukryte/wyłączone.
- 404 (aktywność/oceny/edytorzy): „Nie znaleziono aktywności” → stan pusty z linkiem powrotu.
- 429: komunikat informacyjny i countdown w CTA.
- 5xx / sieć: baner/alert „Problem po naszej stronie. Spróbuj ponownie później.” + przycisk ponów.
- A11y: `aria-live` dla statusów (ładowanie, błędy, countdown), focus management po błędach.

## 11. Kroki implementacji
1. Routing: utwórz `src/pages/activities/[activity_id].astro` i osadź `ActivityDetailsView` (client:load).
2. Komponenty UI (React, `src/components/activity/`):
   - `ActivityDetailsView.tsx`, `ActivityHeader.tsx`, `ActivityFieldsSection.tsx`, `EditorsList.tsx`, `AIEvaluationPanel.tsx`, `AIEvaluationTimeline.tsx`, `ActionsBar.tsx`, `Countdown.tsx`.
3. Hooki (`src/lib/`):
   - `useActivityDetails.ts` (pobieranie 4 endpointów, agregacja ViewModel)
   - `useAIEvaluationRequest.ts` (POST + countdown + polling)
   - (opcjonalnie) `useCooldown.ts` (licznik MM:SS z `last_evaluation_requested_at`)
4. Integracja API: użyj `fetch` na ścieżkach `/api/...`; typuj odpowiedzi `ApiSingle`/`ApiList` z `src/types.ts`.
5. Uprawnienia: oblicz `canEdit`/`canRequestEvaluation` z `GroupPermissionsDTO` i listy `editors`.
6. Cooldown: oblicz z `activity.last_evaluation_requested_at` i odświeżaj co sekundę do 0 (`useCooldown`).
7. Timeline ocen: renderuj top N (np. 5) ocen, najnowsza pierwsza. Pokaż ostatnią ocenę w `AIEvaluationSummary`.
8. Badge „nieaktualna”: porównaj `latestEvaluation.created_at` z `activity.updated_at`.
9. A11y/UX: aria-live, focus po błędach, tooltips dla disabled, skeletony podczas ładowania.
10. Stylowanie: Tailwind 4 + istniejący `Button` z `shadcn/ui`. Badge i karty z prostymi klasami Tailwind (bez dodawania nowych zależności).
11. Testy manualne scenariuszy: 401/403/404, brak ocen, 429 cooldown, happy-path 202→polling, brak edytorów.
12. Dokumentacja krótkiego README sekcji w kodzie (komentarze przy hookach z warunkami uprawnień) i TODO na integrację nazw użytkowników w przyszłości.
