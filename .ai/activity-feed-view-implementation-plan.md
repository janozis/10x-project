## Plan implementacji widoku Activity feed

## 1. Przegląd
Widok prezentuje pełny feed aktywności zespołu w grupie HAL w formie osi czasu. W MVP wykorzystuje dane z endpointu dashboard (sekcja `recent_activity`) oraz subskrypcje realtime (Supabase) dla natychmiastowych aktualizacji. Zapewnia podstawowe filtry po typach zdarzeń, czytelne ikonki i paginację w trybie „load more” planowaną iteracyjnie (serwerowo brak dedykowanego endpointu – w MVP ograniczamy się do puli zwracanej przez dashboard).

## 2. Routing widoku
- Ścieżka: `/groups/[group_id]/activity-feed`
- Plik strony: `src/pages/groups/[group_id]/activity-feed.astro`
- Layout: `src/layouts/Layout.astro`

## 3. Struktura komponentów
- `ActivityFeedPage.astro` (strona)
  - `ActivityFeedView.tsx` (kontener logiki + UI)
    - `ActivityFeedFilters.tsx` (filtry klientowe)
    - `LiveIndicator.tsx` (status realtime)
    - `ActivityFeedList.tsx` (lista/virtual list)
      - `ActivityFeedItem.tsx` (pojedynczy wpis)
    - `EmptyState.tsx` (ponowne użycie istniejącego lub dedykowany)
    - `ErrorState.tsx` (komunikat błędu + retry)
    - `LoadingSkeleton.tsx` (szkielety listy)

## 4. Szczegóły komponentów
### ActivityFeedPage.astro
- Opis: Strona Astro osadza komponent React i przekazuje `groupId` z parametrów, integruje layout.
- Główne elementy: import layoutu; główny `div`/`Card`; osadzony `ActivityFeedView` z `client:load`.
- Obsługiwane interakcje: brak (deleguje do React).
- Walidacja: sprawdzenie obecności `Astro.params.group_id` i przekazanie do klienta.
- Typy: `groupId: string` (UUID), bezpośrednio z parametru ścieżki.
- Propsy: `{ groupId: string }` do komponentu React.

### ActivityFeedView.tsx
- Opis: Główny kontener – pobiera dane, utrzymuje stan, subskrybuje realtime, renderuje filtry, listę, stany ładowania/błędów.
- Główne elementy: `Card`, `CardHeader` (tytuł, filtry, licznik), `CardContent` (lista), `CardFooter` (przycisk „Załaduj więcej” – w MVP disabled), `LiveIndicator`.
- Obsługiwane interakcje:
  - Zmiana filtrów typów zdarzeń (client-side filter).
  - Retry przy błędzie (ponowny fetch dashboard/permissions).
  - „Załaduj więcej” (zarezerwowane, w MVP disabled albo noop).
- Walidacja:
  - Brak `groupId` → lokalny błąd (400 UI).
  - Odpowiedzi API: obsługa „UNAUTHORIZED”, „NOT_FOUND”, „VALIDATION_ERROR”, „INTERNAL_ERROR”.
- Typy: korzysta z `GroupDashboardDTO`, `GroupPermissionsDTO` oraz własnych VM (sekcja Typy).
- Propsy: `{ groupId: string }`.

### ActivityFeedFilters.tsx
- Opis: Panel filtrów po typach zdarzeń (checklisty) + opcjonalnie szybkie presety.
- Główne elementy: `Badge`/`Button` toggle, `DropdownMenu` lub `Select` (jeśli typów będzie więcej), licznik aktywnych filtrów.
- Obsługiwane interakcje: toggle typu zdarzenia → `onChange(filters)`.
- Walidacja: co najmniej jeden typ może być niewybrany (pusta lista = pusty wynik), brak błędów.
- Typy: `ActivityFeedFiltersVM`.
- Propsy: `{ value: ActivityFeedFiltersVM; onChange: (v) => void; availableTypes: ActivityFeedEventType[] }`.

### ActivityFeedList.tsx
- Opis: Render listy wpisów; prosty scroll w MVP (możliwość późniejszej wirtualizacji).
- Główne elementy: `ul > ActivityFeedItem` + `Separator`.
- Obsługiwane interakcje: click item → nawigacja do zasobu (jeśli link dostępny).
- Walidacja: brak.
- Typy: `ActivityFeedEventVM[]`.
- Propsy: `{ items: ActivityFeedEventVM[] }`.

### ActivityFeedItem.tsx
- Opis: Pojedyncze zdarzenie z ikoną, tytułem, opisem, czasem, identyfikacją użytkownika i (opcjonalnie) linkiem do zasobu.
- Główne elementy: `Avatar`/fallback inicjałów użytkownika, ikona typu (`activity_created`/`activity_updated`), `timeago`, `Badge` typu, link.
- Obsługiwane interakcje: `onClick` jeśli jest `href`.
- Walidacja: format czasu; jeśli brak `userDisplay`, pokazuje skrócony `user_id`.
- Typy: `ActivityFeedEventVM`.
- Propsy: `{ item: ActivityFeedEventVM }`.

