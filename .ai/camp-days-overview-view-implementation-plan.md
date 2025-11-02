## Plan implementacji widoku Camp Days – overview

### 1. Przegląd
Widok służy do przeglądu całego obozu w ujęciu dni. Prezentuje listę (grid) dni wraz z podstawowymi metrykami: liczba zaplanowanych slotów zajęć oraz łączny czas trwania zajęć w danym dniu. Użytkownik może szybko odfiltrować dni bez zajęć oraz dni, w których łączny czas zajęć jest mniejszy niż zadany próg (np. 60 minut). Każdy dzień jest klikalny i prowadzi do widoku szczegółów dnia.

Cele UX:
- Szybkie zorientowanie się, które dni wymagają uzupełnienia.
- Natychmiastowe filtry pod ręką, także na mobile.
- Spójna nawigacja do szczegółu dnia.

Założenia danych: lista dni z API grupy (`GET /api/groups/{group_id}/camp-days`), a metryki slotów i czasu agregowane po stronie UI na bazie harmonogramów dnia (`GET /api/camp-days/{camp_day_id}/schedules`).

### 2. Routing widoku
- **Ścieżka**: `/groups/{group_id}/camp-days/overview`
- **Plik strony**: `src/pages/groups/[group_id]/camp-days/overview.astro`
- **Strategia renderowania**: SSR dla struktury strony + CSR dla pobrania danych i interakcji (React 19 wpięty w Astro). Pierwsze żądanie może zainicjować pobranie listy dni, a następnie równoległe (throttlowane) pobranie harmonogramów dla widocznych dni.

### 3. Struktura komponentów
```
CampDaysOverviewPage (Astro)
  └─ CampDaysOverviewView (React)
       ├─ CampDaysFilters
       ├─ CampDaysDayGrid
       │    └─ CampDayCard (×N)
       ├─ CampDaysSkeletonGrid (stan ładowania)
       └─ ErrorState / EmptyState
```

### 4. Szczegóły komponentów
#### CampDaysOverviewView
- **Opis**: Kontener widoku – pobiera dane, utrzymuje stan filtrów, scala DTO w ViewModel, renderuje grid.
- **Główne elementy**: wrapper sekcji, nagłówek, `CampDaysFilters`, `CampDaysDayGrid`, ewentualnie `ErrorState`/`Skeleton`.
- **Obsługiwane interakcje**: zmiana filtrów, nawigacja do dnia, prefetch metryk dnia w tle.
- **Walidacja**:
  - `maxTotalMinutes` ≥ 0 lub `null` (brak progu); wartości spoza zakresu resetowane do domyślnej (np. 60).
  - Filtry stosowane dopiero po wczytaniu metryk dla danego dnia (dni bez metryk tymczasowo oznaczane jako „ładowanie”).
- **Typy**: `CampDayDTO`, `ActivityScheduleDTO`, `CampDayStats`, `CampDaysFilters`, `CampDayCardVM` (opis w sekcji Typy).
- **Propsy**: `{ groupId: UUID }` (z parametru trasy przekazany z Astro).

#### CampDaysFilters
- **Opis**: Pasek filtrów: przełącznik „Bez zajęć” oraz pole liczby „Łączny czas < X min”, szybkie presety.
- **Główne elementy**: `Switch`/`Checkbox`, `NumberInput` + przyciski presetów (np. 30/60/90), reset filtrów.
- **Obsługiwane interakcje**: toggle bez zajęć, ustawienie progu minut, wybór presetów, reset.
- **Walidacja**: `maxTotalMinutes` liczba całkowita, min 0, max np. 1440; informacja o błędnym wejściu, przywrócenie poprzedniej wartości.
- **Typy**: `CampDaysFilters`.
- **Propsy**: `{ value: CampDaysFilters; onChange: (next: CampDaysFilters) => void }`.

#### CampDaysDayGrid
- **Opis**: Odpowiada za responsywny układ kart dni oraz renderowanie skeletonów/empty state.
- **Główne elementy**: wrapper z CSS grid (Tailwind), children `CampDayCard`.
- **Obsługiwane interakcje**: brak (delegowane do kart), może inicjować prefetch metryk kart w viewport (IntersectionObserver).
- **Walidacja**: brak logiki domenowej – dba o poprawne ARIA roli listy/kafelków.
- **Typy**: `CampDayCardVM[]`.
- **Propsy**: `{ days: CampDayCardVM[]; onPrefetchDay?: (campDayId: UUID) => void }`.

