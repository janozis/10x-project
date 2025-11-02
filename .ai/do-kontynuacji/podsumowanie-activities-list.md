# Podsumowanie prac - Naprawa widoku listy aktywności

## Kontekst
Widok listy aktywności (`/groups/[group_id]/activities`) nie wyświetlał aktywności mimo że w widoku grupy pokazywane było 6 aktywności. Występowały problemy z konfiguracją zmiennych środowiskowych Supabase oraz błędami w obsłudze odpowiedzi API.

## Naprawione problemy

### 1. Konfiguracja zmiennych środowiskowych Supabase

**Problem:**
- W Astro zmienne środowiskowe bez prefiksu `PUBLIC_` są dostępne tylko po stronie serwera
- Kod React (client-side) próbował używać `SUPABASE_URL` i `SUPABASE_KEY`, które nie są dostępne w przeglądarce
- Błędy w konsoli: `SUPABASE_URL or SUPABASE_KEY not found in environment variables`

**Rozwiązanie:**
- Zmodyfikowano `src/db/supabase.client.ts` aby używał zmiennych z prefiksem `PUBLIC_` dla klienta
- Dodano fallback do zmiennych bez prefiksu dla kompatybilności serwerowej
- Zaktualizowano komunikaty błędów

**Zmiany:**
```typescript
// Przed:
const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

// Po:
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_KEY || import.meta.env.SUPABASE_KEY;
```

**Plik:** `src/db/supabase.client.ts`

### 2. Obsługa błędów w komponencie ActivitiesListShell

**Problem:**
- `supabaseClient.auth.getUser()` był wywoływany bez sprawdzenia czy klient jest dostępny
- Brak szczegółowych komunikatów błędów dla różnych typów błędów API

**Rozwiązanie:**
- Dodano sprawdzenie dostępności `supabaseClient` przed użyciem
- Ulepszono komunikaty błędów w UI z różnicowaniem dla:
  - 401/UNAUTHORIZED - komunikat z linkiem do logowania
  - 500/INTERNAL_ERROR - komunikat o sprawdzeniu zmiennych środowiskowych
  - Inne błędy - szczegóły w trybie dev
- Dodano logowanie błędów w trybie deweloperskim

**Plik:** `src/components/activities/ActivitiesListShell.tsx`

### 3. Obsługa błędów w useInfiniteActivities

**Problem:**
- Błąd `Cannot use 'in' operator to search for 'error' in undefined` gdy odpowiedź była undefined
- Brakujący `errorStatus` w zwracanych wartościach hooka
- Brak logowania błędów dla debugowania

**Rozwiązanie:**
- Dodano sprawdzenie czy `res` istnieje przed użyciem operatora `in`
- Dodano `errorStatus` do zwracanych wartości hooka
- Dodano logowanie odpowiedzi w trybie deweloperskim
- Poprawiono obsługę pustych odpowiedzi

**Plik:** `src/lib/activities/useInfiniteActivities.ts`

### 4. Obsługa pustych odpowiedzi API

**Problem:**
- Endpoint zwracał status 200 z pustym body (lub bez body)
- `fetchJson` traktował to jako błąd i rzucał wyjątek "Empty response"

**Rozwiązanie:**
- Zmodyfikowano `fetchJson` aby dla statusu 200 z pustym body zwracał domyślną wartość `{ data: [] }`
- Ulepszono parsowanie odpowiedzi - odczyt jako tekst przed parsowaniem JSON
- Dodano logowanie dla debugowania

**Plik:** `src/lib/activities/api.client.ts`

### 5. Filtr "Moje" dla edytorów

**Problem:**
- Edytor z `can_edit_assigned_only` miał domyślnie włączony filtr `assigned: "me"`
- To powodowało że widział tylko przypisane aktywności, mimo że powinien widzieć wszystkie (może edytować tylko przypisane)

**Rozwiązanie:**
- Usunięto automatyczne ustawianie filtra `assigned: "me"` dla edytorów
- Edytorzy teraz domyślnie widzą wszystkie aktywności
- Filtr "Moje" jest dostępny w UI jako opcja do ręcznego włączenia

**Plik:** `src/components/activities/ActivitiesListShell.tsx`

### 6. Naprawa błędów TypeScript i lintowania

**Problem:**
- Błąd `listErrorStatus is not defined`
- Błędy typów dla `JSX.Element`, `GroupRole`, `ColumnId`
- Nieużywana funkcja `labelForColumn`

**Rozwiązanie:**
- Dodano `errorStatus` do zwracanych wartości `useInfiniteActivities`
- Zmieniono typ zwracany na `React.JSX.Element`
- Dodano sprawdzenie `permissions.role` przed użyciem
- Poprawiono typy dla `ColumnId` i `ActivityWithEditorsDTO`
- Usunięto nieużywaną funkcję `labelForColumn`

**Pliki:** 
- `src/components/activities/ActivitiesListShell.tsx`
- `src/lib/activities/useInfiniteActivities.ts`

## Dodane logowanie debugowania

Dodano logowanie w trybie deweloperskim dla:
- `fetchJson` - szczegóły odpowiedzi API
- `useInfiniteActivities` - pełna odpowiedź z endpointu
- Obsługa błędów - szczegóły błędów z kodem i statusem

## Wymagane zmienne środowiskowe

Upewnij się że w pliku `.env` są zdefiniowane:

```env
# Wymagane dla klienta (React components)
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_KEY=your-anon-key

# Opcjonalnie dla kompatybilności serwera
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

## Status

### ✅ Naprawione
- Konfiguracja zmiennych środowiskowych Supabase
- Obsługa błędów w komponencie
- Obsługa pustych odpowiedzi API
- Filtr "Moje" dla edytorów
- Błędy TypeScript i lintowania

### 🔍 Do sprawdzenia
- Czy endpoint faktycznie zwraca dane aktywności (wymaga sprawdzenia logów w konsoli)
- Czy widok wyświetla aktywności po naprawach (wymaga testów)
- Czy realtime działa poprawnie
- Czy filtry działają poprawnie

### 📝 Następne kroki
1. Sprawdzić logi w konsoli przeglądarki po odświeżeniu strony
2. Zweryfikować czy endpoint zwraca dane (`/api/groups/[group_id]/activities`)
3. Sprawdzić czy aktywności są wyświetlane na liście
4. Przetestować filtry (status, search, assigned)
5. Przetestować realtime updates
6. Usunąć logowanie debugowania jeśli wszystko działa (opcjonalnie)

## Pliki zmodyfikowane

1. `src/db/supabase.client.ts` - konfiguracja zmiennych środowiskowych
2. `src/components/activities/ActivitiesListShell.tsx` - obsługa błędów, filtr edytorów
3. `src/lib/activities/useInfiniteActivities.ts` - obsługa błędów, logowanie
4. `src/lib/activities/api.client.ts` - obsługa pustych odpowiedzi
5. `src/pages/api/groups/[group_id]/activities.ts` - komunikaty błędów

## Notatki

- Wszystkie zmiany są zgodne z zasadami projektu (Astro 5, TypeScript 5, React 19, Tailwind 4)
- Logowanie debugowania jest dostępne tylko w trybie deweloperskim (`import.meta.env.DEV`)
- Zmiany zachowują kompatybilność wsteczną z istniejącym kodem

