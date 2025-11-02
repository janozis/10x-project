# Architektura UI dla LoreProgrammer

## 1. Przegląd struktury UI

- **Model aplikacji**: Astro 5 (SSR) z wyspami React 19 dla widoków dynamicznych (listy, edytory, DnD). TypeScript 5, Tailwind 4, shadcn/ui. Middleware wymuszające autoryzację i kontekst użytkownika.
- **Informacyjna architektura (IA) i routing (SSR shell)**:
  - `/login`, `/forgot-password`, `/reset-password`, `/join?code=...`
  - `/groups`
  - `/groups/{id}/dashboard | activities | camp-days | tasks | members | settings | activity-feed`
  - Zasoby globalne: `/activities/{id}`, `/activities/{id}/edit`, `/tasks/{task_id}`.
- **Nawigacja**: Desktop – layout z lewym sidebar (grupa) + topbar/breadcrumbs; Mobile – dolny tab bar (Dashboard, Aktywności, Plan dnia, Zadania, Więcej) + Drawer dla pozostałych sekcji.
- **Uprawnienia**: UI ukrywa niedozwolone akcje. Źródło praw: `GET /api/groups/{group_id}/permissions`. Fallback na 403.
- **Stan i dane**: TanStack Query (cache per resource i `group_id`), Supabase Realtime per widok (throttle 300 ms, cleanup na unmount), lokalny autosave (localStorage) szkiców formularzy.
- **Walidacja i formularze**: zod + react-hook-form; limity pól z PRD; ostrzeżenie przy opuszczaniu brudnego formularza; konflikt zapisu via `updated_at` → modal diff i retry.
- **AI (asynchronicznie)**: przycisk „Poproś o ocenę AI”, 202 + polling wg `next_poll_after_sec` (max 60 s), countdown dla 429, historia wersji z progami kolorów.
- **Czas i formaty**: Prezentacja i logika UI w strefie Europe/Warsaw. UI: dd.MM.rrrr, HH:MM. API: YYYY-MM-DD, HH:MM.
- **Motyw i dostępność**: Jasny/ciemny (system default, persist w localStorage). A11y: focus management, kontrast WCAG AA, cele dotykowe ≥44 px. PL-only mikrocopy.
- **Błędy i loading**: Skeletony dla list i detail, globalny progress bar przy nawigacji; Retry 5xx; strony błędów 401/403/404; mutacje w toast/inline.

### 1.1. Kluczowe wymagania (PRD) — skrót
- **Grupy**: tworzenie, usuwanie, zapraszanie przez kod, daty HAL, lore, role admin/editor/member.
- **Aktywności**: 10 wymaganych pól, multi-editor, statusy (luźne w MVP), soft delete/restore.
- **Oceny AI**: dwie oceny (lore, wartości harcerskie) + feedback + sugestie (pytania). Asynchroniczny request z cooldown 5 min.
- **Harmonogram (Camp Days)**: dni w zakresie dat grupy, sloty z kolejnością i czasem, DnD reorder, ostrzeżenia o konfliktach, domyślne bloki.
- **Zadania**: CRUD, grupowanie po statusie, quick-add, powiązanie z aktywnością.
- **Dashboard**: metryki grupy i ostatnia aktywność.
- **Realtime**: aktualizacje dla kluczowych zasobów.
- **Prywatność**: minimalne dane osobowe (email/hasło lub imię i nazwisko).

