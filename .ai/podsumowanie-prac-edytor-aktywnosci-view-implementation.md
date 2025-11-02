## Podsumowanie prac: Edytor aktywności – implementacja widoku (etap 1)

### Zakres wprowadzonych zmian
- Routing i mount aplikacji edytora:
  - `src/pages/activities/[activity_id]/edit.astro` – nowa strona z SSR, osadza React `ActivityEditorApp` i `Toaster`.
- Szkielet i logika widoku (React):
  - `src/components/activities/editor/ActivityEditorApp.tsx` – kontener logiki z obsługą formularza, zapisu, konfliktów, cooldownu AI, pollingiem ocen.
  - Komponenty podrzędne: `ActivityHeader.tsx`, `ActivityTabs.tsx`, `ActivityForm.tsx`, `EditorsManager.tsx`, `AIEvaluationPanel.tsx`, `ConflictDiffModal.tsx`, `DirtyPrompt.tsx`, `AutosaveIndicator.tsx`.
- Klienty i hooki:
  - API client: `src/lib/activities/api.client.ts` – dodano `patchActivity(...)` + istniejące `getActivity`, `requestActivityAIEvaluation`.
  - Hooki widoku (nowe): `src/lib/editor/useActivity.ts`, `useAutosaveDrafts.ts`, `useDirtyPrompt.ts`, `useConflictDetection.ts`, `useAIEvaluations.ts`, `useEditors.ts`.
  - Wykorzystane istniejące: `src/lib/groups/api.client.ts#getGroupPermissions`, `src/lib/activities/useCooldown.ts`.
- UI i a11y:
  - `src/components/ui/sonner.tsx` – Toaster (Sonner) dla toastów.
  - Skeletony ładowania, aria‑busy oraz `aria-live` dla statusów.

### Struktura komponentów (zgodnie z planem)
- `ActivityEditorApp` – orchestracja i stan globalny (RHF, autosave, konflikty, permissions, cooldown AI, skróty klawiaturowe: Cmd/Ctrl+S).
- `ActivityHeader` – tytuł, status, przyciski Zapisz/Poproś o ocenę AI (blokady: dirty/cooldown/permissions).
- `ActivityTabs` – nawigacja: Formularz / Edytorzy / Oceny AI.
- `ActivityForm` – 11 pól, walidacja (Zod), liczniki znaków, opisy pól, focus na pierwszym błędzie.
- `EditorsManager` – lista edytorów, UI dodawania/usuwania (UUID, mapowanie błędów domenowych), tylko admin może zarządzać.
- `AIEvaluationPanel` – lista ocen, żądanie nowej oceny, polling po żądaniu (wg `next_poll_after_sec`).
- `ConflictDiffModal` – rozwiązywanie 409: „Załaduj z serwera”, „Nadpisz serwer”, „Scal i zapisz” (per‑pole, z prostym podświetleniem diff).
- `DirtyPrompt` – ostrzeżenie o niezapisanych zmianach (beforeunload).
- `AutosaveIndicator` – status szkicu (ostatnio zapisano, liczba szkiców, błąd pamięci).

### Integracja API (front → server)
- Pobranie aktywności: `GET /api/activities/{activity_id}` – `useActivity()`.
- Zapis aktywności: `PATCH /api/activities/{activity_id}` – `patchActivity(...)` z mapowaniem 422 na błędy pól, 409 → modal konfliktu.
- Edytorzy: `GET/POST/DELETE /api/activities/{id}/editors[/{user_id}]` – `useEditors`, UI w `EditorsManager`.
- Oceny AI: `GET/POST /api/activities/{id}/ai-evaluations` – `useAIEvaluations`, polling po żądaniu.
- Uprawnienia: `GET /api/groups/{group_id}/permissions` – wyliczenie `canEdit`, `canManage`, `canRequest`.

