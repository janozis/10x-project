## Podsumowanie prac: widok „Szczegóły aktywności”

### Zakres
- Dodano stronę widoku szczegółów aktywności (`/activities/{id}`) z renderowaniem klientowym (CSR) w Astro.
- Zaimplementowano strukturę komponentów React zgodną z planem: nagłówek, sekcja pól, panel AI (podsumowanie + timeline), lista edytorów, pasek akcji, licznik cooldownu.
- Zintegrowano 4 endpointy API (aktywność, edytorzy, oceny AI, uprawnienia) + POST do zlecenia oceny AI.
- Dodano obliczenia stanu widoku: uprawnienia („canEdit/canRequestEvaluation”), „stale evaluation”, cooldown.
- Poprawiono UX/A11y: czytelne skeletony, banery błędów (401/403/404), podpowiedzi (title) dla zablokowanych akcji, subtelne wskazówki uprawnień.
- Usprawniono flow żądania oceny AI: lekkie wielokrotne odświeżanie po 202 (polling w czasie).

### Utworzone pliki
- `src/pages/activities/[activity_id].astro` – strona Astro montująca widok.
- `src/components/activities/details/ActivityDetailsView.tsx`
- `src/components/activities/details/ActivityHeader.tsx`
- `src/components/activities/details/ActivityFieldsSection.tsx`
- `src/components/activities/details/EditorsList.tsx`
- `src/components/activities/details/AIEvaluationPanel.tsx`
- `src/components/activities/details/AIEvaluationSummary.tsx`
- `src/components/activities/details/AIEvaluationTimeline.tsx`
- `src/components/activities/details/ActionsBar.tsx`
- `src/components/activities/details/Countdown.tsx`
- `src/lib/activities/useActivityDetails.ts`
- `src/lib/activities/useAIEvaluationRequest.ts`
- `src/lib/activities/useCooldown.ts`

### Zmodyfikowane pliki
- `src/lib/activities/api.client.ts` – dodano: `listActivityEditors`, `listActivityAIEvaluations`, `requestActivityAIEvaluation`.

### Integracja API (GET/POST)
- `GET /api/activities/{activity_id}` – dane aktywności.
- `GET /api/activities/{activity_id}/editors` – lista edytorów.
- `GET /api/activities/{activity_id}/ai-evaluations` – lista ocen AI (najnowsze pierwsze).
- `GET /api/groups/{group_id}/permissions` – uprawnienia użytkownika w grupie.
- `POST /api/activities/{activity_id}/ai-evaluations` – zlecenie oceny AI (202 z `next_poll_after_sec`).

### Interakcje użytkownika
- Przycisk „Edytuj” (gating uprawnień; przygotowany link do `/activities/{id}/edit`).
- Przycisk „Poproś o ocenę AI” (gating + cooldown; po 202 następuje lekkie wielokrotne odświeżenie listy ocen).
- Licznik cooldownu (MM:SS, aria-live="polite").

### Zarządzanie stanem
- `useActivityDetails(activityId)`
  - Równoległe pobranie: aktywność → (group_id) → edytorzy, oceny AI, uprawnienia.
  - Obliczenia: `latestEvaluation`, `isEvaluationStale`, `canEdit`, `canRequestEvaluation`, `cooldownRemainingSec`.
  - Zwraca: `vm`, `loading`, `error`, `errorCode`, `errorStatus`, `refresh()`.
- `useAIEvaluationRequest(activityId)`
  - `request()` → POST → wielokrotne `refresh()` po `next_poll_after_sec`.
- `useCooldown(startTimestamp, windowSec=300)` – proste odliczanie.

### UX/A11y i błędy
- Baner błędów nad treścią: 401 (z linkiem „Zaloguj się”), 403 („Brak uprawnień”), 404 („Nie znaleziono aktywności”).
- Skeletony w nagłówku, polach, edytorach, panelu AI i timeline.
- Podpowiedzi (title) na zablokowanych przyciskach + subtelne komunikaty tekstowe pod paskiem akcji.

### Wydajność
- Ograniczono obciążenie: pobranie danych w 2 krokach (najpierw aktywność dla group_id, potem reszta równolegle).
- Brak globalnego store (MVP); lokalny stan + hooki, lekki polling po POST.

### Testy manualne (checklista)
1. Wejdź na `/activities/{id}` – zobacz skeletony, potem treść.
2. Sprawdź 401 → przekierowanie ręczne do „/login” przez link w banerze.
3. Sprawdź 403/404 – poprawne komunikaty.
4. Brak ocen AI – czytelny stan pusty; po żądaniu oceny pojawia się timeline.
5. Cooldown – przycisk zablokowany, licznik MM:SS, po 0 przycisk aktywny.
6. Gating uprawnień – „Edytuj” oraz „Poproś o ocenę AI” zablokowane/gotowe zgodnie z rolą.

### Otwarta przestrzeń / następne kroki
- „Pokaż więcej” w timeline (klienckie stronicowanie) i ewentualny link do pełnej historii.
- Opcjonalne głębokie linki do konkretnej wersji oceny (MVP+1).
- Testy jednostkowe dla `useActivityDetails` i `useAIEvaluationRequest` (scenariusze uprawnień, cooldown, retry/polling).

### Zgodność z zasadami
- Astro 5 (CSR dla strony), React 19 (komponenty funkcyjne), TypeScript 5.
- Tailwind 4 + komponenty shadcn/ui (Button, Card, Badge).
- Logika domenowa w hookach w `src/lib`, API w `api.client.ts`, a UI w `src/components`.