### 1.2. Główne punkty końcowe API — skrót i cele
- **Auth**: Supabase Auth (middleware). Reset hasła: `/forgot-password`, `/reset-password` (UI); zdrowie: `GET /api/health`, wersja: `GET /api/version`.
- **Grupy**: `POST/GET /api/groups`, `GET/PATCH/DELETE /api/groups/{id}`, `POST /api/groups/{id}/restore`, `POST /api/groups/{id}/invite`, `POST /api/groups/join`.
- **Członkowie**: `GET /api/groups/{id}/members`, `PATCH/DELETE /api/groups/{id}/members/{user_id}`, `POST /api/groups/{id}/members/{user_id}/promote`.
- **Aktywności**: `POST/GET /api/groups/{id}/activities`, `GET/PATCH/DELETE /api/activities/{activity_id}`, `POST /api/activities/{activity_id}/restore`.
- **Edytorzy aktywności**: `POST/GET /api/activities/{activity_id}/editors`, `DELETE /api/activities/{activity_id}/editors/{user_id}`.
- **Oceny AI**: `POST/GET /api/activities/{activity_id}/ai-evaluations`, `GET /api/ai-evaluations/{evaluation_id}`.
- **Camp Days**: `POST/GET /api/groups/{id}/camp-days`, `GET/PATCH/DELETE /api/camp-days/{camp_day_id}`.
- **Harmonogram**: `POST/GET /api/camp-days/{camp_day_id}/schedules`, `PATCH/DELETE /api/activity-schedules/{schedule_id}`.
- **Zadania**: `POST/GET /api/groups/{id}/tasks`, `GET/PATCH/DELETE /api/tasks/{task_id}`.
- **Dashboard**: `GET /api/groups/{id}/dashboard`. **Permissions**: `GET /api/groups/{id}/permissions`.

### 1.3. Przypadki brzegowe i błędy (globalnie)
- **401**: redirect do `/login` z lastRoute; join code respektowany po zalogowaniu.
- **403 (FORBIDDEN)**: ukryte akcje + ekran „Brak dostępu”; odświeżanie praw po zmianach członkostwa.
- **404/NOT_FOUND**: brak zasobu lub soft-deleted (poza zakładką „Ostatnio usunięte”).
- **409/CONFLICT**: konflikt `updated_at` → modal diff i decyzja użytkownika (nadpisz/odrzuć).
- **422/VALIDATION_ERROR**: mapowanie błędów do pól formularza.
- **429/RATE_LIMIT**: countdown wg `Retry-After` (AI, invite rotate). 
- **Archiwizacja**: banner „tylko podgląd”, ukryte mutacje, „Przywróć” dla admina.

## 2. Lista widoków

### 2.1. Logowanie
- **Nazwa widoku**: Logowanie
- **Ścieżka widoku**: `/login`
- **Główny cel**: Uwierzytelnienie użytkownika.
- **Kluczowe informacje do wyświetlenia**: Formularz email/hasło, linki do „Zapomniałeś hasła?” i „Zarejestruj” (jeśli docelowe), komunikaty błędów.
- **Kluczowe komponenty widoku**: Form + pola, SubmitButton z loading, Alert błędu, Linki pomocnicze.
- **UX, dostępność i względy bezpieczeństwa**: Maskowanie haseł, brak wymogów dodatkowych danych; focus na pierwszym polu; po sukcesie redirect do lastRoute.
- **Powiązane API**: Supabase Auth (middleware), brak bezpośredniego endpointu REST.

### 2.2. Reset hasła – zapomniane
- **Ścieżka**: `/forgot-password`
- **Cel**: Rozpoczęcie resetu hasła (Supabase flow).
- **Informacje**: Email, potwierdzenie wysyłki.
- **Komponenty**: Formularz email, sukces/erro toast.
- **UX/A11y/Security**: Nie ujawniaj istnienia konta; neutralny komunikat po submit.
- **API**: Supabase Auth reset email (SDK / polityka Supabase).

### 2.3. Reset hasła – ustaw nowe
- **Ścieżka**: `/reset-password`
- **Cel**: Ustawienie nowego hasła z linku.
- **Informacje**: Pola „hasło”/„powtórz hasło”.
- **Komponenty**: Formularz, walidacja siły hasła.
- **UX/A11y/Security**: Token z URL, komunikaty sukces/błąd, auto-redirect do `/login`.
- **API**: Supabase Auth (SDK).

### 2.4. Dołączenie do grupy (join)
- **Ścieżka**: `/join?code=ABCDEFGH`
- **Cel**: Dołączenie do grupy kodem.
- **Informacje**: Maska kodu, status dołączenia, błędy INVITE_*.
- **Komponenty**: Input z maską i przycisk „Dołącz”, Copy/Deep link helper, loader stanu.
- **UX/A11y/Security**: Obsługa expired/maxed; po sukcesie redirect do `/groups/{id}/dashboard`.
- **API**: `POST /api/groups/join`.