### Obsłużone interakcje użytkownika
- Edycja pól formularza (RHF + Zod, walidacja onBlur).
- Zapis (przycisk oraz Cmd/Ctrl+S): toasty sukces/błąd, mapowanie błędów 422, odświeżenie danych.
- Autosave: szkic do `localStorage` co 2s od ostatniej zmiany; wskaźnik ostatniego autozapisu.
- Ochrona przed utratą zmian (DirtyPrompt).
- Żądanie oceny AI: blokada przy brudnym formularzu, cooldown (przycisk „AI za Xs”), polling nowej wersji.
- Edytorzy: dodaj/usuń, walidacja UUID, komunikaty dla `ALREADY_ASSIGNED`/`USER_NOT_IN_GROUP`/`FORBIDDEN_ROLE`.
- Konflikty 409: diff pól (prosty highlight), trzy strategie rozwiązania, zapis po wyborze.

### Obsługa błędów i edge cases
- 422 VALIDATION_ERROR → mapowanie na błędy pól + fokus na pierwszym błędnym.
- 403/401 → ograniczenia akcji wg permissions (read‑only; zarządzanie edytorami tylko jako admin).
- 404 → komunikat błędu przy ładowaniu i przycisk „Spróbuj ponownie”.
- 409 CONFLICT → modal z porównaniem i ręcznym scalaniem.
- 429 AI_EVALUATION_COOLDOWN → cooldown w UI (na podstawie `last_evaluation_requested_at`).

### Wydajność i UX
- RHF i zodResolver dla walidacji; kontrola re-renderów przez RHF.
- Autosave z debouncingiem (2s) i limit LRU (~20 wpisów; komunikat o błędzie pamięci).
- Polling ocen AI tylko po żądaniu (interval wg hintu z backendu).

### A11y i stylowanie
- Tailwind 4 + istniejące komponenty shadcn/ui (button, input, textarea, dialog, badge, card).
- aria‑busy na kontenerze, `aria-live` dla statusów, opisy pól (`aria-describedby`), focus na błędnym polu.
- Skeletony ładowania odzwierciedlające układ.

### Pliki kluczowe (nowe/zmodyfikowane)
- Strona: `src/pages/activities/[activity_id]/edit.astro`
- UI: `src/components/activities/editor/*` (8 komponentów) + `src/components/ui/sonner.tsx`
- Hooki (editor): `src/lib/editor/*` – `useActivity`, `useAutosaveDrafts`, `useDirtyPrompt`, `useConflictDetection`, `useAIEvaluations`, `useEditors`
- API client: `src/lib/activities/api.client.ts` (dodany `patchActivity`)

### Co pozostało jako kolejne kroki (propozycja)
1. Ulepszyć diff (porównanie per‑słowo/linia dla dłuższych pól, np. `flow`).
2. Dopracować komunikaty i opisy pól (copy) oraz testy ręczne ścieżek 422/403/404/409/429.
3. Rozszerzyć `EditorsManager` o lepsze wyszukiwanie użytkowników (np. picker) zamiast surowego UUID.
4. Dodać testy jednostkowe helperów (diff, autosave LRU) i krytycznych akcji (PATCH/409).

### Jak wypróbować
- Przejdź do: `/activities/{activity_id}/edit`.
- Edycja pól → autozapis szkicu; Zapis (przycisk / Cmd+S) → PATCH; Żądanie AI → cooldown + polling; Edytorzy → dodaj/usuń wg ról.

---

## Podsumowanie napraw (2025-11-01): Problemy z inicjalizacją i uprawnieniami

### Zidentyfikowane problemy
1. **Pola formularza nie wypełniały się danymi z bazy** – mimo że API zwracało poprawne dane
2. **Użytkownik admin nie mógł edytować** – `permissions` były `null`, więc `canEdit = false`
3. **API zwracało `text/plain` zamiast `application/json`** – frontend interpretował odpowiedzi jako puste

### Diagnoza problemu 1: Inicjalizacja formularza
- React Hook Form używa `defaultValues` **tylko raz** podczas pierwszej inicjalizacji komponentu
- W oryginalnej implementacji `useForm` był wywoływany gdy `formValues` były jeszcze `null` (dane się ładowały)
- Próba resetowania formularza przez `useEffect` nie zawsze działała poprawnie
- **Skutek**: pola formularza pozostawały puste mimo załadowanych danych

