# 🔧 Naprawa: Problem z sesją w wewnętrznych wywołaniach fetch() SSR

## 🔴 Wykryty problem #3

**Problem z architekturą:** Strony `.astro` używały `fetch()` do własnych API endpointów, ale te wewnętrzne requesty **nie przekazywały cookies z sesją**.

### Objawy

Użytkownik zgłosił:
> "nie działa, teraz zniknął nawet tytuł: Group not found"

### Analiza logów

```
[middleware] /groups/.../dashboard user: b67e02f2-fb48-4c28-a8c6-8ac1d35af679 ✅
[middleware] /api/groups/.../permissions user: undefined error: Auth session missing! ❌
[middleware] /api/groups/.../dashboard user: undefined error: Auth session missing! ❌
[middleware] /api/groups/... user: undefined error: Auth session missing! ❌
```

**Diagnoza:**
1. Pierwsze żądanie do strony `.astro` **widzi sesję użytkownika** ✅
2. Wszystkie wewnętrzne wywołania `fetch()` **nie mają sesji** ❌

### Przyczyna

W pliku `dashboard.astro` były wywołania:

```typescript
// ❌ ZŁA IMPLEMENTACJA
const dashboardUrl = new URL(`/api/groups/${groupId}/dashboard`, Astro.url);
const permissionsUrl = new URL(`/api/groups/${groupId}/permissions`, Astro.url);

const [dashboardRes, permissionsRes, groupRes] = await Promise.all([
  fetch(dashboardUrl),  // ❌ Nowe HTTP request bez cookies!
  fetch(permissionsUrl), // ❌ Nowe HTTP request bez cookies!
  fetch(groupUrl),       // ❌ Nowe HTTP request bez cookies!
]);
```

**Problem:**
- Te `fetch()` to nowe requesty HTTP przez sieć
- Astro **nie przekazuje automatycznie** cookies z oryginalnego żądania
- Middleware w tych requestach dostaje `Auth session missing!`
- Dlatego `locals.user` jest `undefined`

### Konsekwencje

1. ❌ Endpointy API zwracają 401/404 (brak autoryzacji)
2. ❌ Strona wyświetla błąd "Group not found"
3. ❌ Użytkownik nie może zobaczyć własnej grupy mimo że jest zalogowany

## ✅ Rozwiązanie

**Zmiana architektury:** W plikach `.astro` **nie używaj fetch() do własnych API**. Zamiast tego wywołuj **bezpośrednio funkcje serwisowe**.

### Przed (ZŁE ❌)

```typescript
// dashboard.astro
const dashboardUrl = new URL(`/api/groups/${groupId}/dashboard`, Astro.url);
const dashboardRes = await fetch(dashboardUrl); // ❌ Brak sesji
const body = await dashboardRes.json();
const dashboardDto = body.data;
```

### Po (DOBRE ✅)

```typescript
// dashboard.astro
import { getDashboard } from "@/lib/services/dashboard.service";
import { getGroupPermissions } from "@/lib/services/permissions.service";

const supabase = Astro.locals.supabase;
const userId = Astro.locals.user?.id;

// ✅ Bezpośrednie wywołanie funkcji serwisowej
const dashboardResult = await getDashboard(supabase, groupId, userId);

if ("error" in dashboardResult) {
  // Handle error
} else {
  dashboardDto = dashboardResult.data;
}
```

### Zalety nowego podejścia

1. ✅ **Sesja jest zachowana** - używamy `Astro.locals.supabase` i `Astro.locals.user`
2. ✅ **Szybsze** - bez overhead HTTP request
3. ✅ **Prostsze** - mniej kodu do obsługi błędów
4. ✅ **Bezpieczniejsze** - nie ma ryzyka wycieku sesji
5. ✅ **Spójne** - ten sam Supabase client w całym SSR

## 📝 Zmienione pliki

### `src/pages/groups/[group_id]/dashboard.astro`

**Zmieniono:**
- Usunięto wywołania `fetch()` do własnych API
- Dodano bezpośrednie importy funkcji serwisowych
- Dodano pobieranie `supabase` i `userId` z `Astro.locals`
- Zmieniono logikę pobierania danych na bezpośrednie wywołania

**Przed:**
```typescript
const dashboardUrl = new URL(`/api/groups/${groupId}/dashboard`, Astro.url);
const [dashboardRes, permissionsRes, groupRes] = await Promise.all([
  fetch(dashboardUrl),
  fetch(permissionsUrl),
  fetch(groupUrl),
]);
```