### 2.5. Lista grup
- **Ścieżka**: `/groups`
- **Cel**: Przegląd i utworzenie grup HAL.
- **Informacje**: Karty grup (nazwa, okres, lore, status), CTA „Utwórz grupę”, „Dołącz do grupy”.
- **Komponenty**: Cards/Grid, Dialog tworzenia grupy (formularz), Paginator (opcjonalnie), Empty state.
- **UX/A11y/Security**: Walidacja dat (end ≥ start), max_members; Confirm przy usunięciu; zakładka „Ostatnio usunięte” (restore).
- **API**: `GET/POST /api/groups`, `DELETE/POST-restore /api/groups/{id}`.

### 2.6. Dashboard grupy
- **Ścieżka**: `/groups/{id}/dashboard`
- **Cel**: Szybki obraz postępu i aktywności.
- **Informacje**: Kafle (total_activities, evaluated_activities, pct_above_7, statusy zadań), mini feed „ostatnia aktywność”.
- **Komponenty**: SSR kafle, client feed list, linki skrótów.
- **UX/A11y/Security**: Skeletony, fallback 403/404, banner archiwum.
- **API**: `GET /api/groups/{id}/dashboard`.

### 2.7. Lista aktywności
- **Ścieżka**: `/groups/{id}/activities`
- **Cel**: Przegląd i filtracja aktywności, szybkie akcje.
- **Informacje**: Wiersze: tytuł, cel (1–2 linie), chipy AI (kolory), edytorzy (avatary), `updated_at`.
- **Komponenty**: Search (debounce 300 ms), Filters (status, assigned=me), Infinite scroll (20, prefetch 70%), konfigurowalne kolumny (persist per group), Bulk (desktop), Empty state, Tab „Ostatnio usunięte”.
- **UX/A11y/Security**: Domyślnie „Moje” dla edytora; ukrycie mutacji w archiwum; Confirm przy delete; ostrzeżenia RLS.
- **API**: `GET /api/groups/{id}/activities`, `DELETE/POST-restore /api/activities/{activity_id}`.

### 2.8. Szczegóły aktywności (read-only)
- **Ścieżka**: `/activities/{id}`
- **Cel**: Podgląd kompletnego opisu aktywności.
- **Informacje**: 10 pól + status, edytorzy, ostatnie oceny AI (timeline skrót), „ostatnio edytował”.
- **Komponenty**: Detail view, Editors list, AIEvaluation Panel (skrót), CTA „Edytuj”, „Poproś o ocenę AI”.
- **UX/A11y/Security**: Akcje zależne od uprawnień; 429 countdown; badge „nieaktualna”.
- **API**: `GET /api/activities/{activity_id}`, `GET /api/activities/{activity_id}/ai-evaluations`, `POST /api/activities/{activity_id}/ai-evaluations`.

### 2.9. Edytor aktywności
- **Ścieżka**: `/activities/{id}/edit`
- **Cel**: Edycja aktywności z walidacją i autosave.
- **Informacje**: Formularz 10 pól z limitami, status, edytorzy, historia AI.
- **Komponenty**: Tabs (sekcje) lub Stepper (dla „nowa”), react-hook-form + zod, Autosave (localStorage, limit 20 szkiców/5 MB), DirtyPrompt, ConflictDiff modal, EditorsManager, AIEvaluationPanel.
- **UX/A11y/Security**: Early returns na 422; 409 diff; ukrycie edycji bez prawa; a11y dla nawigacji klawiaturą między polami.
- **API**: `GET/PATCH /api/activities/{activity_id}` (PATCH pełnym obiektem z `updated_at`), `GET/POST /api/activities/{activity_id}/ai-evaluations`, `GET/POST/DELETE editors`.

### 2.10. Nowa aktywność (Stepper)
- **Ścieżka**: `/groups/{id}/activities/new`
- **Cel**: Utworzenie nowej aktywności.
- **Informacje**: Minimalny zestaw pól wymaganych z PRD; tworzenie rekordu przy pierwszym „Zapisz”.
- **Komponenty**: Stepper, walidacja, Autosave, CTA „Zapisz i kontynuuj”, „Dodaj do planu dnia”.
- **UX/A11y/Security**: Potwierdzenie przy wyjściu; przypisanie twórcy jako edytora po utworzeniu.
- **API**: `POST /api/groups/{id}/activities`, po utworzeniu `POST /api/activities/{activity_id}/editors` (self).

