# Naprawa testów E2E - Playwright (groups-join.spec.ts)

## Data: 2025-11-07

## Kontekst
Testy E2E dla funkcjonalności dołączania do grup w Playwright nie przechodziły. Rozpoczęto od 5 failujących testów i 1 przechodzącego.

---

## 🎯 Cel

Naprawienie testów E2E w pliku `e2e/groups-join.spec.ts` które testują scenariusze:
- Dołączanie do grupy za pomocą kodu zaproszenia
- Weryfikacja błędów przy nieprawidłowym kodzie
- Zapobieganie wielokrotnemu dołączeniu do tej samej grupy
- Wyświetlanie listy członków po dołączeniu
- Równoczesne dołączanie wielu użytkowników

---

## ✅ Zrealizowane naprawy

### 1. Problem: Dialogi React nie otwierały się
**Przyczyna**: React nie był jeszcze zahydrowany gdy testy klikały przyciski

**Rozwiązanie**:
- Dodano `await this.page.waitForTimeout(1000)` przed kliknięciem przycisków w `GroupsListPage`
- Zwiększono timeouty do 15s dla `groups-create-dialog` i `groups-join-dialog`
- Dodano opóźnienie 1500ms w `RegisterPage.goto()` dla hydracji React

**Pliki zmodyfikowane**:
- `e2e/page-objects/GroupsListPage.ts`
- `e2e/page-objects/RegisterPage.ts`
- `e2e/page-objects/JoinGroupDialog.ts`

**Kod**:
```typescript
async openCreateDialog() {
  await this.createButton.waitFor({ state: 'visible', timeout: 10000 });
  await this.page.waitForTimeout(1000); // ⬅️ Dodano dla hydracji React
  await this.createButton.click({ timeout: 10000 });
  await this.page.waitForSelector('[data-test-id="groups-create-dialog"]', { 
    state: 'visible', 
    timeout: 15000 // ⬅️ Zwiększono z 5s na 15s
  });
}
```

---

### 2. Problem: Limit grup - użytkownik testowy miał 20 grup
**Przyczyna**: Testy nie czyściły po sobie grup, osiągnięto limit 20 grup

**Rozwiązanie**:
- Dodano `beforeAll` hook który usuwa wszystkie grupy testowe przed uruchomieniem testów
- Naprawiono parsowanie odpowiedzi API - API zwraca `{ data: GroupDTO[] }`

**Plik zmodyfikowany**: `e2e/groups-join.spec.ts`

**Kod**:
```typescript
test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext({ storageState: './e2e/.auth/user.json' });
  const page = await context.newPage();
  
  try {
    const response = await page.request.get('/api/groups');
    if (response.ok()) {
      const result = await response.json();
      
      // API zwraca { data: GroupDTO[] }
      if (result.data && Array.isArray(result.data)) {
        for (const group of result.data) {
          if (group.name && group.name.startsWith('Test Group ')) {
            await page.request.delete(`/api/groups/${group.id}`);
            console.log(`Cleaned up test group: ${group.name}`);
          }
        }
      }
    }
  } catch (e) {
    console.log('Cleanup error:', e);
  } finally {
    await page.close();
    await context.close();
  }
});
```

**Rezultat**: Przed każdym uruchomieniem testów, wszystkie stare grupy testowe są automatycznie usuwane.

---

### 3. Problem: Konteksty użytkowników dzieliły stan auth
**Przyczyna**: Użycie `context.newPage()` tworzyło nowe strony w tym samym kontekście co pre-authenticated user

**Rozwiązanie**:
- Zamiana `context.newPage()` na `browser.newContext()` dla nowych użytkowników
- Dodanie jawnego czyszczenia storage state: `storageState: { cookies: [], origins: [] }`
- Zamknięcie kontekstów po zakończeniu testów

**Plik zmodyfikowany**: `e2e/groups-join.spec.ts`

**Kod przed**:
```typescript
// ❌ ZŁE - dzieli context z User A
const userBPage = await context.newPage();
```

**Kod po**:
```typescript
// ✅ DOBRE - nowy context bez auth state
const userBContext = await browser.newContext({ 
  storageState: { cookies: [], origins: [] }
});
const userBPage = await userBContext.newPage();
// ... test logic ...
await userBPage.close();
await userBContext.close(); // ⬅️ Ważne!
```

**Zastosowano we wszystkich testach**:
- `should join group using valid invitation code`
- `should show group in list after joining`
- `should prevent joining same group twice`
- `should display members list after joining`
- `should handle concurrent joins to same group`

---

### 4. Problem: Test używał pre-authenticated page do rejestracji
**Przyczyna**: Test "concurrent joins" próbował użyć `page` (pre-authenticated) do rejestracji nowego użytkownika

