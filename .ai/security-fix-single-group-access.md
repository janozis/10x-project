# 🔒 Naprawa bezpieczeństwa: Weryfikacja członkostwa dla pojedynczej grupy

## 🔴 Wykryty problem #2

**Poważna luka bezpieczeństwa:** Endpoint `GET /api/groups/[group_id]` zwracał dane grupy bez sprawdzania czy użytkownik jest jej członkiem.

### Przyczyna

W endpoincie `/api/groups/[group_id].ts` brakowało weryfikacji członkostwa:

```typescript
// ❌ PRZED - ZŁA IMPLEMENTACJA
export const GET: APIRoute = async (context) => {
  const { data: row, error } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .maybeSingle();
  // Brak sprawdzenia czy user jest członkiem!
```

### Konsekwencje

- ❌ Użytkownik mógł pobrać dane dowolnej grupy znając jej UUID
- ❌ Wyciek nazw, opisów, dat, motywów lore innych grup
- ❌ Naruszenie prywatności
- ❌ Strona `/groups/[group_id]/dashboard` wyświetlała błąd "Group not found" nawet dla własnych grup

### Objawy u użytkownika

Użytkownik zgłosił:
> "wszedłem w swoją nowo stworzoną grupę i mam błąd: Group not found mimo, że tytuł grupy się zgadza"

Problem wynikał z tego, że po naprawieniu `listGroups()` (która teraz filtruje po członkostwie), middleware zaczął poprawnie ustawiać `locals.user.id` z prawdziwym UUID użytkownika, ale endpoint `GET /api/groups/[group_id]` **nie sprawdzał członkostwa**, więc zwracał 404.

## ✅ Rozwiązanie

Dodano **weryfikację członkostwa** przed zwróceniem danych grupy:

### Krok 1: Sprawdź członkostwo

```typescript
// First, verify user is a member of this group
const { data: membership, error: membershipError } = await supabase
  .from("group_memberships")
  .select("user_id")
  .eq("group_id", groupId)
  .eq("user_id", userId)
  .maybeSingle();

// If user is not a member, return 404 (don't reveal group existence)
if (!membership) {
  return new Response(JSON.stringify(errors.notFound("Group")), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}
```

### Krok 2: Zwróć dane grupy

```typescript
// User is a member, now fetch the group
const { data: row, error } = await supabase
  .from("groups")
  .select("*")
  .eq("id", groupId)
  .maybeSingle();
```

### Uwaga: 404 zamiast 403

Celowo zwracamy **404 (Not Found)** zamiast **403 (Forbidden)** dla użytkowników niebędących członkami. To dobra praktyka bezpieczeństwa - nie ujawniamy, czy grupa o danym ID w ogóle istnieje.

## 📝 Zmienione pliki

### `src/pages/api/groups/[group_id].ts`

**Zmieniono:**
- Dodano import `DEFAULT_USER_ID`
- Dodano pobieranie `userId` z `context.locals.user?.id`
- Dodano weryfikację członkostwa przed zwróceniem danych

**Przed:**
```typescript
export const GET: APIRoute = async (context) => {
  const groupId = context.params.group_id;
  // ... validation ...
  const { data: row } = await supabase.from("groups").select("*").eq("id", groupId).maybeSingle();
  // BRAK SPRAWDZENIA CZŁONKOSTWA!
```

**Po:**
```typescript
export const GET: APIRoute = async (context) => {
  const groupId = context.params.group_id;
  const userId = context.locals.user?.id || DEFAULT_USER_ID;
  
  // Sprawdź członkostwo
  const { data: membership } = await supabase
    .from("group_memberships")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  
  if (!membership) {
    return 404; // User nie jest członkiem
  }
  
  // Teraz pobierz grupę
  const { data: row } = await supabase.from("groups").select("*")...
```

## 🧪 Testowanie

### Test 1: Dostęp do własnej grupy

**Kroki:**
1. Zaloguj się
2. Utwórz nową grupę
3. Kliknij na grupę z listy lub wejdź na `/groups/[group_id]/dashboard`

**✅ Oczekiwany rezultat:**
- Dashboard się ładuje poprawnie
- Widoczne są kafelki, statystyki, zadania
- Brak błędu "Group not found"

### Test 2: Próba dostępu do cudzej grupy

**Kroki:**
1. Zaloguj się jako użytkownik A
2. Skopiuj UUID swojej grupy
3. Wyloguj się
4. Zaloguj się jako użytkownik B
5. Spróbuj wejść na `/groups/[uuid_z_punktu_2]/dashboard`

**✅ Oczekiwany rezultat:**
- Błąd 404 "Group not found"
- Brak dostępu do danych grupy użytkownika A

### Test 3: Weryfikacja w DevTools

**Kroki:**
1. Zaloguj się
2. Otwórz DevTools → Network
3. Wejdź na dashboard swojej grupy
4. Sprawdź request `GET /api/groups/[group_id]`

**✅ Oczekiwany rezultat:**
- Status 200 OK
- Response zawiera dane grupy
- Wszystkie kolejne requesty (permissions, dashboard) też działają

## 🔒 Warstwa obronna (Defense in Depth)

### Już zaimplementowane:

1. ✅ **Middleware** - weryfikuje sesję użytkownika
2. ✅ **Filtrowanie listy grup** - `listGroups()` zwraca tylko grupy użytkownika
3. ✅ **Weryfikacja pojedynczej grupy** - `GET /api/groups/[group_id]` sprawdza członkostwo

### Zalecane (opcjonalnie):

**RLS (Row Level Security) w Supabase:**

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
```

## 📊 Inne endpointy wymagające weryfikacji

Sprawdź czy te endpointy również weryfikują członkostwo:

- ✅ `/api/groups/[group_id]/dashboard` - już sprawdza (widziałem w kodzie)
- ✅ `/api/groups/[group_id]/permissions` - już sprawdza (widziałem w kodzie)
- ⏳ `/api/groups/[group_id]/activities` - wymaga sprawdzenia
- ⏳ `/api/groups/[group_id]/tasks` - wymaga sprawdzenia
- ⏳ `/api/groups/[group_id]/members` - wymaga sprawdzenia
- ⏳ `/api/groups/[group_id]/camp-days` - wymaga sprawdzenia

## ✅ Status

- ✅ Naprawa zaimplementowana w `GET /api/groups/[group_id]`
- ✅ Brak błędów lintowania
- ⏳ Wymaga testowania przez użytkownika
- ⏳ Zalecane sprawdzenie innych endpointów `/api/groups/[group_id]/*`

## 📚 Powiązane dokumenty

- `.ai/security-fix-groups-filtering.md` - Naprawa #1: Filtrowanie listy grup
- `.ai/auth-integration-complete.md` - Dokumentacja integracji Supabase Auth