### 2.11. Camp Days – widok dnia
- **Ścieżka**: `/groups/{id}/camp-days/{camp_day_id}` (selector dni pod `/groups/{id}/camp-days`)
- **Cel**: Zarządzanie slotami dnia.
- **Informacje**: Lista slotów (order_in_day, start/end, aktywność, status aktywności), sumaryczny czas.
- **Komponenty**: DaySelector, SlotsList z dnd-kit (reorder), TimePickers, Autosave PATCH, Warnings na konflikty godzin, CTA „Zastosuj domyślne bloki”. Picker tworzenia aktywności „z miejsca”.
- **UX/A11y/Security**: Edytor może modyfikować sloty tylko dla przypisanych aktywności; Admin pełny dostęp; badge dla draftów; renumeracja `order_in_day` po DnD.
- **API**: `GET /api/groups/{id}/camp-days`, `GET/PATCH /api/camp-days/{camp_day_id}`, `POST/GET /api/camp-days/{camp_day_id}/schedules`, `PATCH/DELETE /api/activity-schedules/{schedule_id}`.

### 2.12. Camp Days – overview
- **Ścieżka**: `/groups/{id}/camp-days/overview`
- **Cel**: Przegląd całego obozu.
- **Informacje**: Kafelki dni: liczba slotów, łączny czas, „brak zajęć”, filtry „bez zajęć”/„< X min”.
- **Komponenty**: Grid dni, Filters, Link do dnia.
- **UX/A11y/Security**: Na mobile – karty kompaktowe; szybkie przełączanie filtrów.
- **API**: `GET /api/groups/{id}/camp-days`, zliczenia po stronie UI lub dedykowane pola, sloty via `GET schedules` per day (prefetch wg potrzeby).

### 2.13. Lista zadań
- **Ścieżka**: `/groups/{id}/tasks`
- **Cel**: Planowanie i śledzenie zadań.
- **Informacje**: Grupowanie po statusie, szybkie przełączanie statusu, przypisanie do aktywności.
- **Komponenty**: TaskColumns (statusy), TaskItem, QuickAdd (z kontekstem aktywności jeśli z detailu aktywności), Bulk actions (desktop), Filters.
- **UX/A11y/Security**: Brak bulk na mobile; Confirm przy usunięciu; filtracja wg aktywności.
- **API**: `GET/POST /api/groups/{id}/tasks`, `GET/PATCH/DELETE /api/tasks/{task_id}`.

### 2.14. Szczegóły zadania
- **Ścieżka**: `/tasks/{task_id}`
- **Cel**: Edycja/podgląd pojedynczego zadania (opcjonalnie w MVP jeśli potrzeba).
- **Informacje**: Tytuł, opis, status, powiązania.
- **Komponenty**: Form, StatusSelect.
- **UX/A11y/Security**: Zgodnie z rolami; walidacja podstawowa.
- **API**: `GET/PATCH/DELETE /api/tasks/{task_id}`.

### 2.15. Członkowie grupy
- **Ścieżka**: `/groups/{id}/members`
- **Cel**: Zarządzanie członkami i rolami.
- **Informacje**: Lista z wyszukiwaniem, filtr roli, sort po `joined_at` ASC.
- **Komponenty**: DataTable, RoleBadge + RoleSelect (admin), actions: remove, promote.
- **UX/A11y/Security**: Confirm przy usunięciu z informacją o odpinaniu z aktywności i zadaniach; blokada usunięcia ostatniego admina (409 → komunikat).
- **API**: `GET /api/groups/{id}/members`, `PATCH/DELETE /api/groups/{id}/members/{user_id}`, `POST /api/groups/{id}/members/{user_id}/promote`.

### 2.16. Ustawienia grupy (Invite, status, archiwizacja)
- **Ścieżka**: `/groups/{id}/settings`
- **Cel**: Konfiguracja grupy i zarządzanie zaproszeniami.
- **Informacje**: Szczegóły grupy, Invite code (maskowany), link `join?code=...`, rotate, archiwizacja/przywrócenie.
- **Komponenty**: Form GroupDetails, InviteCard (Copy/Rotate z retry/backoff), ConfirmDialog (archive/delete/restore), Banner archiwum.
- **UX/A11y/Security**: Ukrycie Invite w archiwum; Retry-After dla rate limit; Confirm z konsekwencjami.
- **API**: `GET/PATCH /api/groups/{id}`, `POST /api/groups/{id}/invite`, `DELETE/POST-restore /api/groups/{id}`.