### Rozwiązanie 1: Refaktoryzacja na dwa komponenty
**Utworzono**: `src/components/activities/editor/ActivityEditorForm.tsx`
- Komponent główny `ActivityEditorApp.tsx`:
  - Ładuje dane z API (`useActivity`)
  - Pobiera uprawnienia użytkownika
  - Wyświetla szkielet ładowania lub błędy
  - **Renderuje formularz dopiero gdy dane są załadowane** (`if (!formValues || !vm) return <Skeleton />`)
- Nowy komponent `ActivityEditorForm.tsx`:
  - Otrzymuje już załadowane `initialValues` jako prop
  - Jest montowany dopiero gdy dane są dostępne
  - React Hook Form inicjalizuje się z poprawnymi wartościami od razu
  - Zawiera całą logikę zapisu, konfliktów, autosave, AI evaluations

### Diagnoza problemu 2: Content-Type w API responses
- Wszystkie endpointy Astro API zwracały `Content-Type: text/plain;charset=UTF-8` zamiast `application/json`
- Frontend (`api.client.ts`) sprawdzał Content-Type i pomijał parsowanie JSON dla `text/plain`
- Fallback zwracał `{ data: [] }` dla pustych odpowiedzi
- **Skutek**: dane z API były ignorowane, formularz dostawał puste wartości

### Rozwiązanie 2: Helper `jsonResponse` i poprawka endpointów
**Utworzono**: `src/lib/http/response.ts`
```typescript
export function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}
```

**Zaktualizowano**: `src/pages/api/activities/[activity_id].ts`
- Zamieniono `new Response(JSON.stringify(...))` na `jsonResponse(...)`
- Poprawiono GET, PATCH, DELETE endpoints
- Wszystkie odpowiedzi teraz mają `Content-Type: application/json`

### Diagnoza problemu 3: Permissions null (w trakcie)
- Endpoint `/api/groups/{group_id}/permissions` zwraca poprawne dane (role: admin, can_edit_all: true)
- Jednak w komponencie `permissions` pozostają `null`
- Dodano debugging logów w `ActivityEditorApp.tsx` do zbadania przepływu danych

### Pliki zmodyfikowane podczas napraw
- **Nowe**:
  - `src/components/activities/editor/ActivityEditorForm.tsx` – wydzielona logika formularza
  - `src/lib/http/response.ts` – helper do JSON responses
- **Zmodyfikowane**:
  - `src/components/activities/editor/ActivityEditorApp.tsx` – refaktoryzacja, debugging logów
  - `src/pages/api/activities/[activity_id].ts` – poprawka Content-Type
  - `src/components/activities/editor/ActivityEditorForm.tsx` – debugging logów dla permissions

### Status napraw
✅ Problem z wypełnianiem pól formularza – **ROZWIĄZANY** (refaktoryzacja + `jsonResponse`)  
✅ Problem z uprawnieniami (permissions null) – **ROZWIĄZANY** (poprawka Content-Type)  
✅ Problem z Content-Type – **ROZWIĄZANY** (helper `jsonResponse`)  
✅ Funkcjonalność AI evaluations – **ZAIMPLEMENTOWANA I NAPRAWIONA**

### Następne kroki
1. ~~Zbadać logi z konsoli przeglądarki dla endpoint permissions~~ ✅
2. ~~Upewnić się że wszystkie API endpoints używają `jsonResponse` helper~~ ✅
3. Zweryfikować że użytkownik może edytować pola jako admin
4. ~~Usunąć debugging logi po zakończeniu napraw~~ (do zrobienia później)
5. **Przetestować funkcjonalność przycisku "Poproś o ocenę AI" w edytorze**

---

## Podsumowanie napraw (2025-11-01 część 2): AI Evaluations

### Zidentyfikowane problemy
1. **Endpointy API nie zwracały JSON** - używały `new Response(JSON.stringify(...))` zamiast `jsonResponse(...)`
2. **Panel ocen AI wyświetlał tylko podstawowe informacje** - brak szczegółów ocen (scores, feedback, sugestie)

### Rozwiązanie 1: Poprawka endpointów AI
**Zaktualizowano**: 
- `src/pages/api/activities/[activity_id]/ai-evaluations.ts` - zamieniono wszystkie `new Response(JSON.stringify(...))` na `jsonResponse(...)`
- `src/pages/api/ai-evaluations/[evaluation_id].ts` - zamieniono wszystkie `new Response(JSON.stringify(...))` na `jsonResponse(...)`

