## Podsumowanie prac: Group Dashboard

### Przegląd
Zaimplementowano widok pulpitu grupy łączący SSR (kafle/metryki, uprawnienia, status grupy) z komponentami klienckimi (lista aktywności w czasie rzeczywistym, szybkie zadanie) zgodnie z planem. Widok obsługuje podstawowe metryki, skróty nawigacyjne, tworzenie zadań oraz realtime aktualizacje feedu i metryk.

### Struktura i komponenty
- Strona SSR: `src/pages/groups/[group_id]/dashboard.astro`
  - Ładuje: dashboard (GET /dashboard), permissions (GET /permissions), status grupy (DB) i przekazuje dane do komponentów.
- Komponenty (React/SSR):
  - `ArchivedBanner` – baner dla grup z `status === "archived"`.
  - `DashboardShortcuts` – skróty do widoków (zależne od roli).
  - `GroupDashboardTiles` – prezentacja metryk i (warunkowo) CTA „Dodaj zadanie”.
  - `GroupDashboardTilesClient` – wariant kliencki z refetchem metryk po zdarzeniach realtime, deduplikacją żądań i prostym backoffem.
  - `QuickTaskForm` – szybkie tworzenie zadania (walidacja, POST /tasks, toast).
  - `RecentActivityFeed` – feed z ikonami/labelami, realtime, skeletonami i przyciskiem „Załaduj więcej”.

### Kluczowe pliki (dodane/zmienione)
- Strona:
  - `src/pages/groups/[group_id]/dashboard.astro`
- Komponenty grup:
  - `src/components/groups/ArchivedBanner.tsx`
  - `src/components/groups/DashboardShortcuts.tsx`
  - `src/components/groups/GroupDashboardTiles.tsx` (CTA admin-only)
  - `src/components/groups/GroupDashboardTilesClient.tsx` (nowy)
  - `src/components/groups/QuickTaskForm.tsx` (id="quick-task", toast)
  - `src/components/groups/RecentActivityFeed.tsx` (realtime, ikony, skeletony, Load more)
- VM i mapowania:
  - `src/lib/dashboard/types.ts` (DashboardTilesVM, itp.)
  - `src/lib/mappers/dashboard-tiles.mapper.ts`
- Realtime hook:
  - `src/lib/dashboard/useDashboardRealtime.ts`

### Integracja API
- `GET /api/groups/{group_id}/dashboard` – pobranie metryk i feedu (SSR i refetch klienta).
- `GET /api/groups/{group_id}/permissions` – uprawnienia użytkownika (rola, flagi) do sterowania UI.
- `POST /api/groups/{group_id}/tasks` – tworzenie zadania z formularza QuickTaskForm.
- Dodatkowo SSR pobiera `status` grupy bezpośrednio z DB dla `ArchivedBanner`.

### Interakcje użytkownika
- Tworzenie zadania (walidacja pól, błędy API, toast sukcesu).
- Przegląd feedu z aktywnościami (ikony, czytelne etykiety, znacznik czasu).
- „Załaduj więcej” w feedzie – paginacja gotowa do rozbudowy (rośnie recent_limit, limit do 50).
- Skróty do podstron grupy.
- CTA „Dodaj zadanie” widoczne tylko dla ról mogących tworzyć zadania.

### Realtime (Supabase)
- Hook `useDashboardRealtime` subskrybuje:
  - `activities`: INSERT → activity_created, UPDATE → activity_updated
  - `group_tasks`: INSERT → task_created, UPDATE → task_updated/task_done
  - `ai_evaluations`: INSERT → obecnie tylko invalidacja metryk
- Debounce invalidacji, wskaźnik połączenia (online/offline), bezpieczne czyszczenie kanału.

### UX i dostępność
- Kafle: grid responsywny, progress bar z ARIA.
- Feed: skeleton na start i podczas aktualizacji; aria-live dla ogłoszeń; aria-busy w trakcie zmian; przycisk „Załaduj więcej”.
- Formularz: komunikaty o błędach, walidacja wejścia, przyciski z proper ARIA.
- Baner archiwum i alerty błędów SSR.

### Obsługa błędów i brzegi
- SSR: mapowanie kodów błędów API na status HTTP; bezpieczne komunikaty.
- QuickTaskForm: walidacja `title`, `due_date`, `activity_id`; przy błędach API wyświetlenie wiadomości.
- Realtime: tolerancja rozłączeń; delikatny wskaźnik stanu.

### Co pozostało (opcjonalne kolejne kroki)
- Precyzyjna paginacja feedu (np. cursor zamiast rosnącego recent_limit) i wiarygodne `hasMore` z backendu.
- Testy (jednostkowe/komponentowe) dla widoczności CTA wg uprawnień oraz stanów skeletonów.
- Łagodniejsze komunikaty przy błędach „Załaduj więcej” + retry UI.
- Mapowania typów zdarzeń AI do czytelniejszych etykiet/linków (gdy będą dostępne powiązania do grupy).

### Jak przetestować
1. Odwiedź: `/groups/{group_id}/dashboard`.
2. Zweryfikuj baner archiwum (jeśli dotyczy), kafle i skróty.
3. Utwórz szybkie zadanie – powinno pojawić się w feedzie (realtime) i zaktualizować metryki.
4. Skorzystaj z „Załaduj więcej” w feedzie przy większej liczbie zdarzeń.
5. Obserwuj wskaźnik online/offline (realtime); chwilowe rozłączenie nie powinno psuć UI.