**Rozwiązanie**:
- Zmiana sygnatury testu z `async ({ page, context, browser })` na `async ({ browser })`
- Utworzenie nowego contextu także dla ownera grupy

**Kod**:
```typescript
test('should handle concurrent joins to same group', async ({ browser }) => {
  // ✅ Owner też ma nowy context
  const ownerContext = await browser.newContext({ 
    storageState: { cookies: [], origins: [] }
  });
  const ownerPage = await ownerContext.newPage();
  // ... test logic ...
});
```

---

## 📊 Wyniki

### Stan przed naprawami:
- ❌ 5 failed tests
- ✅ 1 passed test
- ⏭️  1 skipped test

### Stan po naprawach:
- ❌ 3 failed tests (problem z sesją - patrz niżej)
- ✅ 1 passed test  
- ⏭️  3 skipped tests (poprawne - brak invite code)

**Testy przechodzące**:
1. ✅ `should show group in list after joining`

**Testy pomijane** (poprawnie - feature nie zaimplementowany):
2. ⏭️  `should show group in list after joining` (duplikat?)
3. ⏭️  `should prevent joining same group twice`
4. ⏭️  `should display members list after joining`

**Testy failujące** (problem z sesją):
5. ❌ `should join group using valid invitation code`
6. ❌ `should show error with invalid invitation code`
7. ❌ `should handle concurrent joins to same group`

---

## ⚠️ Pozostałe problemy

### Problem: Współdzielona sesja między kontekstami przeglądarki

**Objawy**:
1. Nowe konteksty (`browser.newContext()`) są już zalogowane jako `testowy@jankosmala.pl`
2. `RegisterPage` nie może się załadować bo strona `/auth/register` przekierowuje zalogowanych użytkowników
3. Screenshot pokazuje dashboard zamiast formularza rejestracji

**Przykład z testu**:
```typescript
// Mimo jawnego wyczyszczenia storage state...
const userBContext = await browser.newContext({ 
  storageState: { cookies: [], origins: [] }
});
const userBPage = await userBContext.newPage();
await registerPageB.goto(); // ⬅️ Tu timeout - strona jest zalogowana!
```

**Prawdopodobna przyczyna**:
- Supabase używa HTTP-only cookies które mogą być współdzielone między kontekstami
- Middleware aplikacji automatycznie tworzy sesje
- Browser contexts w Playwright mogą dzielić niektóre dane (np. cache, shared workers)

**Screenshot dowodu**:
- `test-results/.../test-failed-1.png` pokazuje dashboard grupy z `testowy@jankosmala.pl` zamiast formularz rejestracji

---

## 🔧 Możliwe rozwiązania (do implementacji)

### Opcja 1: Użyj oddzielnych instancji przeglądarki (ZALECANE)
```typescript
test('should join group...', async ({ playwright }) => {
  // User A - domyślna przeglądarka z auth
  const browserA = await playwright.chromium.launch();
  const contextA = await browserA.newContext({ 
    storageState: './e2e/.auth/user.json' 
  });
  const pageA = await contextA.newPage();
  
  // User B - nowa instancja przeglądarki
  const browserB = await playwright.chromium.launch();
  const contextB = await browserB.newContext(); // Czysta sesja
  const pageB = await contextB.newPage();
  
  // ... test logic ...
  
  await browserA.close();
  await browserB.close();
});
```

**Plusy**: Pełna izolacja, gwarancja braku współdzielenia sesji  
**Minusy**: Wolniejsze (uruchamianie dodatkowych przeglądarek)

---

### Opcja 2: API logout przed rejestracją
```typescript
const userBContext = await browser.newContext({ 
  storageState: { cookies: [], origins: [] }
});
const userBPage = await userBContext.newPage();

// Wyloguj się przez API przed rejestracją
await userBPage.request.post('/api/auth/logout');

const registerPageB = new RegisterPage(userBPage);
await registerPageB.goto();
```

**Plusy**: Prostsza implementacja  
**Minusy**: Może nie wyczyścić wszystkich cookies

---

### Opcja 3: Przenieś testy do oddzielnego pliku bez pre-auth
Utwórz `e2e/groups-join-multi-user.spec.ts` który:
- Nie używa `storageState` w projekcie
- Tworzy wszystkich użytkowników od zera w każdym teście

```typescript
// playwright.config.ts - nowy projekt
{
  name: 'groups-multi-user',
  // BEZ storageState!
  testMatch: '**/groups-join-multi-user.spec.ts',
}
```

**Plusy**: Czysta separacja, łatwa do zrozumienia  
**Minusy**: Więcej boilerplate code

