# Podsumowanie: Dodanie atrybutów data-test-id do komponentów

**Data:** 2025-11-06  
**Zadanie:** Przygotowanie komponentów aplikacji do testów E2E poprzez dodanie atrybutów `data-test-id`

## 🎯 Cel

Dodanie atrybutów `data-test-id` do wszystkich kluczowych komponentów aplikacji w kolejności od najwyższego priorytetu, aby umożliwić tworzenie stabilnych i łatwych w utrzymaniu testów E2E za pomocą Playwright.

## 📋 Konwencje

### Format atrybutu
- **Nazwa atrybutu:** `data-test-id` (z myślnikiem, nie `data-testid`)
- **Konwencja nazewnictwa:** kebab-case hierarchiczny
- **Przykłady:** 
  - `groups-list-card`
  - `activity-stepper-next-button`
  - `task-form-submit-button`
  - `auth-login-email-input`

### Zakres elementów
- **Elementy interaktywne:** przyciski, inputy, selecty, checkboxy, linki
- **Kontenery:** dialogi, formularze, karty, listy, tabele
- **Komunikaty:** błędy, sukces, ostrzeżenia, puste stany
- **Elementy nawigacji:** zakładki, przyciski akcji

## 📊 Statystyki

- **Liczba zmienionych plików:** 28
- **Liczba dodanych atrybutów:** ~150+
- **Priorytety:** 7 (P1-P7)
- **Komponenty według typu:**
  - Formularze autentykacji: 6 plików
  - Zarządzanie grupami: 6 plików
  - Członkowie grup: 4 pliki
  - Aktywności: 3 pliki
  - Zadania: 2 pliki
  - Camp Days: 2 pliki
  - AI Evaluation: 1 plik
  - Page Objects: 1 plik (aktualizacja)

## 🗂️ Zmienione pliki według priorytetów

### Priorytet 1: Autentykacja (P1) ✅

**Znaczenie:** Fundament aplikacji - bez autentykacji użytkownik nie ma dostępu do funkcjonalności

#### 1. Login
- `src/components/auth/EmailField.tsx`
  - `auth-email-input` - pole email (używane w wielu formularzach)

- `src/components/auth/PasswordField.tsx`
  - `auth-{id}-input` - pole hasła (dynamiczne na podstawie ID)

- `src/components/auth/LoginForm.tsx`
  - `auth-login-error-message` - komunikat błędu logowania
  - `auth-login-success-message` - komunikat sukcesu
  - `auth-login-submit-button` - przycisk zaloguj

- `src/components/auth/LoginCard.tsx`
  - `auth-login-forgot-password-link` - link do resetu hasła
  - `auth-login-register-link` - link do rejestracji

#### 2. Register
- `src/components/auth/RegisterForm.tsx`
  - `auth-register-error-message` - komunikat błędu rejestracji
  - `auth-register-success-message` - komunikat sukcesu
  - `auth-register-submit-button` - przycisk zarejestruj

- `src/components/auth/RegisterCard.tsx`
  - `auth-register-login-link` - link do logowania

#### 3. Forgot Password
- `src/components/auth/ForgotPasswordForm.tsx`
  - `auth-forgot-error-message` - komunikat błędu
  - `auth-forgot-success-message` - komunikat sukcesu
  - `auth-forgot-submit-button` - przycisk wyślij instrukcje

- `src/components/auth/ForgotPasswordCard.tsx`
  - `auth-forgot-login-link` - link do logowania
  - `auth-forgot-register-link` - link do rejestracji

#### 4. Reset Password
- `src/components/auth/ResetPasswordForm.tsx`
  - `auth-reset-token-error-message` - błąd nieprawidłowego tokena
  - `auth-reset-error-message` - ogólny błąd
  - `auth-reset-success-message` - komunikat sukcesu
  - `auth-reset-submit-button` - przycisk ustaw nowe hasło

- `src/components/auth/ResetPasswordCard.tsx`
  - `auth-reset-login-link` - link do logowania
  - `auth-reset-forgot-link` - link do ponownego wysłania linku

### Priorytet 2: Zarządzanie grupami (P2) ✅

**Znaczenie:** Rdzeń aplikacji - grupy są podstawową jednostką organizacyjną

#### 1. Lista grup
- `src/components/groups/GroupsView.tsx`
  - `groups-live-region` - region live dla screen readerów (zmiana z data-testid)
  - `groups-success-message` - komunikat sukcesu akcji
  - `groups-unauthorized-error` - błąd braku autoryzacji
  - `groups-login-link` - link do logowania z błędu
  - `groups-error-message` - ogólny komunikat błędu
  - `groups-refresh-button` - przycisk odśwież
  - `groups-load-more-button` - przycisk załaduj więcej