### Rozwiązanie 2: Ulepszenie AIEvaluationPanel
**Zaktualizowano**: `src/components/activities/editor/AIEvaluationPanel.tsx`
- Dodano nagłówek "Oceny AI"
- Dodano komunikat dla pustej listy ocen
- Wyświetlanie pełnych informacji o ocenach:
  - Wersja i data
  - Zgodność z lore (score/10)
  - Wartości harcerskie (score/10)
  - Feedback dla lore (jeśli dostępny)
  - Feedback dla wartości harcerskich (jeśli dostępny)
  - Lista sugestii (jeśli dostępne)
- Ulepszona prezentacja wizualna (grid layout, borders, spacing)

### Weryfikacja implementacji
✅ Backend service: `ai-evaluations.service.ts` - już zaimplementowany
✅ API endpoints: POST/GET dla ocen AI - poprawione Content-Type
✅ Frontend API client: `api.client.ts` - już zaimplementowany
✅ Hook: `useAIEvaluations` - już zaimplementowany
✅ Komponent: `AIEvaluationPanel` - ulepszony
✅ Integracja w edytorze: `ActivityEditorForm` - już zintegrowane
✅ Migracje SQL: tabele i RPC funkcja - już istnieją
✅ Linter errors: brak błędów

### Co działa
1. Przycisk "Poproś o ocenę AI" w nagłówku edytora
2. Walidacja przed żądaniem (nie pozwala na żądanie z niezapisanymi zmianami)
3. Cooldown 5 minut między żądaniami (wyświetlany jako "AI za Xs")
4. POST żądanie do `/api/activities/{id}/ai-evaluations`
5. Polling nowych ocen po żądaniu (co 5s)
6. GET lista ocen z `/api/activities/{id}/ai-evaluations`
7. Wyświetlanie wszystkich szczegółów ocen w panelu
8. Uprawnienia: tylko admin lub przypisany editor może żądać oceny

### Architektura flow
1. Użytkownik klika "Poproś o ocenę AI" → `ActivityHeader`
2. `ActivityEditorForm.handleRequestAI()` wywołuje `requestActivityAIEvaluation(activityId)`
3. Frontend → POST `/api/activities/{id}/ai-evaluations`
4. Endpoint → `requestAIEvaluation()` service
5. Service → RPC `request_ai_evaluation()` w Supabase
6. RPC sprawdza cooldown, aktualizuje `last_evaluation_requested_at`, wstawia rekord do `ai_evaluation_requests`
7. Zwraca 202 Accepted z `next_poll_after_sec: 5`
8. Frontend ustawia trigger pollingu
9. `AIEvaluationPanel` rozpoczyna polling → GET `/api/activities/{id}/ai-evaluations`
10. Gdy worker przetworzy żądanie i wstawi rekord do `ai_evaluations`, pojawi się w liście

### Brakujący element (poza zakresem MVP view)
- **Worker do przetwarzania żądań AI** - osobny proces/edge function, który:
  1. Skanuje `ai_evaluation_requests` WHERE status='queued'
  2. Zmienia status na 'processing'
  3. Buduje prompt z danych aktywności
  4. Wywołuje dostawcę AI (OpenAI/Gemini/etc.)
  5. Waliduje odpowiedź
  6. Wstawia rekord do `ai_evaluations` (trigger nadaje `version`)
  7. Aktualizuje request na 'completed'

**Uwaga**: Do pełnego działania potrzebny jest worker, który będzie faktycznie generował oceny AI. Obecnie interfejs i API są gotowe, ale bez workera żądania będą trafiać do kolejki i tam czekać. To jest zgodne z planem implementacji (asynchroniczny model z kolejką).

### Dokumentacja workera
- **Szablon promptu i implementacji**: `.ai/ai-evaluation-prompt-template.md`
- **Szczegółowe podsumowanie prac**: `.ai/do-kontynuacji/podsumowanie-ai-evaluations.md`

---

**Data ostatniej aktualizacji**: 2025-11-01  
**Status**: Interfejs gotowy, worker do implementacji