---

### Opcja 4: Incognito mode dla każdego kontekstu
```typescript
const userBContext = await browser.newContext({ 
  storageState: { cookies: [], origins: [] },
  // Dodaj te opcje:
  ignoreHTTPSErrors: true,
  bypassCSP: true,
  // Może pomóc:
  serviceWorkers: 'block',
  permissions: []
});
```

**Plusy**: Minimalna zmiana  
**Minusy**: Może nie rozwiązać problemu

---

## 📝 Kod wymaga dodatkowej uwagi

### 1. JoinGroupDialog - redundantne czekanie
W teście `should show error with invalid invitation code`:
```typescript
await groupsPage.openJoinDialog(); // ⬅️ To już czeka na dialog
const joinDialog = new JoinGroupDialog(page);
// await joinDialog.waitForDialog(); // ⬅️ USUNIĘTO - zbędne
await joinDialog.joinGroup('INVALID-CODE-12345');
```

### 2. Invite code extraction
Testy używają kopiowania do schowka - może być niestabilne:
```typescript
await context.grantPermissions(['clipboard-read', 'clipboard-write']);
const groupPage = new GroupPage(page);
if (await groupPage.canCopyInvite()) {
  await groupPage.copyInviteCode();
  await page.waitForTimeout(500);
  inviteCode = await page.evaluate(() => navigator.clipboard.readText());
}
```

**Alternatywa**: Pobrać kod przez API lub bezpośrednio z DOM.

---

## 🎓 Wnioski i best practices

### Dla testów Playwright z Astro + React:

1. **Czekaj na hydrację React**
   ```typescript
   await this.page.waitForTimeout(1500); // Po page.goto()
   ```

2. **Używaj data-test-id zamiast role selectors dla hydrated components**
   - Role selectors działają od razu (SSR)
   - Event handlers mogą nie być jeszcze attached

3. **Dla multi-user scenarios używaj oddzielnych browserów**
   ```typescript
   const browserB = await playwright.chromium.launch();
   ```

4. **Cleanup jest krytyczny**
   - Dodaj `beforeAll` hook do usuwania testowych danych
   - Limits (np. 20 grup) mogą blokować testy

5. **Context vs Browser**
   - `browser.newContext()` - szybkie, ale może dzielić niektóre dane
   - `playwright.chromium.launch()` - wolniejsze, ale pełna izolacja

---

## 📋 TODO - Dalsze kroki

### Priorytet wysoki:
- [ ] Zaimplementować Opcję 1 (oddzielne przeglądarki) dla testów multi-user
- [ ] Przejrzeć wszystkie screenshoty z failujących testów
- [ ] Zweryfikować czy middleware tworzy automatyczne sesje

### Priorytet średni:
- [ ] Dodać test helper dla tworzenia nowych użytkowników
- [ ] Przenieść cleanup do globalnego setup
- [ ] Dodać więcej debugowania dla session state

### Priorytet niski:
- [ ] Rozważyć API-based approach do pobierania invite codes
- [ ] Dodać testy dla edge cases (wygasłe kody, max użycia, etc.)
- [ ] Optymalizacja czasu wykonania testów

---

## 📂 Zmodyfikowane pliki

1. `e2e/groups-join.spec.ts` - główne naprawy testów
2. `e2e/page-objects/RegisterPage.ts` - opóźnienie dla hydracji React
3. `e2e/page-objects/GroupsListPage.ts` - opóźnienia przed kliknięciami
4. `e2e/page-objects/JoinGroupDialog.ts` - zwiększone timeouty

---

## 🔍 Debugowanie

### Przydatne komendy:
```bash
# Uruchom pojedynczy test z UI
npx playwright test e2e/groups-join.spec.ts:64 --debug

# Uruchom z headed mode
npx playwright test e2e/groups-join.spec.ts --headed

# Zobacz screenshoty i videos
ls -la test-results/groups-join-*/

# Uruchom tylko jeden worker (sequential)
npx playwright test e2e/groups-join.spec.ts --workers=1
```

### Sprawdź session state:
```typescript
// Dodaj w teście:
const cookies = await userBContext.cookies();
console.log('Cookies:', cookies);

const storage = await userBPage.evaluate(() => ({
  localStorage: { ...localStorage },
  sessionStorage: { ...sessionStorage }
}));
console.log('Storage:', storage);
```

---

## 👤 Autor
AI Assistant (Claude Sonnet 4.5) + Jan Kosmala

## 📅 Historia
- 2025-11-07: Początkowa naprawa testów, cleanup, context isolation
- Dalsze prace wymagane: Problem z współdzieloną sesją między kontekstami

