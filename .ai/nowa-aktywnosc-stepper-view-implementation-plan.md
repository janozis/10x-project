# Plan implementacji widoku Nowa aktywność (Stepper)

## 1. Przegląd
Widok służy do utworzenia nowej aktywności w grupie HAL. Formularz jest podzielony na czytelne kroki (stepper), zbierające 10 wymaganych pól z PRD. Rekord aktywności jest tworzony po pierwszym pełnym „Zapisz” (na kroku podsumowania), a następnie włączany jest autosave oparty o częściowe aktualizacje (PATCH). Po utworzeniu, twórca powinien zostać przypisany jako edytor, a użytkownik może od razu „Dodać do planu dnia” (utworzyć wpis harmonogramu dla wybranego dnia obozu).

## 2. Routing widoku
- Ścieżka: `/groups/{group_id}/activities/new`
- Plik strony: `src/pages/groups/[group_id]/activities/new.astro`
- Widok osadza wyspę React z komponentem steppera (`NewActivityStepper`), ładowaną klientowo.

## 3. Struktura komponentów
- `src/pages/groups/[group_id]/activities/new.astro`
  - Wczytuje layout, wyświetla nagłówek i mountuje wyspę React.
  - Osadza: `<NewActivityStepper groupId={params.group_id} />`.
- `src/components/activities/new/NewActivityStepper.tsx`
  - Główny kontener logiki i UI steppera; zarządza stanem formularza, walidacją kroków, CTA i autosave.
  - Dzieci:
    - `StepIndicator` (pasek kroków)
    - `BasicsStep` (podstawy)
    - `ContentStep` (merytoryka)
    - `LogisticsStep` (logistyka)
    - `SummaryStep` (podsumowanie i walidacja końcowa)
    - `CtaBar` (przyciski: Wstecz, Zapisz i kontynuuj/Zakończ i zapisz, Dodaj do planu dnia)
    - `AddToScheduleDialog` (modal dodania do dnia)
    - `LeaveConfirmDialog` (potwierdzenie wyjścia z niezapisanymi zmianami)
- UI bazuje na `shadcn/ui` (`button`, `card`, pola formularza) i Tailwind 4.

## 4. Szczegóły komponentów
### NewActivityStepper
- Opis: Kontener logiki tworzenia aktywności. Prowadzi użytkownika przez kroki, wykonuje walidację kroków, tworzy aktywność, inicjuje autosave i umożliwia dodanie do planu dnia.
- Główne elementy:
  - `Card` z nagłówkiem widoku
  - `StepIndicator` (wizualny postęp)
  - Obszar kroku (render warunkowy `BasicsStep` | `ContentStep` | `LogisticsStep` | `SummaryStep`)
  - `CtaBar` (nawigacja i akcje)
  - Modale: `AddToScheduleDialog`, `LeaveConfirmDialog`
- Obsługiwane interakcje:
  - Zmiana pól formularza (onChange)
  - Nawigacja krokami (Dalej/Wstecz, klik na wskaźniku kroku)
  - „Zapisz i kontynuuj” (dla kroków 1-3 walidacja lokalna; na kroku 4 „Zakończ i zapisz” → POST create)
  - Autosave po utworzeniu (debounce po zmianach → PATCH)
  - „Dodaj do planu dnia” (po utworzeniu → otwarcie dialogu)
  - Ochrona przed utratą zmian (beforeunload + dialog przy próbie wyjścia z nieutworzoną/niezapisana formą)
- Walidacja:
  - Krokowa (lokalna) i końcowa (pełna, zgodna z `activityCreateSchema`):
    - `duration_minutes`: liczba całkowita 5..1440
    - Wszystkie pozostałe pola: stringi niepuste (po `trim()`), limity długości wg `activityCreateSchema`
  - Po utworzeniu, dla autosave korzystamy z `activityUpdateSchema` (partial + `status` opcjonalnie)
- Typy: `ActivityCreateCommand`, `ActivityUpdateCommand`, `ActivityWithEditorsDTO`, `UUID`, `ActivityCreateInput`, `ActivityUpdateInput` oraz ViewModel (sekcja 5)
- Propsy: `{ groupId: UUID }`

