# Diagnoza problemu z wyświetlaniem aktywności

## Problem
API działa poprawnie (curl zwraca 6 aktywności), ale frontend nie wyświetla listy.

## Możliwe przyczyny

### 1. Problem z parsowaniem odpowiedzi w fetchJson
- Sprawdź logi `[fetchJson]` w konsoli przeglądarki
- Sprawdź czy `Content-Type` header jest prawidłowy
- Sprawdź czy `body` jest prawidłowo sparsowany

### 2. Problem z typami TypeScript
- Sprawdź czy `res.data` jest tablicą w logach `[useInfiniteActivities]`
- Sprawdź czy `items.length` jest większe od 0 w logach `[ActivitiesListShell]`

### 3. Problem z warunkowym renderowaniem
- Sprawdź czy `loadingList` jest `false`
- Sprawdź czy `listError` jest `undefined`
- Sprawdź czy `items.length > 0`

### 4. Problem z CORS
- Sprawdź czy nie ma błędów CORS w konsoli
- Sprawdź Network tab w DevTools

## Kroki diagnostyczne

1. **Otwórz konsolę przeglądarki** (F12 → Console)
2. **Odśwież stronę** (`http://localhost:3000/groups/b12b5eef-70d0-427a-88c1-aed3cd8cc0b5/activities`)
3. **Sprawdź logi**:
   - `[fetchJson] Response headers:` - powinien pokazać `Content-Type: application/json`
   - `[fetchJson] Raw response text:` - powinien pokazać surowy JSON
   - `[fetchJson] Parsed body:` - powinien pokazać sparsowany obiekt z `data: Array(6)`
   - `[useInfiniteActivities] Response:` - powinien pokazać `dataLength: 6`
   - `[ActivitiesListShell] State:` - powinien pokazać `itemsLength: 6`

4. **Sprawdź Network tab**:
   - Znajdź request do `/api/groups/[group_id]/activities`
   - Sprawdź Response - powinien zawierać JSON z 6 aktywnościami
   - Sprawdź Response Headers - powinien mieć `Content-Type: application/json`

5. **Sprawdź czy są błędy** w konsoli:
   - Błędy JavaScript
   - Błędy CORS
   - Błędy parsowania JSON

## Jeśli wszystko wygląda dobrze w logach

Sprawdź czy problem nie jest w renderowaniu:
- Otwórz React DevTools
- Sprawdź komponent `ActivitiesListShell`
- Sprawdź prop `items` - czy zawiera 6 elementów?
- Sprawdź czy warunek `items.length === 0` jest prawdziwy

## Najczęstsze problemy

1. **Content-Type header nie jest ustawiony** - endpoint powinien zwracać `Content-Type: application/json`
2. **Odpowiedź jest pusta** - sprawdź czy endpoint rzeczywiście zwraca dane
3. **TypeScript type guard** - sprawdź czy `"error" in res` nie zwraca `true` dla prawidłowej odpowiedzi
4. **State nie jest aktualizowany** - sprawdź czy `setState` jest wywoływany