**Po:**
```typescript
const supabase = Astro.locals.supabase;
const userId = Astro.locals.user?.id;

const [dashboardResult, permissionsResult] = await Promise.all([
  getDashboard(supabase, groupId, userId),
  getGroupPermissions(supabase, groupId, userId!),
]);
```

## 🧪 Testowanie

### Test 1: Dashboard własnej grupy

**Kroki:**
1. Zaloguj się
2. Utwórz nową grupę lub otwórz istniejącą
3. Kliknij na grupę lub wejdź na `/groups/[group_id]/dashboard`

**✅ Oczekiwany rezultat:**
- Dashboard ładuje się poprawnie
- Widoczny tytuł grupy
- Widoczne kafelki ze statystykami
- Brak błędu "Group not found"
- Brak błędów 401/404 w logach

### Test 2: Weryfikacja w logach

**Kroki:**
1. Uruchom `npm run dev`
2. Zaloguj się i otwórz dashboard grupy
3. Sprawdź logi serwera

**✅ Oczekiwany rezultat:**
- Brak komunikatów "Auth session missing!"
- Brak requestów 401/404
- Tylko jedno żądanie do strony `.astro` (200 OK)

## 🏗️ Wzorzec: Kiedy używać fetch() vs bezpośrednie wywołania?

### Użyj `fetch()` gdy:

1. **Request z przeglądarki (client-side)** - React komponenty
   ```typescript
   // W komponencie React
   const response = await fetch('/api/groups');
   ```

2. **Zewnętrzne API** - komunikacja z innymi serwisami
   ```typescript
   const response = await fetch('https://api.external.com/data');
   ```

### Użyj **bezpośrednich wywołań** gdy:

1. **Server-side rendering w Astro** - pliki `.astro`
   ```typescript
   // dashboard.astro
   import { getDashboard } from "@/lib/services/dashboard.service";
   const result = await getDashboard(Astro.locals.supabase, groupId, userId);
   ```

2. **API routes wywołujące inne serwisy** - pliki w `src/pages/api/`
   ```typescript
   // api/groups/[id]/dashboard.ts
   import { getDashboard } from "@/lib/services/dashboard.service";
   const result = await getDashboard(context.locals.supabase, groupId, userId);
   ```

## 📚 Inne strony wymagające podobnej zmiany

Sprawdź czy te strony również używają `fetch()` do własnych API:

- ⏳ `/groups/[group_id]/settings.astro`
- ⏳ `/groups/[group_id]/members.astro`
- ⏳ `/groups/[group_id]/tasks.astro`
- ⏳ `/groups/[group_id]/activities.astro`
- ⏳ `/groups/[group_id]/camp-days.astro`
- ⏳ `/groups/[group_id]/camp-days/[camp_day_id]/index.astro`

Jeśli tak, zastosuj to samo rozwiązanie.

## 💡 Dodatkowe uwagi

### Dlaczego Astro nie przekazuje cookies automatycznie?

1. **Bezpieczeństwo** - cookies z sesją nie powinny być przekazywane do zewnętrznych API
2. **Jawność** - developer musi świadomie decydować o przekazywaniu credentials
3. **SSR design** - Astro zakłada, że używasz `Astro.locals` do współdzielenia danych między middleware a stronami

### Alternatywne rozwiązanie (NIE zalecane)

Można przekazać cookies w `fetch()`:

```typescript
// ⚠️ NIE ZALECANE - skomplikowane i podatne na błędy
const response = await fetch(url, {
  headers: {
    'Cookie': Astro.request.headers.get('Cookie') || '',
  },
  credentials: 'include',
});
```

**Problemy:**
- ❌ Trzeba ręcznie zarządzać cookies
- ❌ Łatwo zapomnieć w niektórych miejscach
- ❌ Wolniejsze (overhead HTTP)
- ❌ Nie działa dla wszystkich przypadków (np. refresh token)

## ✅ Status

- ✅ Naprawa zaimplementowana w `dashboard.astro`
- ✅ Brak błędów lintowania
- ⏳ Wymaga testowania przez użytkownika
- ⏳ Zalecane sprawdzenie innych stron `.astro`

## 📚 Powiązane dokumenty

- `.ai/security-fix-groups-filtering.md` - Naprawa #1: Filtrowanie listy grup
- `.ai/security-fix-single-group-access.md` - Naprawa #2: Weryfikacja członkostwa
- `.ai/auth-integration-complete.md` - Dokumentacja integracji Supabase Auth

