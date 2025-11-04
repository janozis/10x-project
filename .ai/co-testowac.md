# Co Testować Unit Testami - Analiza Projektu 10x

**Data analizy:** 2025-11-04  
**Status:** Kompleksowa analiza gotowa do implementacji

---

## Spis Treści

1. [Podsumowanie Wykonawcze](#podsumowanie-wykonawcze)
2. [Kategorie Priorytetowe](#kategorie-priorytetowe)
3. [Szczegółowa Analiza](#szczegółowa-analiza)
4. [Co NIE Wymaga Unit Testów](#co-nie-wymaga-unit-testów)
5. [Plan Implementacji](#plan-implementacji)
6. [Metryki i Cele](#metryki-i-cele)

---

## Podsumowanie Wykonawcze

### Dlaczego Unit Testy są Ważne?

Unit testy w tym projekcie są kluczowe, ponieważ:
1. **Złożona logika biznesowa** - transformacje danych, walidacje, kalkulacje
2. **Real-time collaboration** - logika wykrywania konfliktów wymaga precyzji
3. **Integracja AI** - walidacja payloadów i odpowiedzi
4. **Kalkulacje czasowe** - harmonogramy, sloty, cooldowny wymagają dokładności
5. **Mapowania DTO→VM** - kluczowe dla separacji warstw

### Statystyki Projektu

- **Utility functions:** ~15 funkcji (większość już testowana w utils.test.ts)
- **Mappers:** 11 plików mapperów
- **Validation schemas:** 12 plików Zod schemas
- **Hooki z czystą logiką:** ~8-10 hooków
- **Services helpers:** ~5-8 helper functions

### Priorytetowa Kolejność

| Priorytet | Obszar | Plików | Pokrycie Obecne | Cel |
|-----------|--------|---------|-----------------|-----|
| 🔴 P0 | Utility Functions | 2 | 50% | 100% |
| 🔴 P0 | Time Calculations | 1 | 0% | 100% |
| 🟡 P1 | Mappers | 11 | 0% | 80% |
| 🟡 P1 | Validation Helpers | 12 | 0% | 60% |
| 🟢 P2 | Error Factories | 1 | 0% | 50% |
| 🟢 P2 | Business Logic Helpers | 5-8 | 0% | 70% |

---

## Kategorie Priorytetowe

### 🔴 Priorytet P0 - KRYTYCZNE (Testy Natychmiast)

Elementy, które **muszą** być testowane, bo błędy mogą powodować poważne problemy.

#### 1. Time Calculations (`src/lib/camp-days/types.ts`)

**Dlaczego testować:**
- Kalkulacje czasowe są podstawą harmonogramów
- Błędy mogą prowadzić do konfliktów w rozkładzie dnia
- Używane przez wiele komponentów i serwisów
- Podatne na edge cases (północ, przejście przez dni)

**Funkcje do przetestowania:**
```typescript
✅ minutesBetween(start: TimeHHMM, end: TimeHHMM): number
✅ isValidTimeString(value: string): boolean
✅ addMinutes(time: TimeHHMM, minutes: number): TimeHHMM
```

**Scenariusze testowe:**
- ✅ Normalne przypadki: "09:00" → "10:30" = 90 minut
- ✅ Przejście przez godzinę: "23:45" + 30 minut = "00:15" lub limit "23:59"
- ✅ Walidacja formatu: "25:00", "12:60", "9:00" (bez zera)
- ✅ Edge cases: ujemne minuty, przekroczenie limitu
- ✅ Graniczne wartości: "00:00", "23:59"

**Szacowany czas:** 2-3 godziny  
**Pliki testowe:** `src/lib/camp-days/types.test.ts`

---

#### 2. Cursor Encoding/Decoding (`src/lib/utils.ts`)

**Dlaczego testować:**
- Używane w infinite scroll (paginacja)
- Błędne enkodowanie = broken pagination
- Już częściowo przetestowane w `utils.test.ts`

**Status:** ✅ Już przetestowane (linie 38-106 w utils.test.ts)

**Funkcje:**
```typescript
✅ encodeActivityCursor(created_at, id)
✅ parseActivityCursor(cursor)
✅ nextActivityCursorFromPage(rows)
✅ encodeGroupCursor, parseGroupCursor, nextGroupCursorFromPage
```

**Akcja:** Utrzymać obecne testy, rozważyć dodanie edge cases.

---

#### 3. Retry-After Parsing (`src/lib/utils.ts`)

**Dlaczego testować:**
- Obsługa rate limitingu API (OpenRouter, Supabase)
- Błędne parsowanie = niepoprawne cooldowny
- Krytyczne dla AI evaluation flow

**Status:** ✅ Już przetestowane (linie 108-151 w utils.test.ts)

**Funkcja:**
```typescript
✅ parseRetryAfter(value: string | null): number | null
```

**Akcja:** Testy są kompletne.

---

### 🟡 Priorytet P1 - WAŻNE (Testy w Pierwszej Kolejności)

#### 4. Mappers (`src/lib/mappers/*.mapper.ts`)

**Dlaczego testować:**
- **Separacja warstw** - mapowanie DTO→VM jest kluczowe dla architektury
- **Transformacje danych** - błędy mogą psuć UI
- **Edge cases** - null/undefined, brakujące pola, niepoprawne typy
- **Reużywalność** - mappery używane w wielu miejscach

**Lista mapperów do przetestowania:**

##### 4.1 `activity.mapper.ts` - `mapActivityRow()`

**Dlaczego:** Główny mapper aktywności, używany wszędzie.

**Scenariusze:**
- ✅ Poprawne mapowanie wszystkich pól
- ✅ Puste/null wartości w opcjonalnych polach
- ✅ Edytorzy: pusta lista vs lista z edytorami
- ✅ AI evaluation: null vs obiekt z scores
- ✅ deleted_at: null vs timestamp

**Złożoność:** Średnia  
**Czas:** 1-2 godziny  
**Plik:** `src/lib/mappers/activity.mapper.test.ts`

---

##### 4.2 `dashboard.mapper.ts` - `mapDashboardStatsToDTO()`

**Dlaczego:** Złożona logika - tworzy zdarzenia created/updated, sortuje, limituje.

**Scenariusze:**
- ✅ Tworzenie zdarzeń "activity_created"
- ✅ Tworzenie "activity_updated" tylko gdy updated_at ≠ created_at
- ✅ Sortowanie po timestamp DESC
- ✅ Limitowanie do 10 zdarzeń
- ✅ Pusta lista aktywności
- ✅ Null wartości w statystykach

**Złożoność:** Wysoka  
**Czas:** 2-3 godziny  
**Plik:** `src/lib/mappers/dashboard.mapper.test.ts`

---

##### 4.3 `dashboard-tiles.mapper.ts` - `mapDashboardToTilesVM()` + `clamp01()`

**Dlaczego:** Helper `clamp01()` wymaga testów, mapowanie do VM dla UI.

**Scenariusze:**
- ✅ `clamp01()`: wartości < 0, > 1, w zakresie
- ✅ Mapowanie uprawnień (permissions)
- ✅ Kalkulacja procentów z NaN/null
- ✅ can_create_activities logic

**Złożoność:** Niska-Średnia  
**Czas:** 1 godzina  
**Plik:** `src/lib/mappers/dashboard-tiles.mapper.test.ts`

---

##### 4.4 `ai-evaluation.mapper.ts` - `mapAIEvaluationRow()`

**Dlaczego:** Filtrowanie suggestions (array), walidacja typów.

**Scenariusze:**
- ✅ Poprawna lista suggestions (string[])
- ✅ Filtrowanie niepoprawnych typów w suggestions
- ✅ Suggestions jako null/undefined
- ✅ Puste suggestions array

**Złożoność:** Niska  
**Czas:** 30 minut  
**Plik:** `src/lib/mappers/ai-evaluation.mapper.test.ts`

---

##### 4.5 Pozostałe mappery (niższy priorytet)

Te mappery są prostsze (głównie 1:1 mapowanie) ale warto je pokryć:

- `permissions.mapper.ts` - `mapPermissionsRowToDTO()`
- `group-membership.mapper.ts` - `mapMembershipRowToDTO()`
- `group.mapper.ts` - `mapGroupRowToDTO()`
- `camp-day.mapper.ts` - `mapCampDayRowToDTO()`
- `activity-schedule.mapper.ts` - `mapActivityScheduleRowToDTO()`
- `group-task.mapper.ts` - `mapGroupTaskRow()`
- `activity-editor.mapper.ts` - `toActivityEditorDTO()`

**Złożoność:** Niska  
**Czas:** 2-3 godziny łącznie  
**Pliki:** Jeden test file per mapper

**Scenariusze (ogólne):**
- ✅ Poprawne mapowanie wszystkich pól
- ✅ Type casting (as UUID, as Role)
- ✅ Optional fields (null/undefined handling)

---

#### 5. Validation Schemas - Helper Logic (`src/lib/validation/*.ts`)

**Dlaczego testować:**
- **Walidacja Zod** - sama w sobie jest testowana przez Zod
- **Custom logic** - superRefine, custom validators wymagają testów
- **Edge cases** - granice limitów, regex patterns

**Co testować:**

##### 5.1 `group.ts` - Date Range Validation

**Dlaczego:** Custom superRefine sprawdza end_date >= start_date.

**Scenariusze:**
```typescript
✅ groupCreateSchema.parse({ end_date >= start_date }) // SUCCESS
✅ groupCreateSchema.parse({ end_date < start_date })  // FAIL
✅ Niepoprawny format daty (regex validation)
✅ Granice max_members (1, 500, 0, 501)
```

**Plik:** `src/lib/validation/group.test.ts`  
**Czas:** 1 godzina

---

##### 5.2 `auth.ts` - Password Validation & Confirmation

**Dlaczego:** Złożone regex rules, confirmPassword refine.

**Scenariusze:**
```typescript
✅ registerSchema - password min 8 chars
✅ Password regex rules (lowercase, uppercase, digit, no spaces)
✅ confirmPassword !== password (refine)
✅ Edge cases: spacje wewnątrz hasła, emoji
```

**Plik:** `src/lib/validation/auth.test.ts`  
**Czas:** 1-1.5 godziny

---

##### 5.3 `activity.ts` - Helper `nonEmptyTrimmed()`

**Dlaczego:** Reużywalny helper, trimming logic.

**Scenariusze:**
```typescript
✅ nonEmptyTrimmed() - trim spaces
✅ Min/max length
✅ Empty string after trim
```

**Plik:** `src/lib/validation/activity.test.ts`  
**Czas:** 30 minut

---

##### 5.4 `campDay.ts` - Day Number Validation

**Dlaczego:** day_number ma logiczne ograniczenia (1-365).

**Scenariusze:**
```typescript
✅ day_number granice (1, 365, 0, 366)
✅ Date format validation
```

**Plik:** `src/lib/validation/campDay.test.ts`  
**Czas:** 30 minut

---

##### 5.5 Pozostałe validation (opcjonalne)

- `activitySchedule.ts` - time format validation (HH:MM)
- `llm.ts` - role enum, content length
- `activityEditor.ts` - UUID validation

**Czas łącznie:** 1-2 godziny

---

### 🟢 Priorytet P2 - UŻYTECZNE (Testy po P0/P1)

#### 6. Error Factories (`src/lib/errors.ts`)

**Dlaczego testować:**
- **Konsystencja API errors** - struktura odpowiedzi
- **Typowanie** - sprawdzenie, czy error codes są poprawne
- **Details merging** - opcjonalne detale

**Co testować:**

```typescript
✅ errors.validation() - structure + details
✅ errors.unauthorized() - brak details
✅ errors.groupLimitReached() - details z current/limit
✅ errors.conflict() - custom message + details
```

**Scenariusze:**
- ✅ Każdy factory zwraca poprawną strukturę `{ error: { code, message, details? } }`
- ✅ Error codes są poprawne (TypeScript enum)
- ✅ Details są poprawnie przekazywane

**Plik:** `src/lib/errors.test.ts`  
**Czas:** 1-1.5 godziny

---

#### 7. Business Logic Helpers

##### 7.1 `src/lib/services/*.service.ts` - Helper Functions

**Dlaczego testować:** Jeśli serwisy mają **pure functions** (nie async, bez DB), warto je testować.

**Przykłady:**

**`group-memberships.service.ts` - `isUUID()`**
```typescript
✅ isUUID('123e4567-e89b-12d3-a456-426614174000') // true
✅ isUUID('not-a-uuid') // false
✅ isUUID('') // false
```

**`dashboard.service.ts` - `isUUID()`** (duplikat - rozważyć refactor)

**`camp-days.service.ts` - `forbidden()`, `notFound()`**  
Helpers do errors - mogą być testowane jako część error factories.

**Plik:** `src/lib/services/helpers.test.ts` (opcjonalnie)  
**Czas:** 30 minut - 1 godzina

---

##### 7.2 `src/lib/groups/mappers.ts` - `mapGroupToCardVM()`

**Dlaczego:** Mapowanie dla UI, używane w GroupsView.

**Scenariusze:**
- ✅ Poprawne mapowanie pól
- ✅ deleted_at: null vs timestamp
- ✅ Kalkulacja isArchived

**Plik:** `src/lib/groups/mappers.test.ts`  
**Czas:** 30 minut

---

##### 7.3 `src/lib/camp-days/types.ts` - `mapScheduleToSlotVM()`

**Dlaczego:** Mapowanie Schedule→SlotVM.

**Scenariusze:**
- ✅ Poprawne mapowanie
- ✅ canEdit flag

**Plik:** Dodać do `src/lib/camp-days/types.test.ts`  
**Czas:** 15 minut

---

#### 8. HTTP Utilities (`src/lib/http/*.ts`)

##### 8.1 `response.ts` - `jsonResponse()`

**Dlaczego:** Wrapper dla Response, ustawia headers.

**Scenariusze:**
```typescript
✅ jsonResponse({data: 'test'}) - headers, body
✅ Custom status code
✅ Merge custom headers
```

**Plik:** `src/lib/http/response.test.ts`  
**Czas:** 30 minut

---

##### 8.2 `status.ts` - HTTP Status Constants

**Dlaczego:** Jeśli są tylko konstanty, nie wymaga testów. Jeśli są helpers (np. `isSuccessStatus()`), testować.

**Akcja:** Sprawdzić zawartość, testować tylko jeśli są funkcje.

---

#### 9. Custom Hooks - Czysta Logika (selektywnie)

**Dlaczego testować hooki:**
- **Hooks z czystą logiką** (bez side effects) - dobre kandydaty
- **Hooks z React state** - lepiej integration tests
- **Hooks z API calls** - mockowalne, ale średni priorytet

**Kandydaci do testów:**

##### 9.1 `useCooldown.ts` (src/lib/activities/)

**Dlaczego:** Kalkulacje czasowe cooldownu dla AI evaluations.

**Co testować:**
- ✅ Cooldown aktywny/nieaktywny
- ✅ Kalkulacja remaining time
- ✅ Edge cases: przyszłość, przeszłość

**Plik:** `src/lib/activities/useCooldown.test.ts`  
**Czas:** 1 godzina  
**Narzędzie:** React Testing Library + `renderHook()`

---

##### 9.2 `useDebouncedValue.ts` (src/lib/hooks/)

**Dlaczego:** Debouncing logic, używany w autosave.

**Co testować:**
- ✅ Wartość nie zmienia się przed delay
- ✅ Wartość zmienia się po delay
- ✅ Multiple updates - only last matters

**Plik:** `src/lib/hooks/useDebouncedValue.test.ts`  
**Czas:** 1 godzina  
**Narzędzie:** React Testing Library + `renderHook()` + `waitFor()`

---

##### 9.3 `useColumnPreferences.ts` (src/lib/groups/)

**Dlaczego:** LocalStorage logic, można mockować.

**Priorytet:** Niski - localStorage trudny do testowania w unit testach.

---

##### 9.4 Pozostałe hooki

**Nie testować unit testami:**
- Hooki z API calls (`useGroups`, `useActivity`) - integration tests
- Hooki z Realtime (`useRealtimeCampDay`) - e2e tests
- Hooki z React state (`useState`, `useEffect`) - integration tests

---

## Co NIE Wymaga Unit Testów

### ❌ Komponenty UI (React/Astro)

**Dlaczego nie:**
- **Integration tests** są lepsze (Vitest + React Testing Library)
- **E2E tests** pokrywają user flows (Playwright)
- Unit testy komponentów są kruche (zmiany w DOM)

**Komponenty:** ActivitiesTable, CampDayView, GroupsView, etc.

**Akcja:** Pokryć integration testami w przyszłości.

---

### ❌ API Clients (`*.client.ts`)

**Dlaczego nie:**
- **Mocked fetch** - trudne do utrzymania
- **Integration tests** z API są lepsze
- **E2E tests** pokrywają cały flow

**Pliki:** `src/lib/activities/api.client.ts`, `src/lib/groups/api.client.ts`, etc.

**Akcja:** Pokryć e2e testami (Playwright).

---

### ❌ Services z Heavy DB Logic (`*.service.ts`)

**Dlaczego nie:**
- **Supabase interactions** - wymagają mockowania DB
- **Integration tests** z testową bazą są lepsze
- **Złożone queries** - trudne do mockowania

**Pliki:** `activities.service.ts`, `groups.service.ts`, `camp-days.service.ts`

**Wyjątek:** Pure helper functions w serwisach (jak `isUUID()`) - TESTOWAĆ.

**Akcja:** Pokryć integration testami z test DB (opcjonalnie).

---

### ❌ Middleware & Astro Internals

**Dlaczego nie:**
- **Astro middleware** - e2e tests są lepsze
- **Routing** - e2e tests

**Plik:** `src/middleware/index.ts`

**Akcja:** Pokryć e2e testami (Playwright).

---

### ❌ Database Types & Auto-Generated Code

**Dlaczego nie:**
- **Generated types** (`database.types.ts`) - nie testować
- **Supabase client** - nie testować

**Pliki:** `src/db/database.types.ts`, `src/db/supabase.client.ts`

---

## Plan Implementacji

### Faza 1: Krytyczne (P0) - Tydzień 1

**Cel:** 100% pokrycia funkcji krytycznych.

| # | Zadanie | Plik | Czas | Status |
|---|---------|------|------|--------|
| 1 | Time calculations | `camp-days/types.test.ts` | 2-3h | ⏳ TODO |
| 2 | Rozszerzenie utils tests | `utils.test.ts` | 1h | ⏳ TODO |

**Deliverable:** 2 pliki testowe, ~50-70 test cases.

---

### Faza 2: Mappers (P1) - Tydzień 2-3

**Cel:** 80% pokrycia mapperów.

| # | Zadanie | Plik | Czas | Status |
|---|---------|------|------|--------|
| 3 | Activity mapper | `mappers/activity.mapper.test.ts` | 1-2h | ⏳ TODO |
| 4 | Dashboard mapper | `mappers/dashboard.mapper.test.ts` | 2-3h | ⏳ TODO |
| 5 | Dashboard tiles mapper | `mappers/dashboard-tiles.mapper.test.ts` | 1h | ⏳ TODO |
| 6 | AI evaluation mapper | `mappers/ai-evaluation.mapper.test.ts` | 30min | ⏳ TODO |
| 7 | Pozostałe mappery | `mappers/*.test.ts` | 2-3h | ⏳ TODO |

**Deliverable:** 11 plików testowych, ~100-150 test cases.

---

### Faza 3: Validation (P1) - Tydzień 3-4

**Cel:** 60% pokrycia validation logic.

| # | Zadanie | Plik | Czas | Status |
|---|---------|------|------|--------|
| 8 | Group validation | `validation/group.test.ts` | 1h | ⏳ TODO |
| 9 | Auth validation | `validation/auth.test.ts` | 1-1.5h | ⏳ TODO |
| 10 | Activity validation | `validation/activity.test.ts` | 30min | ⏳ TODO |
| 11 | Camp day validation | `validation/campDay.test.ts` | 30min | ⏳ TODO |

**Deliverable:** 4 pliki testowe, ~40-60 test cases.

---

### Faza 4: Pomocnicze (P2) - Tydzień 4-5

**Cel:** Pokrycie error factories, helpers, hooków.

| # | Zadanie | Plik | Czas | Status |
|---|---------|------|------|--------|
| 12 | Error factories | `errors.test.ts` | 1-1.5h | ⏳ TODO |
| 13 | Business helpers | `services/helpers.test.ts` | 1h | ⏳ TODO |
| 14 | HTTP utilities | `http/response.test.ts` | 30min | ⏳ TODO |
| 15 | useCooldown hook | `activities/useCooldown.test.ts` | 1h | ⏳ TODO |
| 16 | useDebouncedValue | `hooks/useDebouncedValue.test.ts` | 1h | ⏳ TODO |

**Deliverable:** 5 plików testowych, ~50-70 test cases.

---

## Metryki i Cele

### Metryki Coverage (Docelowe)

| Kategoria | Obecne | Cel | Priorytet |
|-----------|--------|-----|-----------|
| **Utilities** | ~50% | **100%** | P0 |
| **Mappers** | 0% | **80%** | P1 |
| **Validation** | 0% | **60%** | P1 |
| **Errors** | 0% | **50%** | P2 |
| **Helpers** | 0% | **70%** | P2 |
| **Hooks (pure)** | 0% | **60%** | P2 |
| **TOTAL** | ~5% | **65-75%** | - |

---

### Szacowany Czas Implementacji

- **Faza 1 (P0):** 3-4 godziny
- **Faza 2 (P1 - Mappers):** 6-9 godzin
- **Faza 3 (P1 - Validation):** 3-4 godziny
- **Faza 4 (P2):** 5-6 godzin

**TOTAL:** ~17-23 godziny czystego kodowania (2-3 tygodnie z innymi zadaniami).

---

### Korzyści z Implementacji

1. **Szybsze debugowanie** - testy wychwycą błędy przed produkcją
2. **Refactoring confidence** - można śmiało zmieniać kod
3. **Dokumentacja** - testy są living documentation
4. **Mniejsze ryzyko regresji** - CI/CD wychwytuje błędy
5. **Onboarding** - nowi devs uczą się z testów

---

## Narzędzia i Setup

### Stack Testowy

- **Framework:** Vitest (już skonfigurowany)
- **Testing Library:** React Testing Library (dla hooków)
- **Mocking:** Vitest built-in mocks
- **Coverage:** Vitest coverage (c8/istanbul)

### Przykładowa Struktura Testu

```typescript
// src/lib/camp-days/types.test.ts
import { describe, it, expect } from 'vitest';
import { minutesBetween, isValidTimeString, addMinutes } from './types';

describe('camp-days/types - Time Calculations', () => {
  describe('minutesBetween', () => {
    it('should calculate minutes between same hour', () => {
      expect(minutesBetween('09:00', '09:30')).toBe(30);
    });

    it('should calculate minutes across hours', () => {
      expect(minutesBetween('09:45', '11:15')).toBe(90);
    });

    it('should handle overnight (if supported)', () => {
      // Edge case: czy funkcja wspiera przejście przez północ?
      // Jeśli nie - test powinien pokazać ograniczenie
      expect(minutesBetween('23:00', '01:00')).toBe(/* expected */);
    });
  });

  describe('isValidTimeString', () => {
    it('should validate correct time format', () => {
      expect(isValidTimeString('09:00')).toBe(true);
      expect(isValidTimeString('23:59')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidTimeString('9:00')).toBe(false);
      expect(isValidTimeString('25:00')).toBe(false);
      expect(isValidTimeString('12:60')).toBe(false);
    });
  });

  describe('addMinutes', () => {
    it('should add minutes within same hour', () => {
      expect(addMinutes('09:00', 30)).toBe('09:30');
    });

    it('should handle hour overflow', () => {
      expect(addMinutes('09:45', 30)).toBe('10:15');
    });

    it('should clamp at day boundaries', () => {
      expect(addMinutes('23:30', 60)).toBe('23:59'); // lub '00:30' jeśli wspiera overnight
    });
  });
});
```

---

## Wnioski i Rekomendacje

### Najważniejsze Wnioski

1. **Już mamy dobry start** - `utils.test.ts` pokazuje, że team wie jak pisać testy
2. **Mappers są kluczowe** - separacja warstw wymaga testów transformacji
3. **Time calculations** - najbardziej krytyczne, MUSZĄ być testowane
4. **Validation** - custom logic w Zod schemas wymaga testów
5. **Hooks** - tylko pure logic, reszta to integration tests

### Rekomendacje

1. **Start z P0** - time calculations i rozszerzenie utils tests
2. **Mappers next** - największa wartość dla least effort
3. **Validation** - po mapperach, bo używają mapped types
4. **P2 opcjonalnie** - jeśli zostanie czas po P0/P1
5. **CI/CD** - dodać coverage threshold (np. min 60%)
6. **Pre-commit hook** - uruchamiać testy przed commitem

### Ostrzeżenia

1. **Nie testować UI** - to nie jest zadanie unit testów
2. **Nie mockować DB** - lepsze są integration tests
3. **Nie over-testować** - 100% coverage ≠ dobre testy
4. **Testować behavior, nie implementation** - testy muszą przetrwać refactoring

---

## Następne Kroki

### Akcje Natychmiastowe

1. ✅ Przeczytać ten dokument i zaakceptować plan
2. ⏳ Utworzyć branch `feature/unit-tests-phase-1`
3. ⏳ Zacząć od `camp-days/types.test.ts`
4. ⏳ PR review po każdej fazie
5. ⏳ Monitorować coverage w CI/CD

### Długoterminowe

- **Integration tests** - komponenty + API (React Testing Library)
- **E2E tests** - user flows (Playwright - już rozpoczęte)
- **Performance tests** - jeśli będą problemy z wydajnością
- **Visual regression tests** - opcjonalnie dla UI

---

**Dokument stworzony:** 2025-11-04  
**Autor:** AI Analysis  
**Status:** Ready for Implementation ✅