### LiveIndicator.tsx
- Opis: Mały wskaźnik statusu subskrypcji realtime (zielona kropka „LIVE” / żółta „RECONNECTING” / szara „OFF”).
- Główne elementy: `Badge`/`Dot` + label.
- Obsługiwane interakcje: tooltip z informacją o statusie.
- Walidacja: brak.
- Typy: `RealtimeStatus = 'live' | 'reconnecting' | 'off'`.
- Propsy: `{ status: RealtimeStatus }`.

### EmptyState.tsx
- Opis: Stan pusty (brak aktywności po zastosowaniu filtrów lub ogólnie).
- Główne elementy: Ikona, krótki tekst, przycisk „Wyczyść filtry”.
- Obsługiwane interakcje: `onClearFilters`.
- Walidacja: brak.
- Typy: proste propsy.
- Propsy: `{ onClearFilters?: () => void }`.

### ErrorState.tsx
- Opis: Komunikat błędu z przyciskiem „Spróbuj ponownie”.
- Główne elementy: `Card`, `Button`.
- Obsługiwane interakcje: `onRetry`.
- Walidacja: brak.
- Typy: `{ message?: string }`.
- Propsy: `{ onRetry: () => void; message?: string }`.

### LoadingSkeleton.tsx
- Opis: Placeholder ładowania listy (3–5 skeletonów linii).
- Główne elementy: `div` z klasami Tailwind `animate-pulse`.
- Obsługiwane interakcje: brak.
- Walidacja: brak.
- Typy: brak.
- Propsy: `{ rows?: number }`.

## 5. Typy
Nowe i używane typy:

- Z istniejących (`src/types.ts`):
  - `GroupDashboardDTO` z polem `recent_activity: { type: string; id: UUID; at: TimestampISO; user_id: UUID; }[]`
  - `GroupPermissionsDTO` (`group_id`, `role`, `can_edit_all`, `can_edit_assigned_only`)

- Nowe typy (ViewModel):
  - `type ActivityFeedEventType = 'activity_created' | 'activity_updated'` (MVP; rozszerzalne)
  - `interface ActivityFeedEventDTO { type: string; id: string; at: string; user_id: string }` (alias kształtu z dashboard)
  - `interface ActivityFeedEventVM {
      eventId: string;            // identyfikator zdarzenia (zwykle = id zasobu)
      resourceType: 'activity';   // w MVP tylko aktywności
      resourceId: string;         // id aktywności
      type: ActivityFeedEventType;
      at: Date;                   // zparsowane `at`
      user: { id: string; displayName?: string };
      title: string;              // np. „Zajęcie utworzone”
      subtitle?: string;          // np. skrót id lub opis
      icon: 'plus' | 'edit';      // mapowanie na ikonę UI
      href?: string;              // link do zasobu (opcjonalnie)
    }`
  - `interface ActivityFeedFiltersVM { types: ActivityFeedEventType[] }`
  - `type RealtimeStatus = 'live' | 'reconnecting' | 'off'`

## 6. Zarządzanie stanem
- Lokalny stan w `ActivityFeedView` lub dedykowany hook `useActivityFeed(groupId)`:
  - `events: ActivityFeedEventVM[]` – wynik zmapowany z `recent_activity` + dopływy realtime.
  - `filters: ActivityFeedFiltersVM` + `setFilters` – filtry po typach (domyślnie oba zaznaczone).
  - `status: 'idle' | 'loading' | 'error' | 'ready'` – cykl życia danych.
  - `realtimeStatus: RealtimeStatus` – status kanału Supabase.
  - `error?: string` – komunikat błędu.
  - `loadMore(): Promise<void>` – placeholder (MVP: disabled, docelowo do stronicowania po kursorze `at`).

- Hook `useActivityFeed` – odpowiedzialności:
  1) `fetchInitial()` – GET `/api/groups/{group_id}/dashboard?recent_limit=10` → mapuje do `ActivityFeedEventVM[]`.
  2) `subscribeRealtime()` – Supabase `postgres_changes` na `public.activities` z filtrami:
     - INSERT (→ `activity_created`)
     - UPDATE (→ `activity_updated` jeśli `updated_at` > `created_at`)
     - Filtr: `group_id = eq.{groupId}`.
  3) `applyFilters()` – filtruje `events` client-side po `filters.types`.
  4) Sprzątanie subskrypcji w `useEffect` unmount.

## 7. Integracja API
- GET `/api/groups/{group_id}/dashboard?recent_limit=10`
  - Response: `{ data: GroupDashboardDTO }`
  - Uwagi: mapper po stronie serwera obecnie tnie listę do 10 pozycji; typy zdarzeń ograniczone do `activity_created` i `activity_updated`.