### 2.17. Activity feed
- **Ścieżka**: `/groups/{id}/activity-feed`
- **Cel**: Pełny feed aktywności zespołu.
- **Informacje**: Timeline zdarzeń (typ, zasób, czas, użytkownik), filtry (iteracyjnie).
- **Komponenty**: Timeline list, Filters, Realtime sub.
- **UX/A11y/Security**: Paginacja; czytelne ikonki typów.
- **API**: Źródło z istniejących tabel (w MVP częściowo z dashboard view i realtime) – brak dedykowanego endpointu w MVP.

### 2.18. Camp Days – lista dni (zarządzanie)
- **Ścieżka**: `/groups/{id}/camp-days`
- **Cel**: Przegląd i zarządzanie dniami obozu.
- **Informacje**: Wiersze/karty: `day_number`, `date`, `theme`, liczba slotów, łączny czas; link do dnia.
- **Komponenty**: Lista (cards/table), Filters (np. „bez zajęć”), CTA „Dodaj dzień”, Row actions: „Edytuj”, „Usuń”, link „Otwórz dzień”, Empty state.
- **UX/A11y/Security**: Skeletony; akcje tworzenia/edycji/usuwania tylko dla admina (ukryte dla innych); confirm przy usuwaniu; maskowanie 404 dla braku członkostwa.
- **API**: `GET /api/groups/{id}/camp-days`.

### 2.19. Camp Days – utwórz dzień
- **Ścieżka**: `/groups/{id}/camp-days/new`
- **Cel**: Dodanie nowego dnia.
- **Informacje**: Formularz pól: `day_number (1..30)`, `date (YYYY-MM-DD)`, `theme (opcjonalnie)`.
- **Komponenty**: Form (Input, Date, Textarea), Validate (zod), Submit/Cancel, inline błędy.
- **UX/A11y/Security**: Admin-only; walidacje zakresu numeru i daty; obsługa konfliktu `DUPLICATE_DAY_NUMBER` (409) i błędów walidacji; po sukcesie redirect do listy lub do widoku dnia.
- **API**: `POST /api/groups/{group_id}/camp-days`.

### 2.20. Camp Days – edycja dnia
- **Ścieżka**: `/groups/{id}/camp-days/{camp_day_id}/edit`
- **Cel**: Korekta metadanych dnia.
- **Informacje**: Formularz pól: `date`, `theme` (z możliwością wyczyszczenia).
- **Komponenty**: Form (Date, Textarea), Validate (zod), Save/Cancel.
- **UX/A11y/Security**: Admin-only; weryfikacja daty w zakresie grupy; po sukcesie odświeżenie listy lub nagłówka dnia; 404 maskowanie dla braku członkostwa.
- **API**: `PATCH /api/camp-days/{camp_day_id}`.

### 2.21. Camp Days – usunięcie dnia
- **Ścieżka**: flow z listy lub widoku dnia (ConfirmDialog)
- **Cel**: Usunięcie dnia (twarde).
- **Informacje**: Confirm z konsekwencjami (usunięcie slotów tego dnia, jeśli istnieją).
- **Komponenty**: ConfirmDialog, Toaster.
- **UX/A11y/Security**: Admin-only; po sukcesie redirect/refresh listy; 404 maskowanie dla osób spoza grupy.
- **API**: `DELETE /api/camp-days/{camp_day_id}`.

## 3. Mapa podróży użytkownika

### 3.1. Onboarding i dołączenie do grupy
1) Użytkownik trafia na `/login` → loguje się → redirect do `/groups` lub lastRoute.
2) Tworzy grupę (dialog) → redirect do `/groups/{id}/dashboard`.
3) W ustawieniach kopiuje link zaproszenia → przekazuje członkom.
4) Członek otwiera `/join?code=...` → dołącza → redirect do `/groups/{id}/dashboard`.