### StepIndicator
- Opis: Pasek kroków (Stepper) z etykietami i stanami ukończenia.
- Elementy: lista kroków, aktywny wskaźnik, komendy dostępności (aria-current, role="tablist")
- Interakcje: klik na krok (jeśli poprzednie kroki zaliczone), strzałki klawiatury do nawigacji
- Walidacja: blokada skoku na krok „podsumowanie”, jeśli wcześniejsze kroki nie spełniają wymagań lokalnych
- Typy: `StepId`, `StepMeta`
- Propsy: `{ current: StepId, completed: StepId[], onStepClick: (id: StepId) => void }`

### BasicsStep
- Zakres pól: `title`, `objective`, `duration_minutes`, `participants`
- Elementy: `Input`/`Textarea` + walidacje inline; helper do konwersji `duration_minutes` (string → number)
- Zdarzenia: `onFieldChange`, `onNext`
- Walidacja: wszystkie pola wymagane; `duration_minutes` w zakresie 5..1440
- Typy: część `ActivityCreateVM`
- Propsy: `{ values, errors, onChange }`

### ContentStep
- Zakres pól: `tasks`, `flow`, `summary`
- Elementy: `Textarea` z licznikami znaków (opcjonalnie), wskazówki długości
- Zdarzenia: `onFieldChange`, `onNext`, `onBack`
- Walidacja: niepuste; limity z `activityCreateSchema`
- Typy: część `ActivityCreateVM`
- Propsy: `{ values, errors, onChange, onBack }`

### LogisticsStep
- Zakres pól: `location`, `materials`, `responsible`, `knowledge_scope`
- Elementy: `Input`/`Textarea`
- Zdarzenia: `onFieldChange`, `onNext`, `onBack`
- Walidacja: niepuste
- Typy: część `ActivityCreateVM`
- Propsy: `{ values, errors, onChange, onBack }`

### SummaryStep
- Opis: Podsumowanie wszystkich pól, walidacja końcowa i pierwszy „Zakończ i zapisz” (POST create)
- Elementy: podgląd danych, komunikaty błędów, przycisk „Zakończ i zapisz”
- Zdarzenia: `onSubmitCreate`, `onBack`
- Walidacja: pełna zgodność z `activityCreateSchema`
- Propsy: `{ values, errors, onBack, onSubmitCreate, isSubmitting }`

### CtaBar
- Opis: Sekcja przycisków nawigacji i akcji pomocniczych
- Elementy: `Button` Wstecz, `Button` Dalej/Zakończ i zapisz, `Button` Dodaj do planu dnia (disabled do czasu utworzenia)
- Zdarzenia: `onBack`, `onNextOrSubmit`, `onAddToSchedule`
- Propsy: `{ canGoBack, canGoNext, isLastStep, isSubmitting, isCreated }`

### AddToScheduleDialog
- Opis: Modal umożliwiający dodanie aktywności do planu dnia
- Elementy: select dnia (`CampDayDTO`), pola: `start_time`, `end_time`, `order_in_day`
- Zdarzenia: `onOpen`, `onClose`, `onConfirm`
- Walidacja: `start_time < end_time`, `order_in_day` unikalny w dniu (kolizje obsłużone przez API)
- Typy: `CampDayDTO`, `ActivityScheduleCreateCommand`
- Propsy: `{ open, groupId, activityId, onClose, onCreated }`

### LeaveConfirmDialog
- Opis: Dialog przy opuszczaniu widoku z niezapisanymi zmianami (przed utworzeniem) lub zapisem w toku
- Elementy: tytuł, opis, przyciski Anuluj/Opuść
- Zdarzenia: `onConfirmLeave`
- Propsy: `{ open, onCancel, onConfirm }`

## 5. Typy
- DTO (istniejące, import z `src/types.ts`):
  - `ActivityCreateCommand`, `ActivityUpdateCommand`, `ActivityWithEditorsDTO`, `ActivityEditorDTO`, `CampDayDTO`, `ActivityScheduleDTO`, `UUID`
- Walidacja (istniejąca):
  - `activityCreateSchema`, `activityUpdateSchema` (`src/lib/validation/activity.ts`)
  - `activityScheduleCreateSchema` (`src/lib/validation/activitySchedule.ts`), `campDay` list do modala