- `src/components/groups/GroupsHeader.tsx`
  - `groups-header-tab-active` - zakładka aktywne grupy
  - `groups-header-tab-deleted` - zakładka usunięte grupy
  - `groups-header-join-button` - przycisk dołącz do grupy
  - `groups-header-create-button` - przycisk utwórz grupę

- `src/components/groups/GroupCard.tsx`
  - `groups-list-card` - karta grupy na liście
  - `groups-card-copy-invite-button` - przycisk kopiuj kod zaproszenia
  - `groups-card-restore-button` - przycisk przywróć grupę

- `src/components/groups/EmptyState.tsx`
  - `groups-empty-state` - kontener pustego stanu
  - `groups-empty-state-message` - nagłówek komunikatu
  - `groups-empty-join-button` - przycisk dołącz (w pustym stanie)
  - `groups-empty-create-button` - przycisk utwórz (w pustym stanie)

#### 2. Tworzenie grupy
- `src/components/groups/CreateGroupDialog.tsx`
  - `groups-create-dialog` - dialog tworzenia grupy
  - `groups-create-error-message` - komunikat błędu
  - `groups-create-name-input` - pole nazwa grupy
  - `groups-create-description-input` - pole opis
  - `groups-create-lore-input` - pole motyw/lore
  - `groups-create-start-date-input` - pole data startu
  - `groups-create-end-date-input` - pole data końca
  - `groups-create-max-members-input` - pole limit członków
  - `groups-create-cancel-button` - przycisk anuluj
  - `groups-create-submit-button` - przycisk utwórz

#### 3. Dołączanie do grupy
- `src/components/groups/JoinGroupDialog.tsx`
  - `groups-join-dialog` - dialog dołączania do grupy
  - `groups-join-error-message` - komunikat błędu
  - `groups-join-code-input` - pole kod zaproszenia
  - `groups-join-cancel-button` - przycisk anuluj
  - `groups-join-submit-button` - przycisk dołącz

### Priorytet 3: Członkowie grup (P3) ✅

**Znaczenie:** Zarządzanie uprawnieniami i członkami grupy

- `src/components/groups/GroupMembersTable.tsx`
  - `members-table` - kontener tabeli członków
  - `members-table-sort-button` - przycisk sortowania po dacie
  - `members-table-row` - wiersz członka

- `src/components/groups/RoleSelect.tsx`
  - `members-role-select` - select zmiany roli członka

- `src/components/groups/MemberActions.tsx`
  - `members-promote-button` - przycisk promuj do admina
  - `members-remove-button` - przycisk usuń/opuść

- `src/components/groups/MembersToolbar.tsx`
  - `members-search-input` - pole wyszukiwania członków
  - `members-role-filter` - filtr po roli
  - `members-sort-button` - przycisk sortowania
  - `members-count-badge` - badge liczby wyników
  - `members-clear-button` - przycisk wyczyść filtry

### Priorytet 4: Aktywności (P4) ✅

**Znaczenie:** Główna funkcjonalność planowania aktywności

#### 1. Lista aktywności
- `src/components/activities/ActivitiesTable.tsx`
  - `activities-table` - kontener tabeli aktywności
  - `activities-table-row` - wiersz aktywności
  - `activities-row-checkbox` - checkbox zaznaczania aktywności

- `src/components/activities/ActivitiesToolbar.tsx`
  - `activities-search-input` - pole wyszukiwania
  - `activities-status-filter` - filtr statusu
  - `activities-assigned-checkbox` - checkbox "tylko moje"
  - `activities-create-button` - przycisk dodaj aktywność

#### 2. Nowa aktywność (stepper)
- `src/components/activities/new/CtaBar.tsx`
  - `activity-stepper-back-button` - przycisk wstecz
  - `activity-stepper-schedule-button` - przycisk dodaj do planu dnia
  - `activity-stepper-next-button` - przycisk zapisz i kontynuuj/zakończ

### Priorytet 5: Zadania (P5) ✅

**Znaczenie:** Śledzenie realizacji aktywności

- `src/components/groups/tasks/TasksBoard.tsx`
  - `tasks-board` - kontener board zadań
  - `tasks-error-message` - komunikat błędu
  - `tasks-empty-state` - pusty stan
  - `tasks-reset-filters-button` - przycisk reset filtrów
  - `tasks-load-more-button` - przycisk załaduj więcej

- `src/components/tasks/TaskForm.tsx`
  - `task-form` - formularz zadania
  - `task-form-error-message` - komunikat błędu
  - `task-form-title-input` - pole tytuł
  - `task-form-due-date-input` - pole termin
  - `task-form-description-input` - pole opis
  - `task-form-delete-button` - przycisk usuń
  - `task-delete-dialog` - dialog potwierdzenia usunięcia
  - `task-delete-cancel-button` - przycisk anuluj usunięcie
  - `task-delete-confirm-button` - przycisk potwierdź usunięcie
  - `task-form-submit-button` - przycisk zapisz zmiany

