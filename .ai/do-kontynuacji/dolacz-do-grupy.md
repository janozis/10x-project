# Podsumowanie pracy: Testy E2E - Dołączanie do Grupy

**Data:** 2025-11-08  
**Status:** W trakcie - główny problem rozwiązany, testy wymagają dalszej pracy

## 🎯 Cel

Naprawienie testów E2E dla funkcjonalności dołączania do grupy (`e2e/groups-join.spec.ts`), które były całkowicie skip'owane.

## 🔧 Wykonane Zmiany

### 1. Dodanie `data-test-id` do przycisku wylogowania
- **Plik:** `src/components/navigation/Topbar.tsx`
- **Zmiana:** Dodano `data-test-id="topbar-logout-button"` do przycisku wylogowania
- **Powód:** Testy muszą móc kliknąć w przycisk wylogowania podczas scenariuszy z dwoma użytkownikami

### 2. Aktualizacja funkcji `logoutUser` w test helpers
- **Plik:** `e2e/test-helpers.ts`
- **Zmiana:** Przepisano z API call na kliknięcie w przycisk UI za pomocą `getByRole('button', { name: /wyloguj/i })`
- **Powód:** Symulacja prawdziwego zachowania użytkownika + pewność że sesja jest czyszczona

### 3. Dodanie drugiego użytkownika testowego
- **Plik:** `e2e/page-objects/LoginPage.ts`
- **Zmiana:** Dodano metodę `loginWithSecondTestUser()` wykorzystującą zmienne `E2E_2_USERNAME` i `E2E_2_PASSWORD`
- **Wymagane zmienne env:** `E2E_2_USERNAME`, `E2E_2_PASSWORD`, `E2E_2_USER_ID`

### 4. Aktualizacja selektorów w Page Objects
Zmieniono z `getByTestId` na bardziej dostępne selektory:

#### `LoginPage.ts`
- Email: `getByLabel('Email', { exact: true })`
- Hasło: `getByLabel('Hasło', { exact: true })`  
- Przycisk: `getByRole('button', { name: 'Zaloguj' })`
- Dodano oczekiwanie na pełne załadowanie strony (`networkidle` + 1s na React hydration)

#### `JoinGroupDialog.ts`
- Dialog: `getByRole('dialog', { name: 'Dołącz do grupy' })`
- Input: `getByLabel('Kod zaproszenia')`
- Error: `getByRole('alert')`
- Przyciski: `getByRole('button', { name: ... })`
- Zwiększono czas oczekiwania na hydration React (2s)

### 5. Usunięcie formatowania kodu zaproszenia ze spacjami
- **Plik:** `src/components/groups/JoinGroupDialog.tsx`
- **Zmiana:** Usunięto `formatInviteCodeMasked()` - pole pokazuje teraz czysty kod bez spacji
- **Powód:** Formatowanie "ABCD EFGH" powodowało problemy - backend wymaga czystego kodu
- **Przed:** `value={masked}` → **Po:** `value={codeValue}`

### 6. **🐛 KRYTYCZNA NAPRAWA: Brak `invite_expires_at` w bazie danych**
- **Problem:** Nowo tworzone grupy miały `invite_expires_at = NULL`, co powodowało błąd "Group not found" przy próbie dołączenia
- **Plik:** `supabase/migrations/20251108000000_fix_invite_expires_at.sql`
- **Zmiany:**
  1. UPDATE istniejących grup z NULL → 30 dni od teraz
  2. Modyfikacja `create_group_with_membership()` aby ustawiała `invite_expires_at = NOW() + INTERVAL '30 days'`
- **Status:** ✅ Migracja zastosowana do testowej bazy danych

### 7. Aktualizacja przepływu testów
Wszystkie testy przepisane na poprawny flow:
1. **User A** (E2E_USERNAME) - tworzy grupę
2. Kopiowanie kodu zaproszenia z przycisku "Kopiuj kod" (`getByRole('button', { name: 'Kopiuj kod' })`)
3. Wylogowanie User A (przycisk UI)
4. **User B** (E2E_2_USERNAME) - logowanie
5. User B otwiera dialog "Dołącz do grupy"
6. Wpisanie kodu i dołączenie

## 📊 Status Testów

### ✅ Działające elementy:
- Tworzenie grupy przez User A
- Kopiowanie kodu zaproszenia do schowka
- Wylogowanie User A
- Logowanie User B
- Otwieranie dialogu dołączania
- Wpisywanie kodu (bez formatowania)

### ❌ Problem do rozwiązania:
**Błąd:** "Group not found" mimo że:
- Grupa istnieje w bazie danych
- Kod jest poprawny (`73byjz9b` w ostatnim teście)
- `invite_expires_at` jest teraz ustawione (30 dni od teraz)

## 🔍 Do debugowania

1. **Sprawdzić zapytanie w `joinGroupByCode()`** (`src/lib/services/groups.service.ts:328-335`):
   ```typescript
   const { data: groups, error: findErr } = await supabase
     .from("groups")
     .select("*")
     .eq("invite_code", code)
     .limit(1);
   ```
   - Czy kod jest case-sensitive?
   - Czy RLS policies blokują dostęp?

2. **Sprawdzić logi backendu** przy próbie dołączenia
   - Włączyć debug mode w `groups.service.ts`
   - Sprawdzić czy zapytanie znajduje grupę

3. **Sprawdzić RLS policies** na tabeli `groups`:
   - Czy niezalogowany/drugi użytkownik może czytać grupy po `invite_code`?
   - Możliwy problem z polityką SELECT

## 📝 Pliki zmodyfikowane

```
src/components/navigation/Topbar.tsx
src/components/groups/JoinGroupDialog.tsx
e2e/test-helpers.ts
e2e/page-objects/LoginPage.ts
e2e/page-objects/JoinGroupDialog.ts
e2e/groups-join.spec.ts (wszystkie testy przepisane)
supabase/migrations/20251108000000_fix_invite_expires_at.sql (NOWA)
```

## 🎯 Następne kroki

1. **Debug RLS policies** - sprawdzić czy drugi użytkownik może czytać grupy po invite_code
2. **Dodać logging** w `joinGroupByCode()` aby zobaczyć dokładnie co się dzieje
3. **Sprawdzić czy kod jest lowercase'owany** zarówno przy zapisie jak i przy szukaniu
4. Po naprawie uruchomić wszystkie 6 testów jednocześnie
5. Rozważyć dodanie testu integracyjnego dla samego API `/api/groups/join`

## 💡 Wnioski

- **Formatowanie UI:** Lepiej nie formatować kodów jeśli mają być kopiowane - dodaje tylko problemy
- **React hydration:** Wymaga czasu - zawsze czekać 1-2s po załadowaniu strony przed interakcją
- **Accessible selectors:** `getByRole()` i `getByLabel()` są bardziej niezawodne niż `getByTestId()`
- **Database migrations:** Ważne aby ustawiać sensowne defaulty (jak `invite_expires_at`)
- **Test environment:** Drugi użytkownik testowy jest niezbędny dla scenariuszy multi-user

---

**Ostatnia aktualizacja:** 2025-11-08  
**Czas pracy:** ~3 godziny  
**Główny sukces:** ✅ Rozwiązano problem z brakiem `invite_expires_at`  
**Do rozwiązania:** ❌ Problem z RLS policies lub case-sensitivity kodu