- Nowe typy ViewModel (frontend):
```ts
export type StepId = "basics" | "content" | "logistics" | "summary";

export interface ActivityCreateVM {
  title: string;
  objective: string;
  tasks: string;
  duration_minutes: number | ""; // input kontrolowany; konwersja przy submit
  location: string;
  materials: string;
  responsible: string;
  knowledge_scope: string;
  participants: string;
  flow: string;
  summary: string;
}

export interface FieldErrors {
  [key: string]: string | undefined; // mapy błędów per pole z walidacji Zod
}

export interface AutosaveState {
  enabled: boolean; // włączane po utworzeniu
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt?: string; // ISO
  error?: string;
}

export interface NewActivityState {
  step: StepId;
  values: ActivityCreateVM;
  errors: FieldErrors;
  createdActivityId?: UUID;
  autosave: AutosaveState;
}
```

## 6. Zarządzanie stanem
- Lokalnie w `NewActivityStepper` + dedykowane hooki:
  - `useStepValidation(values: ActivityCreateVM)`
    - Zwraca metody walidacji dla kroków oraz `validateAll()` przed utworzeniem
  - `useCreateActivity(groupId: UUID)`
    - `create(values: ActivityCreateVM) => Promise<ActivityWithEditorsDTO>` (konwersja typów + mapowanie błędów Zod → `FieldErrors`)
  - `useAutosave(activityId?: UUID)`
    - Włącza się po utworzeniu; debounced PATCH przy zmianach; respektuje `isSaving` i błędy
  - `useAssignSelfOnCreate()`
    - Po create: próbuje `POST /api/activities/{id}/editors` z własnym `user_id` (uwagi w sekcji błędów)
  - `useLeaveGuard(isDirty: boolean)`
    - Rejestruje `beforeunload`; wyświetla `LeaveConfirmDialog` przy próbie opuszczenia wewnątrz aplikacji

## 7. Integracja API
- Tworzenie aktywności:
  - `POST /api/groups/{group_id}/activities` (`ActivityCreateCommand`)
  - Wejście: 10 wymaganych pól; wyjście: `ActivityWithEditorsDTO`
- Autosave po utworzeniu:
  - `PATCH /api/activities/{activity_id}` (`ActivityUpdateCommand` – częściowe pola)
  - Wyjście: `ActivityWithEditorsDTO`
- Przypisanie edytora (self):
  - `POST /api/activities/{activity_id}/editors` body: `{ user_id: UUID }`
  - Uwaga: aktualna implementacja servera wymaga roli admin dla nadawania edytorów. Aby spełnić wymaganie „twórca jako edytor”, rekomendowane jest wsparcie po stronie backend (auto-assign w `createActivity` lub wyjątek dla self-assign twórcy). Front spróbuje i obsłuży 403.
- Dodanie do planu dnia:
  - Lista dni obozu: `GET /api/groups/{group_id}/camp-days` → `CampDayDTO[]`
  - Utworzenie wpisu: `POST /api/camp-days/{camp_day_id}/schedules` (`ActivityScheduleCreateCommand`)

## 8. Interakcje użytkownika
- Zmiana pola → aktualizacja stanu, czyszczenie błędu pola, zaznaczenie `isDirty`
- Dalej/Wstecz → przełączanie kroków (blokada przejścia Dalej, jeśli bieżący krok ma błędy)
- Zakończ i zapisz (krok „summary”) → pełna walidacja; w razie sukcesu: `POST create` → `assign self` → włączenie autosave → toast potwierdzający
- Autosave → po każdej zmianie po utworzeniu, z opóźnieniem (np. 800–1200 ms), `PATCH` tylko zmienionych pól
- Dodaj do planu dnia → otwiera dialog; po zatwierdzeniu `POST schedule` → toast i opcjonalna nawigacja do przeglądu dnia/aktywności
- Wyjście z widoku z niezapisanymi danymi → systemowy `beforeunload` + `LeaveConfirmDialog` dla wewnętrznych nawigacji

## 9. Warunki i walidacja
- Krokowe minimalne warunki:
  - Basics: wszystkie 4 pola uzupełnione, `duration_minutes` w [5,1440]
  - Content: `tasks`, `flow`, `summary` niepuste (limity długości)
  - Logistics: `location`, `materials`, `responsible`, `knowledge_scope` niepuste
- Przed `POST create` → pełna walidacja `activityCreateSchema`
- Przed `POST schedule` → `start_time < end_time`; `order_in_day` liczba całkowita; kolizje kolejności wykrywa API (mapowane na błąd UI)