### Priorytet 6: Camp Days (P6) ✅

**Znaczenie:** Zaawansowane planowanie dni obozu

- `src/components/camp-days/list/CampDaysPage.tsx`
  - `camp-days-page` - kontener strony
  - `camp-days-error-message` - komunikat błędu
  - `camp-days-retry-button` - przycisk spróbuj ponownie
  - `camp-days-no-results` - brak wyników dla filtrów
  - `camp-days-clear-filters-button` - przycisk wyczyść filtry

- `src/components/camp-days/list/CampDayCard.tsx`
  - `camp-day-card` - karta dnia obozu

### Priorytet 7: AI Evaluation (P7) ✅

**Znaczenie:** Funkcjonalność opcjonalna - ocena AI dla aktywności

- `src/components/activities/details/AIEvaluationPanel.tsx`
  - `ai-evaluation-panel` - panel oceny AI
  - `ai-evaluation-request-button` - przycisk poproś o ocenę AI

### Dodatkowe zmiany

- `e2e/page-objects/GroupsListPage.ts`
  - Zaktualizowano selektory z `data-testid` na `data-test-id`
  - Zmiana: `[data-testid="group-card"]` → `[data-test-id="groups-list-card"]`
  - Zachowano kompatybilność z istniejącymi testami

## 🔍 Wzorce nazewnictwa

### Struktura nazwy
```
{moduł}-{komponent}-{element}-{typ}
```

### Przykłady według wzorca

#### Formularze
- `{moduł}-{formularz}-{pole}-input` - pola formularza
- `{moduł}-{formularz}-submit-button` - przycisk submit
- `{moduł}-{formularz}-cancel-button` - przycisk anuluj
- `{moduł}-{formularz}-error-message` - komunikat błędu

Przykłady:
```html
<input data-test-id="auth-login-email-input" />
<button data-test-id="groups-create-submit-button">
<div data-test-id="task-form-error-message">
```

#### Listy i karty
- `{moduł}-list-card` - karta na liście
- `{moduł}-table-row` - wiersz tabeli
- `{moduł}-empty-state` - pusty stan

Przykłady:
```html
<div data-test-id="groups-list-card">
<tr data-test-id="members-table-row">
<div data-test-id="tasks-empty-state">
```

#### Dialogi
- `{moduł}-{akcja}-dialog` - kontener dialogu
- `{moduł}-{akcja}-{pole}-input` - pole w dialogu
- `{moduł}-{akcja}-{typ}-button` - przycisk w dialogu

Przykłady:
```html
<div data-test-id="groups-create-dialog">
<input data-test-id="groups-join-code-input">
<button data-test-id="task-delete-confirm-button">
```

#### Nawigacja i akcje
- `{moduł}-header-{typ}-button` - przyciski w nagłówku
- `{moduł}-header-tab-{nazwa}` - zakładki
- `{moduł}-{akcja}-button` - przyciski akcji

Przykłady:
```html
<button data-test-id="groups-header-create-button">
<button data-test-id="groups-header-tab-active">
<button data-test-id="activities-create-button">
```

## 📝 Przykłady użycia w testach Playwright

### Podstawowe selektory
```typescript
import { generateUniqueEmail, generateUniqueGroupName } from './test-helpers';

// Po data-test-id
const email = generateUniqueEmail('testuser');
await page.locator('[data-test-id="auth-login-email-input"]').fill(email);
await page.locator('[data-test-id="auth-login-submit-button"]').click();

// Lub używając getByTestId
const groupName = generateUniqueGroupName('Testowa Grupa');
await page.getByTestId('groups-create-name-input').fill(groupName);
await page.getByTestId('groups-create-submit-button').click();
```

### Page Object Pattern
```typescript
import { generateUniqueGroupName } from './test-helpers';

export class GroupsListPage {
  readonly page: Page;
  readonly createButton: Locator;
  readonly joinButton: Locator;
  readonly groupCards: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.createButton = page.getByTestId('groups-header-create-button');
    this.joinButton = page.getByTestId('groups-header-join-button');
    this.groupCards = page.locator('[data-test-id="groups-list-card"]');
  }
  
  async createGroup(name: string) {
    await this.createButton.click();
    await this.page.getByTestId('groups-create-name-input').fill(name);
    await this.page.getByTestId('groups-create-submit-button').click();
  }
}

// W teście:
const groupsPage = new GroupsListPage(page);
const groupName = generateUniqueGroupName('My Test Group');
await groupsPage.createGroup(groupName);

// Weryfikacja utworzenia
await expect(page.getByText(groupName)).toBeVisible();
```