### 3.2. Tworzenie i iteracja nad aktywnością z oceną AI
1) `/groups/{id}/activities` → „Nowa aktywność” → `/groups/{id}/activities/new`.
2) Wypełnia Stepper (autosave) → „Zapisz” tworzy rekord, przypisuje twórcę jako edytora.
3) W edytorze `/activities/{id}/edit` → „Poproś o ocenę AI” → 202; polling do nowej wersji (cooldown 5 min, countdown na 429).
4) Przegląda historię ocen, sugestie; wprowadza poprawki; konflikt `updated_at` → modal diff → rozwiązuje.

### 3.3. Plan dnia i harmonogram
1) `/groups/{id}/camp-days` → lista dni; akcje admina: „Dodaj dzień”, „Edytuj”, „Usuń”.
2) „Dodaj dzień” → `/groups/{id}/camp-days/new` (lub modal) → zapis → redirect do widoku dnia lub powrót na listę.
3) „Edytuj” → `/groups/{id}/camp-days/{camp_day_id}/edit` → zapis → odświeżenie listy/nagłówka.
4) „Usuń” → ConfirmDialog → `DELETE` → odświeżenie listy.
5) `/groups/{id}/camp-days/overview` → przegląd dni i wybór dnia.
6) `/groups/{id}/camp-days/{camp_day_id}` → dodawanie slotów, DnD reorder (auto renumeracja), ostrzeżenia o konfliktach.
7) Z pickera slota może utworzyć nową aktywność i od razu przypisać.

### 3.4. Zarządzanie zadaniami
1) `/groups/{id}/tasks` → Quick-add (powiązanie z aktywnością jeśli z kontekstu) → szybkie przełączanie statusów.
2) Desktop: bulk akcje; Mobile: pojedyncze operacje.

### 3.5. Członkowie i role
1) `/groups/{id}/members` → wyszukiwanie, zmiana ról, remove/promote; 409 blokuje usunięcie ostatniego admina (komunikat).

## 4. Układ i struktura nawigacji

- **AppShell (SSR)**: Topbar (breadcrumbs: „Grupy / {nazwa grupy} / {sekcja}”), profil, przełącznik motywu. Lewy sidebar (desktop) z sekcjami: Dashboard, Aktywności, Plan dnia, Zadania, Members, Ustawienia, Activity feed. Sekcja „Plan dnia” zawiera podwidoki: Lista dni (`/groups/{id}/camp-days`), Overview (`/groups/{id}/camp-days/overview`), Widok dnia (`/groups/{id}/camp-days/{camp_day_id}`). Banner archiwum nad contentem.
- **Mobile**: Dolny tab bar (Dashboard, Aktywności, Plan dnia, Zadania, Więcej). Drawer w „Więcej” zawiera Members, Ustawienia, Activity feed i pozostałe.
- **Kontekst grupy**: Provider z danymi grupy i `permissions`; invalidacje cache przy przełączeniu grupy i zdarzeniach realtime.
- **Wzorce nawigacji**: 
  - 401 → `/login` (zachowanie lastRoute), 403 → ekran sekcji „Brak dostępu”.
  - Linki pomocnicze między powiązanymi zasobami (zadanie ↔ aktywność, slot ↔ aktywność).
  - „Ostatnio usunięte” jako tab/filtr w listach (grupy, aktywności).

## 5. Kluczowe komponenty

