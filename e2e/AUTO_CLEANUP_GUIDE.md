# Automatyczne czyszczenie po każdym teście

## ✅ Zaimplementowano!

Teraz po **każdym pojedynczym teście** baza danych jest automatycznie czyszczona.

## 🔧 Jak używać

### W nowych testach

Zamiast importować z `@playwright/test`:

```typescript
// ❌ STARE (bez auto-cleanup)
import { test, expect } from "@playwright/test";

// ✅ NOWE (z auto-cleanup)
import { test, expect } from "./fixtures";
```

### Przykład

```typescript
import { test, expect } from "./fixtures"; // ← Automatyczne czyszczenie!
import { GroupsListPage, CreateGroupDialog } from "./page-objects";

test.describe("My Tests", () => {
  test("test 1 creates groups", async ({ page }) => {
    // ... tworzy grupy
  }); // ← Po tym teście: 🧹 automatyczne czyszczenie

  test("test 2 creates more groups", async ({ page }) => {
    // ... tworzy więcej grup
  }); // ← Po tym teście: 🧹 automatyczne czyszczenie
  
  // Każdy test zaczyna z czystą bazą!
});
```

## 📊 Co działa teraz

### PRZED (stary system):
```
Test 1 → tworzy dane
Test 2 → tworzy dane (dane z Test 1 nadal w bazie)
Test 3 → tworzy dane (dane z Test 1 i 2 nadal w bazie)
🧹 Teardown → usuwa wszystko na raz
```

### TERAZ (nowy system):
```
Test 1 → tworzy dane → 🧹 usuwa dane Test 1
Test 2 → tworzy dane → 🧹 usuwa dane Test 2  
Test 3 → tworzy dane → 🧹 usuwa dane Test 3
```

**Każdy test zaczyna z czystą bazą!** ✨

## 🔄 Aktualizacja istniejących testów

Możesz stopniowo migrować istniejące testy:

### Opcja 1: Zmień tylko import (zalecane)

```typescript
// Znajdź w pliku testowym:
import { test, expect } from "@playwright/test";

// Zamień na:
import { test, expect } from "./fixtures";

// Gotowe! ✅
```

### Opcja 2: Wyłącz dla konkretnego testu

Jeśli jakiś test NIE potrzebuje czyszczenia:

```typescript
import { test as baseTest, expect } from "@playwright/test";

// Ten test nie będzie czyszczony
baseTest("no cleanup needed", async ({ page }) => {
  // ...
});
```

## 🎯 Zachowanie

### Co jest czyszczone

Po **każdym teście** usuwane są:
- ✅ Grupy utworzone przez testowych użytkowników
- ✅ Aktywności w tych grupach
- ✅ Dni obozu
- ✅ Harmonogramy
- ✅ Zadania
- ✅ Oceny AI
- ✅ Editory aktywności
- ✅ Członkostwa w grupach

### Co NIE jest czyszczone

- ❌ Użytkownicy testowi (są wielokrotnego użytku)
- ❌ Dane utworzone przez innych użytkowników

## 🐛 Debugging

Jeśli chcesz **wyłączyć** czyszczenie dla debugowania:

```typescript
// Tymczasowo importuj ze starego źródła
import { test, expect } from "@playwright/test"; // Bez auto-cleanup

test("debug this test", async ({ page }) => {
  // ... test
  // Dane pozostaną w bazie po teście - możesz je zobaczyć
});
```

## 📝 Logi

W konsoli po każdym teście zobaczysz:

```
✓ Test passed (2.5s)
   🧹 Cleaning up after test...
   ✓  Cleanup completed
```

## ⚙️ Techniczne szczegóły

System wykorzystuje **custom Playwright fixtures**:

- `e2e/fixtures.ts` - definiuje fixture `autoCleanup`
- `e2e/test-cleanup-helper.ts` - logika czyszczenia
- `auto: true` - automatycznie uruchamia czyszczenie po każdym teście

## 🔀 Porównanie z global teardown

Masz teraz **DWA poziomy** czyszczenia:

### 1. **Per-test cleanup** (nowy)
- Działa: Po każdym pojedynczym teście
- Kiedy: Gdy importujesz z `./fixtures`
- Cel: Izolacja testów

### 2. **Global teardown** (stary, nadal działa)
- Działa: Po wszystkich testach
- Kiedy: Zawsze (w `global.teardown.ts`)
- Cel: Końcowe czyszczenie

**Oba działają razem** - to jest OK! Global teardown to "safety net" na wypadek jakichś problemów.

## 🚀 Performance

Czyszczenie po każdym teście **może być wolniejsze**, ale:

- ✅ Testy są niezależne (możesz uruchomić jeden test)
- ✅ Brak "ghost data" między testami
- ✅ Łatwiejszy debugging (wiesz że zaczynasz od zera)

Jeśli performance jest problemem, możesz:
- Importować z `@playwright/test` w szybkich testach (bez cleanup)
- Importować z `./fixtures` w testach które tego potrzebują

## ✅ Testy już zaktualizowane

- `e2e/teardown-verification.spec.ts` - używa nowego systemu

## 📋 TODO: Zaktualizuj pozostałe testy

Możesz stopniowo aktualizować inne pliki testowe:

```bash
# Znajdź wszystkie testy importujące ze starego źródła
grep -r "from \"@playwright/test\"" e2e/*.spec.ts

# Zamień import w każdym pliku na:
# import { test, expect } from "./fixtures";
```

Lub użyj globalnego znajdź i zamień w edytorze!