#### CampDayCard
- **Opis**: Pojedyncza karta dnia – dzień, data, liczba slotów, łączny czas, badge „Brak zajęć” oraz link do widoku dnia.
- **Główne elementy**: `Card` (shadcn/ui), `Badge`, `Link`.
- **Obsługiwane interakcje**: klik karty/linku → przejście do szczegółu dnia; `onMouseEnter`/`onFocus` → opcjonalny prefetch harmonogramu.
- **Walidacja**: jeśli metryki wczytują się/niezdefiniowane – wyświetl stan „–”/spinner w sekcji metrów; „Brak zajęć” tylko gdy slotsCount == 0 (po wczytaniu).
- **Typy**: `CampDayCardVM`.
- **Propsy**: `{ day: CampDayCardVM; onHover?: () => void }`.

#### CampDaysSkeletonGrid
- **Opis**: Siatka placeholderów podczas ładowania listy dni lub metryk.
- **Główne elementy**: 6–12 skeletonów kart, dopasowanych do układu.
- **Obsługiwane interakcje**: brak.
- **Walidacja**: brak.
- **Typy/Propsy**: opcjonalnie `{ count?: number }`.

#### ErrorState / EmptyState
- **Opis**: Stany błędu i pustki. Empty, gdy grupa nie ma żadnych dni. Error, gdy błąd API.
- **Główne elementy**: ikona, opis, CTA (np. odśwież).
- **Obsługiwane interakcje**: „Spróbuj ponownie”.
- **Typy/Propsy**: `{ message?: string; onRetry?: () => void }`.

### 5. Typy
- **DTO (z `src/types.ts`)**:
  - `CampDayDTO`: `{ id, group_id, day_number, date, theme, created_at, updated_at }` (Pick z `camp_days`).
  - `ActivityScheduleDTO`: `{ id, activity_id, camp_day_id, start_time, end_time, order_in_day, created_at, updated_at }`.

- **Nowe ViewModel / pomocnicze**:
  - `type CampDayStats = { campDayId: UUID; slotsCount: number; totalMinutes: number; hasNoActivities: boolean; loading: boolean; error?: string | null }`
  - `type CampDaysFilters = { onlyNoActivities: boolean; maxTotalMinutes: number | null }`
  - `type CampDayCardVM = { dto: CampDayDTO; stats: CampDayStats | null }`

- **Funkcje pomocnicze**:
  - `computeTotalMinutes(s: ActivityScheduleDTO[]): number` – różnica HH:MM w minutach (sumowane po slotach).
  - `toStats(campDayId: UUID, schedules: ActivityScheduleDTO[]): CampDayStats` – wylicza `slotsCount`, `totalMinutes`, `hasNoActivities`.

### 6. Zarządzanie stanem
- **Hook**: `useCampDaysOverview(groupId: UUID)`
  - Stan: `days: CampDayDTO[]`, `statsById: Record<UUID, CampDayStats>`, `filters: CampDaysFilters`, `loading: boolean`, `error?: string`.
  - Akcje: `setFilters`, `prefetchStatsFor(dayId)`, `prefetchAllStats(concurrency=5)`, `retry`.
  - Selektory pochodne: `filteredCardVMs: CampDayCardVM[]` – łączy DTO ze statystykami i filtruje.

- **Strategia pobierania**:
  - 1) Pobierz `GET /api/groups/{groupId}/camp-days` (lista dni).
  - 2) Prefetch metryk dla dni widocznych (IntersectionObserver) i/lub „Prefetch all” z ograniczeniem współbieżności (np. 5) po stabilizacji listy.
  - Cache w pamięci (na czas życia widoku) – nie ponawiamy requestów dla tego samego dnia.

- **Responsywność**: Grid 1 kolumna (≤sm), 2–3 (md), 4–6 (lg+). Karty kompaktowe na mobile.

### 7. Integracja API
- **Lista dni**: `GET /api/groups/{group_id}/camp-days`
  - Response: `ApiList<CampDayDTO>` → `{ data: CampDayDTO[], count?: number }` lub `ApiError`.