- **AppShell**: layout SSR, topbar, breadcrumbs, sidebar/drawer, theme toggle.
- **BottomTabBar**: mobilna nawigacja po sekcjach grupy.
- **PermissionGuard**: warunkowe renderowanie akcji/sekcji na podstawie `/permissions` + fallback 403.
- **SearchInput (debounced)**: pole z 300 ms debounce i clear.
- **FiltersBar**: kapsuły filtrów (status, assigned, zakresy czasowe), reset/persist per group.
- **ResourceList / DataTable**: listy/karty z infinite scroll (activities) lub paginacją (members), skeletony.
- **ActivityCard/Row**: komórki z tytułem, celem, chipami AI, avatarami edytorów, `updated_at`.
- **ActivityEditorForm**: formularz 10 pól + status; zod walidacje, limitery, licznik znaków.
- **AutosaveIndicator + DraftsStore**: stan szkiców (localStorage) z FIFO i limitami (20/5 MB).
- **DirtyPrompt**: confirm przed opuszczeniem brudnego formularza.
- **ConflictDialog**: prezentacja diffu pól, wybór strategii, retry PATCH.
- **AIEvaluationPanel**: przycisk z cooldownem, paski ocen (kolory progów), timeline wersji, sugestie (pytania), badge „nieaktualna”.
- **CooldownButton**: zarządza Retry-After i countdownem dla 429.
- **EditorsManager**: lista edytorów, dodawanie/usuwanie (admin only), walidacje członkostwa.
- **CampDayBoard**: DnD lista slotów, renumeracja `order_in_day`, ostrzeżenia o konfliktach.
- **TimePickerInterval**: wybór `start_time`/`end_time` (24h), weryfikacja `end > start`.
- **DaySelector**: nawigacja po dniach obozu.
- **CampDaysList**: lista/karty dni (day_number, date, theme, metryki), akcje wiersza.
- **CampDayForm**: formularz tworzenia/edycji dnia (date, theme, walidacje zakresów).
- **CampDayCreateDialog / CampDayEditDialog**: modalne warianty form do tworzenia/edycji.
- **TaskBoard**: kolumny statusów, TaskItem, QuickAdd, BulkBar (desktop).
- **MembersTable**: wyszukiwanie, RoleSelect, actions (remove/promote) z confirm.
- **InviteCard**: maska kodu, kopiuj kod/link, rotate (rate limit-aware).
- **ConfirmDialog**: usuwanie/archiwizacja z opisem konsekwencji; linki do blokujących zależności.
- **RealtimeSubscriber**: subskrypcje per widok; throttle; cleanup.
- **Toast/Snackbar**: sukcesy i błędy mutacji; retry 5xx.
- **ErrorView/Skeletons**: standardowe stany błędów i ładowania.

### 5.1. Mapowanie historyjek PRD → widoki/komponenty
- **US-001 Rejestracja/Logowanie**: `/login`, `/forgot-password`, `/reset-password` (Auth flow Supabase).
- **US-002 Tworzenie grupy**: `/groups` (dialog tworzenia) → `/groups/{id}/dashboard`.
- **US-003 Zapraszanie/Dołączanie**: `/groups/{id}/settings` (InviteCard), `/join?code=...` (join flow).
- **US-004 Role**: `/groups/{id}/members` (MembersTable, RoleSelect, promote/remove, blokada last admin 409).
- **US-005 Aktywności**: `/groups/{id}/activities`, `/groups/{id}/activities/new`, `/activities/{id}`, `/activities/{id}/edit`, EditorsManager.
- **US-006 Ocena AI**: AIEvaluationPanel w detail/edytorze; cooldown, polling, historia.
- **US-007 Sugestie AI**: sekcja pytań w AIEvaluationPanel.
- **US-008 Realtime**: RealtimeSubscriber w listach/detailach.
- **US-009 Dashboard**: `/groups/{id}/dashboard` (SSR + client feed skrót).
- **US-010 Struktura dnia**: `/groups/{id}/camp-days/{camp_day_id}` + „Zastosuj domyślne bloki”.
- **US-011 Minimalizacja danych**: formularze auth tylko email/hasło.
- **US-012 Usuwanie grupy**: `/groups/{id}/settings` (ConfirmDialog, restore; tab „Ostatnio usunięte” w `/groups`).
- **US-013 Multi-editor**: EditorsManager w aktywności.
- **US-014 Online-only**: banner offline + ograniczone akcje; autosave lokalny.
- **(Dodatkowe) Struktura obozu – overview**: `/groups/{id}/camp-days/overview`.
-. **US-015 Camp Days CRUD**: `/groups/{id}/camp-days` (lista), `/groups/{id}/camp-days/new` (create), `/groups/{id}/camp-days/{camp_day_id}/edit` (edit), `DELETE /api/camp-days/{camp_day_id}` (delete).

### 5.2. Zgodność z API i bezpieczeństwo
- Każdy widok wskazuje powiązane endpointy; mutacje używają pełnego PATCH z `updated_at` (konflikty 409 → diff modal).
- RLS egzekwowane w DB; API 403 zwracane wcześnie – UI ukrywa akcje i pokazuje ekran „Brak dostępu” przy bezpośrednich URL.
- Rate limitowane operacje (AI, invite rotate) mają countown wg `Retry-After`.
- Soft delete i restore dostępne z zakładek „Ostatnio usunięte”.


