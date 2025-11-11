# Naprawione błędy w Teardown

## Problem 1: "Missing SUPABASE_URL or SUPABASE_ANON_KEY"

**Opis:** Teardown uruchamiał się w osobnym procesie i nie miał dostępu do zmiennych środowiskowych z `.env.test`.

**Rozwiązanie:** Dodano ładowanie zmiennych środowiskowych na początku `global.teardown.ts`:

```typescript
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.test for teardown process
dotenv.config({ 
  path: path.resolve(__dirname, "..", ".env.test"),
  override: true 
});
```

## Problem 2: "groupsPage.clickCreateGroup is not a function"

**Opis:** Test weryfikacyjny używał nieistniejącej metody `clickCreateGroup()`.

**Rozwiązanie:** Poprawiono wywołania metod w `teardown-verification.spec.ts`:

**Było:**
```typescript
await groupsPage.clickCreateGroup();
await createDialog.waitForOpen();
await createDialog.fillForm(groupData);
```

**Jest:**
```typescript
await groupsPage.openCreateDialog();
await createDialog.fillForm(groupData);
```

`openCreateDialog()` już czeka na otwarcie dialogu, więc `waitForOpen()` nie było potrzebne.

## Problem 3: Błędny plik `env.test`

**Opis:** Utworzono przypadkowo plik `env.test` (bez kropki) zamiast używać istniejącego `.env.test`.

**Rozwiązanie:** Usunięto błędny plik `env.test`. Wszystkie pliki teraz używają poprawnej nazwy `.env.test`.

## Weryfikacja

Teraz możesz uruchomić test ponownie:

```bash
npx playwright test teardown-verification.spec.ts
```

Oczekiwany rezultat:
- ✅ Setup przechodzi
- ✅ Oba testy weryfikacyjne przechodzą
- ✅ Teardown przechodzi i czyści bazę danych
- ✅ W logach widzisz: "✅ Database cleanup completed successfully"