- GET `/api/groups/{group_id}/permissions`
  - Response: `{ data: GroupPermissionsDTO }`
  - Zastosowanie: walidacja dostępu (członkostwo). W razie 401/404 – ekran błędu lub redirect (wg polityki app).

- Realtime (Supabase):
  - Kanał: `supabase.channel('activity_feed:{groupId}')`
  - Zdarzenia:
    - INSERT w `public.activities` (mapowane na `activity_created`)
    - UPDATE w `public.activities` (mapowane na `activity_updated`)
  - Filtr: `{ schema: 'public', table: 'activities', filter: `group_id=eq.${groupId}` }`
  - Odporność: backoff przy reconnect; update `realtimeStatus`.

## 8. Interakcje użytkownika
- Zmiana filtrów typów → natychmiastowe filtrowanie listy (bez żądań do API).
- Kliknięcie wpisu → nawigacja do zasobu (np. `/groups/{groupId}/activities/{activityId}` – jeśli dostępna trasa; w MVP opcjonalnie disabled, tooltip „Wkrótce”).
- Retry przy błędzie → ponowny fetch dashboard i permissions.
- „Załaduj więcej” → w MVP disabled (tooltip), w przyszłości pobieranie starszych wpisów z dedykowanego endpointu.

## 9. Warunki i walidacja
- `groupId` musi być obecny i mieć postać UUID – UI pokazuje błąd gdy brak (`400` lokalnie).
- Uprawnienia: brak członkostwa → komunikat „Brak dostępu do grupy” (odpowiedzi 401/404 z `/permissions`).
- Dane zdarzeń:
  - `type` musi należeć do wspieranych: w MVP ignorujemy nieznane typy lub renderujemy jako „inne”.
  - `at` parsowalne do `Date`; w razie błędu fallback do surowego ISO string.
  - `user_id` może nie mieć wyświetlanej nazwy – fallback: skrócony UUID i neutralny avatar.

## 10. Obsługa błędów
- API errors:
  - 400/VALIDATION_ERROR → komunikat o nieprawidłowych parametrach (spróbuj ponownie).
  - 401/UNAUTHORIZED → zaloguj się (link do logowania) lub informacja o braku sesji.
  - 404/NOT_FOUND → brak członkostwa lub brak grupy – CTA powrót do listy grup.
  - 500/INTERNAL_ERROR → ogólny błąd, przycisk retry.
- Realtime:
  - Utrata połączenia → `realtimeStatus='reconnecting'` + żółta etykieta; po odzyskaniu `live`.
  - Błąd subskrypcji → log do konsoli, powiadomienie dyskretne, automatyczny retry.

## 11. Kroki implementacji
1) Routing:
   - Utwórz `src/pages/groups/[group_id]/activity-feed.astro` korzystając z `Layout.astro`.
   - Pobierz `groupId` z `Astro.params` i przekaż do komponentu React.
2) Komponent kontenerowy:
   - Dodaj `src/components/groups/ActivityFeedView.tsx` – fetch `/permissions` i `/dashboard`, utrzymanie stanu, render UI.
   - Zaimplementuj stany: loading, error, ready; puste dane.
3) Realtime:
   - Skonfiguruj kanał Supabase z filtrami po `group_id` dla `INSERT`/`UPDATE` na `activities`.
   - Aktualizuj listę o nowe zdarzenia i status `LiveIndicator`.
4) Filtry:
   - Dodaj `ActivityFeedFilters.tsx` z toggle dla `activity_created`, `activity_updated`.
   - Ustal domyślne filtry (oba włączone); aktualizuj listę klientowo.
5) Lista i pozycja listy:
   - Dodaj `ActivityFeedList.tsx` i `ActivityFeedItem.tsx` z ikonami typów i `timeago`.
   - Przygotuj `href` do zasobu, jeśli trasa istnieje; w przeciwnym razie tooltip.
6) Stany UX:
   - Dodaj `LoadingSkeleton.tsx`, `ErrorState.tsx`, wykorzystaj istniejący `EmptyState` lub dedykowany.
7) UI Kit i style:
   - Wykorzystaj `src/components/ui/{card,button,badge}.tsx`; Tailwind 4 do layoutu.
   - Zapewnij responsywność (przewijana lista w kontenerze, max-w-3xl w desktop).
8) Walidacje i bezpieczeństwo:
   - Obsłuż brak `groupId`, błędy API i brak dostępu zgodnie z sekcją 9/10.
9) Testy ręczne:
   - Scenariusze: pusta grupa, brak dostępu, brak sesji, nowe zdarzenia realtime, zmiana filtrów.
10) Backlog (+1):
   - Prawdziwa paginacja (cursor po `at`), rozbudowa typów (tasks, evaluations), enrichment użytkowników (wyświetlane nazwy), wirtualizacja listy.