### Czekanie na elementy
```typescript
// Czekanie na pojawienie się komunikatu sukcesu
await page.getByTestId('groups-success-message').waitFor({ state: 'visible' });

// Czekanie na zniknięcie komunikatu ładowania
await page.getByTestId('groups-live-region').waitFor({ state: 'hidden' });
```

### Asercje
```typescript
// Sprawdzenie widoczności
await expect(page.getByTestId('groups-empty-state')).toBeVisible();

// Sprawdzenie tekstu
await expect(page.getByTestId('auth-login-error-message'))
  .toContainText('Nieprawidłowy email lub hasło');

// Sprawdzenie liczby elementów
const cards = page.locator('[data-test-id="groups-list-card"]');
await expect(cards).toHaveCount(3);
```

### Interakcje z formularzami
```typescript
import { generateUniqueEmail, generateGroupData } from './test-helpers';

// Pełny flow logowania
async function login(page: Page, email: string, password: string) {
  await page.getByTestId('auth-email-input').fill(email);
  await page.getByTestId('auth-password-input').fill(password);
  await page.getByTestId('auth-login-submit-button').click();
  
  // Czekaj na sukces lub błąd
  await Promise.race([
    page.getByTestId('auth-login-success-message').waitFor(),
    page.getByTestId('auth-login-error-message').waitFor()
  ]);
}

// Tworzenie grupy z unikalnymi danymi
const groupData = generateGroupData({
  description: 'Grupa do testowania E2E',
  maxMembers: 20
});

await page.getByTestId('groups-create-name-input').fill(groupData.name);
await page.getByTestId('groups-create-description-input').fill(groupData.description);
await page.getByTestId('groups-create-submit-button').click();

// Weryfikacja utworzenia
await expect(page.getByText(groupData.name)).toBeVisible();
```

## ✅ Najlepsze praktyki

### DO ✓
1. **Używaj data-test-id** gdy semantyczne selektory są niewystarczające
2. **Nazywaj hierarchicznie** - od modułu przez komponent do elementu
3. **Bądź konsekwentny** - ta sama konwencja w całej aplikacji
4. **Dodawaj do kluczowych elementów** - formularze, przyciski, komunikaty
5. **Aktualizuj Page Objects** - gdy dodajesz nowe atrybuty
6. **Generuj unikalne nazwy** - używaj `test-helpers.ts` zamiast hardcodowanych wartości
7. **Weryfikuj utworzenie** - sprawdź, czy encja z unikalną nazwą pojawiła się na liście

### NIE RÓB ✗
1. ❌ Nie używaj CSS klas do testów - mogą się zmienić
2. ❌ Nie używaj XPath - trudne w utrzymaniu
3. ❌ Nie duplikuj wartości - każdy ID powinien być unikalny w kontekście
4. ❌ Nie używaj indeksów elementów - niestabilne
5. ❌ Nie hardcoduj nazw encji - używaj generatorów unikalnych nazw
6. ❌ Nie używaj tej samej nazwy w wielu testach - testy mogą interferować ze sobą

## 🔄 Kolejne kroki

### Natychmiastowe
1. ✅ Wszystkie atrybuty data-test-id dodane
2. ✅ Page Objects zaktualizowane
3. ⏳ Testy E2E do napisania na podstawie scenariuszy z `e2e-test-scenarios.plan.md`

### Przyszłe
1. Dodanie pozostałych komponentów według potrzeb testowych:
   - Szczegóły aktywności
   - Edytor aktywności
   - Dashboard grupy
   - Ustawienia grupy
   - Profile użytkownika

2. Rozszerzenie Page Objects:
   - ActivityDetailsPage
   - ActivityEditorPage
   - GroupDashboardPage
   - TaskDetailsPage

3. Monitoring i utrzymanie:
   - Regularne przeglądy testów E2E
   - Aktualizacja atrybutów przy zmianach UI
   - Dokumentacja nowych wzorców

## 📚 Dokumentacja powiązana

- `e2e/README.md` - Dokumentacja testów E2E
- `e2e/SETUP.md` - Konfiguracja środowiska testowego
- `e2e/E2E-CHECKLIST.md` - Checklist testów E2E
- `e2e/page-objects/` - Implementacje Page Objects
- `TESTING.md` - Główny przewodnik testowania

## 🎯 Rezultat

Aplikacja jest teraz w pełni przygotowana do pisania stabilnych i łatwych w utrzymaniu testów E2E. Wszystkie kluczowe komponenty mają jednolite, hierarchiczne i semantyczne atrybuty `data-test-id`, które umożliwiają:

- ✅ Łatwe targetowanie elementów w testach
- ✅ Stabilne selektory niezależne od zmian w stylach
- ✅ Czytelny kod testów dzięki Page Object Pattern
- ✅ Szybkie debugowanie problemów w testach
- ✅ Łatwą rozbudowę suite testowej

**Status:** ✅ ZAKOŃCZONE - Gotowe do pisania testów E2E

