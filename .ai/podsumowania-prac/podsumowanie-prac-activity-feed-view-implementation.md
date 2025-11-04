## Podsumowanie prac: Activity Feed View (MVP)

### Zakres i cel
Zaimplementowano kompletny widok feedu aktywności zespołu w grupie zgodnie z planem `@activity-feed-view-implementation-plan.md`. Widok prezentuje ostatnie zdarzenia, wspiera podstawowe filtry, integruje się z API oraz z Supabase Realtime, obsługuje stany błędów i puste dane.

### Główne zmiany w kodzie
- Routing strony:
  - `src/pages/groups/[group_id]/activity-feed.astro` – strona osadzająca widok React z `Layout.astro`.
- Kontener i logika widoku:
  - `src/components/groups/ActivityFeedView.tsx` – fetch uprawnień i dashboardu, stan, filtry, realtime, stany UI.
- Realtime / hook:
  - `src/lib/dashboard/useDashboardRealtime.ts` – statusy połączenia: `live`/`reconnecting`/`off`, zdarzenia INSERT/UPDATE dla `activities` (MVP), integracja z feedem.
- Komponenty UI (wyodrębnione):
  - `src/components/groups/ActivityFeedFilters.tsx`
  - `src/components/groups/ActivityFeedList.tsx`
  - `src/components/groups/ActivityFeedItem.tsx`
  - `src/components/groups/LiveIndicator.tsx`
  - `src/components/groups/LoadingSkeleton.tsx`
  - `src/components/groups/ErrorState.tsx`
  - `src/components/groups/ActivityFeedEmpty.tsx`
- Typy (VM):
  - `src/lib/dashboard/activity-feed.types.ts` – typy widoku: eventy, filtry, status realtime.

### Architektura komponentów
- `ActivityFeedView` (kontener)
  - `ActivityFeedFilters` (filtry typów: `activity_created`, `activity_updated`)
  - `LiveIndicator` (status realtime: `live`/`reconnecting`/`off`)
  - `ActivityFeedList` → `ActivityFeedItem`
  - `LoadingSkeleton`, `ErrorState`, `ActivityFeedEmpty`

### Integracja API
- GET `/api/groups/{group_id}/permissions` – walidacja dostępu (401/404/…)
- GET `/api/groups/{group_id}/dashboard?recent_limit=10` – źródło `recent_activity` (MVP)
- Mapowanie zdarzeń do VM w kontenerze (przyszłościowo do mappera w `@/lib/mappers`).

### Realtime (Supabase)
- Kanał: `dashboard:{groupId}`.
- Zdarzenia: INSERT/UPDATE w `public.activities` → `activity_created` / `activity_updated`.
- Status połączenia eksponowany jako `live`/`reconnecting`/`off` i prezentowany przez `LiveIndicator`.

### Interakcje użytkownika
- Filtry typów (toggle) + licznik aktywnych; CTA „Wyczyść filtry” w pustym wyniku po filtrach.
- Retry po błędzie (ponowny fetch uprawnień i dashboardu).
- „Załaduj więcej” – w MVP wyłączone (UI przygotowane, przycisk disabled).
- Klik w pozycję listy: link do zasobu, a jeśli brak docelowej trasy – tooltip „Wkrótce”.

### Zarządzanie stanem (w `ActivityFeedView`)
- `status: 'idle' | 'loading' | 'error' | 'ready'`
- `errorMessage`, `errorStatus`
- `permissions`
- `events` (zmapowane DTO → VM, limit 50)
- `filters` (`{ types }`)
- `realtimeStatus: 'live' | 'reconnecting' | 'off'`

### Obsługa błędów i walidacje
- Walidacja `groupId` (UUID) z komunikatami dla 400.
- Uprawnienia: komunikaty specyficzne (401 → link do logowania, 404 → link powrotu do listy grup).
- Błędy dashboardu nie „wywracają” widoku – pokazujemy stany i retry.

### Stylowanie i dostępność
- shadcn/ui: `Card`, `Button`, `Badge`; Tailwind 4 (prosty, responsywny layout, drobny cień karty).
- `LiveIndicator` z `aria-label` (status czytelny dla SR). Tooltip „Wkrótce” dla nieaktywnych linków.

### Status realizacji
- MVP funkcjonalny, zgodny z planem. Brak blokujących elementów do działania.
- Zadania opcjonalne (backlog na +1):
  - Prawdziwa paginacja (cursor po `at`).
  - Rozszerzenie typów zdarzeń (tasks/evaluations), enrichment użytkowników (displayName).
  - Ekstrakcja mapperów do `@/lib/mappers` i testy jednostkowe mapowania/filtrów.
  - Wirtualizacja listy dla dużych feedów.


