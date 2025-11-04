# 🔒 Naprawa bezpieczeństwa: Filtrowanie grup po członkostwie

## 🔴 Wykryty problem

**Poważna luka bezpieczeństwa:** Użytkownicy widzieli WSZYSTKIE grupy w systemie, niezależnie od tego, czy do nich należeli.

### Przyczyna

W funkcji `listGroups()` w `src/lib/services/groups.service.ts` brakowało filtrowania po członkostwie użytkownika:

```typescript
// ❌ PRZED - ZŁA IMPLEMENTACJA
export async function listGroups(
  supabase: SupabaseClient,
  options?: { deleted?: boolean; limit?: number; cursor?: string }
): Promise<ApiListResponse<GroupDTO>> {
  let query = supabase
    .from("groups")
    .select("*")
    .order("created_at", { ascending: false })
    // BRAK FILTROWANIA - zwraca WSZYSTKIE grupy!
```

### Konsekwencje

- ❌ Użytkownik widział grupy innych użytkowników
- ❌ Mógł zobaczyć nazwy, opisy, daty grup do których nie należy
- ❌ Naruszenie prywatności i RODO
- ❌ Potencjalny wyciek danych wrażliwych

## ✅ Rozwiązanie

Dodano **dwuetapowe filtrowanie** wykorzystujące tabelę `group_memberships`:

### Krok 1: Pobierz grupy użytkownika

Najpierw pobieramy listę ID grup, do których użytkownik należy:

```typescript
const { data: memberships, error: membershipErr } = await supabase
  .from("group_memberships")
  .select("group_id")
  .eq("user_id", effectiveUserId);

const groupIds = (memberships ?? []).map((m) => m.group_id);
```

### Krok 2: Filtruj grupy po ID

Następnie pobieramy tylko te grupy, których ID znajduje się na liście:

```typescript
let query = supabase
  .from("groups")
  .select("*")
  .in("id", groupIds)  // ✅ FILTROWANIE!
  .order("created_at", { ascending: false });
```

### Obsługa pustej listy

Jeśli użytkownik nie należy do żadnej grupy, zwracamy pustą listę:

```typescript
if (groupIds.length === 0) {
  return { data: [], count: 0 };
}
```

## 📝 Zmienione pliki

### 1. `src/lib/services/groups.service.ts`

**Zmieniono:**
- Funkcja `listGroups()` - dodano parametr `userId`
- Dodano filtrowanie przez `group_memberships`
- Dodano obsługę przypadku, gdy użytkownik nie ma grup

**Przed:**
```typescript
export async function listGroups(
  supabase: SupabaseClient,
  options?: { deleted?: boolean; limit?: number; cursor?: string }
)
```

**Po:**
```typescript
export async function listGroups(
  supabase: SupabaseClient,
  options?: { deleted?: boolean; limit?: number; cursor?: string; userId?: string }
)
```

### 2. `src/pages/api/groups.ts`

**Zmieniono:**
- Endpoint `GET /api/groups` - dodano przekazywanie `userId`
- Pobieramy `userId` z `context.locals.user?.id`
- Przekazujemy do `listGroups()`

**Przed:**
```typescript
const result = await listGroups(supabase, { deleted, limit, cursor: cursorParam ?? undefined });
```

**Po:**
```typescript
const result = await listGroups(supabase, { 
  deleted, 
  limit, 
  cursor: cursorParam ?? undefined,
  userId: userId || DEFAULT_USER_ID
});
```

## 🧪 Testowanie

### Test 1: Nowy użytkownik bez grup

**Kroki:**
1. Zaloguj się jako nowy użytkownik
2. Otwórz `/groups`

**✅ Oczekiwany rezultat:**
- Widzisz komunikat "Brak grup"
- Lista jest PUSTA
- NIE widzisz grup innych użytkowników

### Test 2: Użytkownik z grupami

**Kroki:**
1. Zaloguj się jako użytkownik A
2. Utwórz grupę "Grupa A"
3. Wyloguj się
4. Zaloguj się jako użytkownik B
5. Otwórz `/groups`

**✅ Oczekiwany rezultat:**
- Użytkownik B NIE widzi "Grupa A"
- Widzisz tylko swoje grupy lub te, do których dołączyłeś

### Test 3: Weryfikacja w DevTools

**Kroki:**
1. Zaloguj się
2. Otwórz DevTools → Network
3. Otwórz `/groups`
4. Sprawdź request `GET /api/groups`
5. Sprawdź response

**✅ Oczekiwany rezultat:**
- Response zawiera tylko grupy, do których należysz
- `data` array nie zawiera grup innych użytkowników

### Test 4: Weryfikacja członkostwa

**Kroki:**
1. Utwórz grupę
2. Dołącz do grupy przez kod
3. Odśwież `/groups`

**✅ Oczekiwany rezultat:**
- Widzisz zarówno grupy utworzone przez siebie
- Jak i grupy, do których dołączyłeś

## 🔒 Warstwa obronna (Defense in Depth)

Ta naprawa działa na **poziomie aplikacji**, ale zalecamy również włączyć **RLS (Row Level Security)** w Supabase jako dodatkową warstwę ochrony:

```sql
-- Włącz RLS dla tabeli groups
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Polityka: użytkownik widzi tylko grupy, do których należy
CREATE POLICY "Users see only their groups" ON groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = groups.id
        AND group_memberships.user_id = auth.uid()
    )
  );

-- Polityka: tylko członkowie mogą wstawiać grupy
CREATE POLICY "Authenticated users can create groups" ON groups
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Polityka: tylko admini mogą aktualizować
CREATE POLICY "Only admins can update groups" ON groups
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = groups.id
        AND group_memberships.user_id = auth.uid()
        AND group_memberships.role = 'admin'
    )
  );
```

## 📊 Wpływ na wydajność

### Obecne rozwiązanie:
- **2 query do bazy:**
  1. `SELECT group_id FROM group_memberships WHERE user_id = ?`
  2. `SELECT * FROM groups WHERE id IN (...)`

### Optymalizacja (future):
Można użyć jednego query z JOIN:
```typescript
const { data: rows } = await supabase
  .from("groups")
  .select("*, group_memberships!inner(user_id)")
  .eq("group_memberships.user_id", userId);
```

Ale obecne rozwiązanie jest **bezpieczniejsze i czytelniejsze** dla MVP.

## ⚠️ Ważne uwagi

1. **DEFAULT_USER_ID jako fallback**
   - Używany tylko wtedy, gdy middleware nie ustawi `locals.user.id`
   - Po poprawnym zalogowaniu, zawsze używany jest prawdziwy UUID użytkownika

2. **Backward compatibility**
   - Stare serwisy używające `listGroups()` będą działać z `DEFAULT_USER_ID`
   - Zalecane jest aktualizowanie wszystkich wywołań aby przekazywały `userId`

3. **RLS w Supabase**
   - Dodatkowa warstwa ochrony
   - Zalecane włączenie dla produkcji
   - NIE zastępuje filtrowania w aplikacji

## ✅ Status

- ✅ Naprawa zaimplementowana
- ✅ Brak błędów lintowania
- ⏳ Wymaga testowania przez użytkownika
- ⏳ Zalecane włączenie RLS w Supabase (opcjonalnie)

## 📚 Powiązane dokumenty

- `.ai/auth-integration-complete.md` - Dokumentacja integracji Supabase Auth
- `.ai/auth-spec.md` - Specyfikacja techniczna modułu uwierzytelniania