- **Harmonogram dnia**: `GET /api/camp-days/{camp_day_id}/schedules`
  - Response: `ApiList<ActivityScheduleDTO>` posortowane po `order_in_day`.

- **Obsługa błędów HTTP**:
  - 401/403 → komunikat o braku dostępu (z PRD: maskowanie NOT_MEMBER jako NOT_FOUND możliwe – komunikat ogólny „Brak dostępu lub nie znaleziono”).
  - 404 → ogólny „Nie znaleziono danych dla tej grupy/dnia”.
  - 5xx → „Wystąpił błąd serwera. Spróbuj ponownie.”

- **Wydajność**:
  - Prefetch metryk tylko dla dni w viewport + throttle (requestIdleCallback, concurrency pool ~5).
  - Agregacja po stronie UI – unikać N× duplikatów żądań (prosty cache `statsById`).

### 8. Interakcje użytkownika
- Kliknięcie karty dnia → przejście do szczegółu dnia: `/groups/{group_id}/camp-days/{camp_day_id}`.
- Włączenie filtra „Bez zajęć” → pokazuje tylko dni, gdzie `slotsCount == 0`.
- Ustawienie „Łączny czas < X min” → pokazuje dni, gdzie `totalMinutes < X`.
- Hover/Focus na karcie → prefetch harmonogramu dnia (jeśli brak metryk).
- Mobile: filtry w jednym rzędzie z możliwością przewijania horyzontalnego (chips/presety), karty kompaktowe.

### 9. Warunki i walidacja
- `maxTotalMinutes` musi być liczbą nieujemną; przy pustej wartości filtr wyłączony.
- Dni bez wczytanych metryk nie są kategorycznie klasyfikowane jako „bez zajęć” do czasu wczytania; karta wskazuje stan ładowania.
- Pole liczby powinno mieć atrybuty `min=0`, `step=5` oraz walidację błędnych znaków.

### 10. Obsługa błędów
- Błąd listy dni → `ErrorState` z przyciskiem „Spróbuj ponownie”, log techniczny w konsoli.
- Błąd pobierania harmonogramu dla pojedynczego dnia → karta pokazuje ikonę ostrzeżenia/tooltip i pozwala na retry (kliknięcie ikony lub hover → ponów po czasie).
- Globalny timeout (np. 10s) na pobranie metryk, po którym uznajemy jako „niedostępne” – karta nadal klikalna.

### 11. Kroki implementacji
1. Utwórz stronę `src/pages/groups/[group_id]/camp-days/overview.astro` z kontenerem React (`CampDaysOverviewView`) i przekazaniem `groupId`.
2. Zaimplementuj hook `useCampDaysOverview(groupId)` odpowiedzialny za pobranie listy dni, prefetch i cache metryk oraz zarządzanie filtrami.
3. Dodaj komponent `CampDaysFilters` (Switch + NumberInput + presety + reset) z pełną walidacją wejścia.
4. Dodaj `CampDaysDayGrid` (grid responsive) i `CampDayCard` (Card + Badge + link + metryki + stany ładowania/ błędu).
5. Wprowadź prefetch metryk z IntersectionObserver oraz fallback „Prefetch all (concurrency=5)” po załadowaniu listy (opcjonalne).
6. Zaimplementuj funkcje pomocnicze: `computeTotalMinutes`, `toStats` oraz prosty cache `statsById`.
7. Dodaj stany `ErrorState` i `EmptyState` oraz `CampDaysSkeletonGrid` na czas ładowania.
8. Zapewnij A11y: etykiety dla kontrolek filtrów, focus ring, role/aria w gridzie, czytelne komunikaty.
9. Testy ręczne: różne rozdzielczości, dni bez zajęć, z wieloma slotami, filtry graniczne (0/1/duże wartości), wolna sieć.
10. Ewentualne optymalizacje: memoizacja selektorów, anulowanie żądań przy unmount, ograniczenie rerenderów (klucze listy po `dto.id`).

### Załączniki (odniesienia)
- PRD: dni obozowe i overview; metryki po stronie UI lub dedykowane pola.
- Endpointy: `GET /api/groups/{group_id}/camp-days`, `GET /api/camp-days/{camp_day_id}/schedules`.
- Typy: `CampDayDTO`, `ActivityScheduleDTO` w `src/types.ts`.