## 10. Obsługa błędów
- Mapowanie kodów (przykłady):
  - `VALIDATION_ERROR` → wyświetlenie błędów per pole wg mapy (`FieldErrors`)
  - `FORBIDDEN_ROLE`/`UNAUTHORIZED` → banner z informacją o uprawnieniach; ewentualny redirect do logowania
  - `ACTIVITY_NOT_FOUND` (przy PATCH) → komunikat i wyłączenie autosave
  - `alreadyAssigned`/`FORBIDDEN_ROLE` przy `assign self` → informacja: „Nie udało się przypisać jako edytor. Skontaktuj się z adminem.”; nie blokuje wyświetlania, ale może ograniczyć edycję (patrz niżej)
  - `orderInDayConflict` przy harmonogramie → komunikat inline z prośbą o zmianę kolejności
  - Błędy sieciowe → retry w autosave, wskazanie stanu „próba ponowna…”
- Ważna uwaga o uprawnieniach: backend aktualnie wymaga, aby edytorzy mogli PATCH tylko jeśli są przypisani. Jeżeli twórca (rola `editor`) nie zostanie skutecznie przypisany, autosave i dalsza edycja mogą być zablokowane przez 403. Plan zakłada zmianę backend (auto-assign po create). Do czasu poprawki frontend:
  - Próbuje `assign self` raz po create; w razie 403 pokazuje banner i tymczasowo wyłącza autosave, umożliwiając ręczną korektę przed opuszczeniem (lokalny stan bez PATCH)

## 11. Kroki implementacji
1. Routing i strona Astro
   - Utwórz `src/pages/groups/[group_id]/activities/new.astro` z osadzeniem `NewActivityStepper` i pobraniem `group_id` z params.
2. Struktura komponentów
   - Utwórz katalog `src/components/activities/new/`
   - Dodaj pliki: `NewActivityStepper.tsx`, `StepIndicator.tsx`, `BasicsStep.tsx`, `ContentStep.tsx`, `LogisticsStep.tsx`, `SummaryStep.tsx`, `CtaBar.tsx`, `AddToScheduleDialog.tsx`, `LeaveConfirmDialog.tsx`
3. Typy i hooki
   - Zdefiniuj `ActivityCreateVM`, `FieldErrors`, `NewActivityState`, `StepId`
   - Zaimplementuj hooki: `useStepValidation`, `useCreateActivity`, `useAutosave`, `useAssignSelfOnCreate`, `useLeaveGuard`
4. Walidacja
   - Użyj `activityCreateSchema`/`activityUpdateSchema` do walidacji końcowej i mapowania błędów; walidacja krokowa lokalna (subset pól)
5. Logika tworzenia
   - Na „Zakończ i zapisz”: konwersja `duration_minutes`, pełna walidacja, `POST create`, zapis `activityId`
   - Po sukcesie: wywołaj `assign self`; włącz autosave
6. Autosave (PATCH)
   - Debounce 800–1200 ms; wysyłaj tylko zmienione pola względem ostatnio zapisanego snapshotu
   - Obsłuż stany: `isSaving`, retry z ograniczoną liczbą prób, komunikaty błędów
7. Dialog „Dodaj do planu dnia”
   - Pobierz dni obozu (`listCampDays`); formularz tworzenia (`createActivitySchedule`)
   - Walidacja czasu; obsłuż konflikt `order_in_day`
8. A11y/UX
   - Klawiaturowa nawigacja po krokach; aria-atributy dla steppera; focus management po zmianie kroku
   - Zliczanie znaków przy polach długich (opcjonalnie)
   - Toastery/snakbary na kluczowe akcje (create, autosave error, schedule created)
9. Guard wyjścia
   - `beforeunload` gdy `isDirty && !createdActivityId || autosave.isSaving`
   - `LeaveConfirmDialog` przy nawigacji wewnętrznej (np. klik linku)
10. Testy ręczne scenariuszy
   - Tworzenie jako admin i jako editor
   - Błędy walidacji (puste pola, zły zakres czasu trwania)
   - Brak uprawnień do `assign self` → banner i brak autosave
   - Dodanie do planu dnia (poprawny i konflikt kolejności)
11. Follow-up backend (rekomendacja)
   - Auto-assign twórcy jako edytora w `createActivity` (po wstawieniu) LUB dopuszczenie self-assign twórcy w endpointzie `/editors`

---

- Lokalizacja plików zgodnie z konwencją projektu:
  - Strony: `src/pages/...`
  - Komponenty: `src/components/activities/new/...`
  - Walidacja/re-użycie typów: importy z `src/lib/validation/activity.ts` i `src/types.ts`
- Stack: Astro 5, TS 5, React 19, Tailwind 4, shadcn/ui
