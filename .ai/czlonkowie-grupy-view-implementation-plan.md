## Plan implementacji widoku Członkowie grupy

## 1. Przegląd
Widok służy do zarządzania członkami grupy HAL oraz ich rolami. Umożliwia przegląd listy członków, wyszukiwanie, filtrowanie po roli, sortowanie po dacie dołączenia (domyślnie rosnąco), zmianę ról (tylko admin), usuwanie członków (admin lub sam użytkownik) i promowanie do roli admin. Widok respektuje uprawnienia użytkownika oraz ograniczenia backendu (co najmniej jeden admin w grupie).

## 2. Routing widoku
- Ścieżka: `/groups/{group_id}/members`
- Plik strony: `src/pages/groups/[group_id]/members.astro`
- Hydratacja komponentu React: klientowe (`client:load`/`client:visible`) dla interakcji tabeli, filtrów i akcji.

## 3. Struktura komponentów
```
src/pages/groups/[group_id]/members.astro
  └─ <GroupMembersView groupId /> (React, src/components/groups/GroupMembersView.tsx)
      ├─ <MembersToolbar ... />
      ├─ <GroupMembersTable ... />
      │   ├─ <RoleBadge role />
      │   ├─ <RoleSelect role disabled onChange /> (tylko admin)
      │   └─ <MemberActions onPromote onRemove disabledFlags /> (tylko admin lub self-remove)
      └─ <ConfirmDialog ... /> (Shadcn AlertDialog)
```

## 4. Szczegóły komponentów
### GroupMembersView
- Opis: Kontener widoku. Odpowiada za pobranie uprawnień i listy członków, utrzymanie stanu filtrów i sortowania, przekazanie callbacków do akcji (zmiana roli, usunięcie, promocja), prezentację stanów ładowania/pustki/błędów.
- Główne elementy: nagłówek sekcji (opcjonalnie reuse `GroupsHeader`), `MembersToolbar`, `GroupMembersTable`, `ConfirmDialog` do potwierdzeń destruktywnych.
- Obsługiwane interakcje:
  - Zmiana filtrów (q, rola) → filtrowanie klientowe listy.
  - Zmiana sortowania (joined_at asc/desc) → sortowanie klientowe.
  - Zmiana roli członka → `PATCH /api/groups/{group_id}/members/{user_id}`.
  - Promocja do admina → `POST /api/groups/{group_id}/members/{user_id}/promote`.
  - Usunięcie członka (confirm) → `DELETE /api/groups/{group_id}/members/{user_id}`.
- Walidacja/UI guards:
  - Zmiana roli dostępna tylko gdy `permissions.role === 'admin'`.
  - Usunięcie: admin może usunąć innych; użytkownik może usunąć samego siebie, ale nie gdy to jedyny admin.
  - Blokada akcji, jeśli lokalnie wychodzi, że to ostatni admin (liczba adminów == 1 i cel jest admin).
- Typy: `GroupMemberDTO`, `GroupPermissionsDTO`, `MemberRowVM`, `MembersFiltersVM`, `MembersSort` (sekcja 5).
- Propsy: `{ groupId: UUID }`.

### MembersToolbar
- Opis: Pasek narzędzi listy: wyszukiwarka tekstowa, filtr roli, przełącznik sortowania.
- Elementy: `Input` (Shadcn), `Select` (rola: all/admin/editor/member), `Button` (sort asc/desc), `Badge` z liczbą wyników.
- Interakcje: onSearchChange, onRoleFilterChange, onSortToggle, onClear.
- Walidacja: brak (proste dane wejściowe), przy roli wymuszony enum.
- Typy: `MembersFiltersVM`, `MembersSort`.
- Propsy: `{ filters, sort, onChangeFilters, onChangeSort }`.

### GroupMembersTable
- Opis: Tabela danych z kolumnami: Użytkownik, Rola, Dołączył (joined_at), Akcje.
- Elementy: `Table` (Shadcn), w komórkach: `RoleBadge`, `RoleSelect` (gdy admin), `MemberActions` (promote/remove), Tooltipy.
- Interakcje: onRoleChange(row, newRole), onPromote(row), onRemove(row) → wywołania callbacków z widoku.
- Walidacja/UI guards: wyłączenie/ukrycie akcji w oparciu o `row.canEditRole`, `row.canPromote`, `row.canRemove`.
- Typy: `MemberRowVM`.
- Propsy: `{ rows: MemberRowVM[], isLoading: boolean, onChangeRole, onPromote, onRemove, sort, onSortChange }`.

### RoleBadge
- Opis: Odznaka roli do szybkiego rozróżnienia.
- Elementy: `Badge` (Shadcn) z wariantem zależnym od roli.
- Typy: `GroupRole`.
- Propsy: `{ role: GroupRole }`.

### RoleSelect
- Opis: Selektor zmiany roli (tylko dla adminów). Zmiana bez dodatkowego potwierdzenia, ale z wycofaniem przy błędzie.
- Elementy: `Select` (Shadcn) z opcjami: admin, editor, member.
- Walidacja: nowa rola ∈ {'admin','editor','member'}; zablokowane, jeśli wiersz to jedyny admin i zmiana obniża rolę.
- Typy: `GroupRole`.
- Propsy: `{ value: GroupRole, disabled: boolean, onChange: (role: GroupRole) => void }`.

### MemberActions
- The purpose: Przyciski akcji kontekstowych wiersza: Promote to admin, Remove member/Leave group.
- Elementy: `Button` (Shadcn), `DropdownMenu` (opcjonalnie), `Tooltip`.
- Interakcje: click Promote → POST promote; click Remove/Leave → wyświetl `ConfirmDialog` i po potwierdzeniu DELETE.
- Walidacja/UI guards: disable, gdy brak uprawnień lub ostatni admin.
- Propsy: `{ canPromote: boolean, canRemove: boolean, isSelf: boolean, onPromote: () => void, onRemove: () => void }`.

### ConfirmDialog
- Opis: Dialog potwierdzenia usunięcia członka; informuje o odpięciu od aktywności/zadań oraz o polityce „ostatni admin”.
- Elementy: `AlertDialog` (Shadcn) z tytułem, opisem, anuluj/potwierdź.
- Propsy: `{ open: boolean, onConfirm: () => void, onCancel: () => void, title: string, description?: string }`.

## 5. Typy
Wykorzystanie istniejących typów oraz definicje ViewModeli.

- Istniejące (z `src/types.ts`):
  - `UUID`, `TimestampISO`, `GroupRole` ('admin'|'editor'|'member')
  - `GroupMemberDTO` = `{ user_id: UUID; role: GroupRole; joined_at: TimestampISO } & { group_id: UUID }`
  - `GroupPermissionsDTO` = `{ group_id: UUID; role: GroupRole; can_edit_all: boolean; can_edit_assigned_only: boolean }`
  - `ApiListResponse<T>`, `ApiResponse<T>`, `ApiError`

- Nowe (ViewModel dla UI):
```ts
type MembersFiltersVM = {
  q: string; // wyszukiwanie po user_id (MVP)
  role?: GroupRole | 'all';
};

type MembersSort = {
  by: 'joined_at';
  direction: 'asc' | 'desc';
};

type MemberRowVM = {
  userId: UUID;
  role: GroupRole;
  joinedAt: TimestampISO;
  isSelf: boolean;
  canEditRole: boolean;
  canPromote: boolean;
  canRemove: boolean; // admin może usunąć innych; self może usunąć siebie (nie ostatni admin)
};
```

## 6. Zarządzanie stanem
- Stan w `GroupMembersView`:
  - `permissions: GroupPermissionsDTO | null` (ładowane na starcie)
  - `members: GroupMemberDTO[]` + `isLoadingMembers`, `errorMembers`
  - Wyliczone `adminCount`, `currentUserId` (z auth klienta)
  - `filters: MembersFiltersVM` (q, role)
  - `sort: MembersSort` (domyślnie { by: 'joined_at', direction: 'asc' })
  - `confirmState: { open: boolean; userId?: UUID }`
- Hooki (custom):
  - `usePermissions(groupId)` → GET permissions (cache + refetch na zmianę groupId)
  - `useMembers(groupId)` → GET members; expose `refetch()`, „optimistic update” helpers
  - Alternatywnie pojedynczy `useGroupMembers(groupId)` agregujący oba wywołania i udostępniający akcje: `changeRole`, `promote`, `remove` (z obsługą optimistic + rollback na błędzie).
- Filtrowanie/sortowanie: klientowe na `MemberRowVM[]` (backend nie opisuje parametrów filtrujących dla GET members).

## 7. Integracja API
- Endpoints:
  - `GET /api/groups/{group_id}/members` → `ApiListResponse<GroupMemberDTO>`
  - `PATCH /api/groups/{group_id}/members/{user_id}` body: `GroupMembershipRoleChangeCommand` → `ApiResponse<GroupMemberDTO>`
  - `DELETE /api/groups/{group_id}/members/{user_id}` → `204 No Content` (bez body)
  - `POST /api/groups/{group_id}/members/{user_id}/promote` → `ApiResponse<GroupMemberDTO>`
  - `GET /api/groups/{group_id}/permissions` → `ApiResponse<GroupPermissionsDTO>`

- Warstwy klienta (w `src/lib/services/`):
```ts
async function listMembers(groupId: UUID): Promise<ApiListResponse<GroupMemberDTO>>
async function changeMemberRole(groupId: UUID, userId: UUID, role: GroupRole): Promise<ApiResponse<GroupMemberDTO>>
async function removeMember(groupId: UUID, userId: UUID): Promise<void> // 204
async function promoteMember(groupId: UUID, userId: UUID): Promise<ApiResponse<GroupMemberDTO>>
async function fetchPermissions(groupId: UUID): Promise<ApiResponse<GroupPermissionsDTO>>
```

- Mapowanie do ViewModel:
```ts
function toRowVM(m: GroupMemberDTO, permissions: GroupPermissionsDTO, currentUserId: UUID, adminCount: number): MemberRowVM {
  const isSelf = m.user_id === currentUserId;
  const isAdmin = m.role === 'admin';
  const isLastAdmin = isAdmin && adminCount === 1;
  const userIsAdmin = permissions.role === 'admin';
  return {
    userId: m.user_id,
    role: m.role,
    joinedAt: m.joined_at,
    isSelf,
    canEditRole: userIsAdmin && !isLastAdmin, // nie można zdegradować ostatniego admina
    canPromote: userIsAdmin && !isAdmin,      // promuj tylko nie-adminów
    canRemove: (userIsAdmin && (!isLastAdmin || !isAdmin)) || (isSelf && !isLastAdmin),
  };
}
```

## 8. Interakcje użytkownika
- Wpis w wyszukiwarce → odfiltrowanie wierszy (po `userId`, MVP).
- Zmiana filtra roli → ograniczenie listy do wybranej roli lub „Wszyscy”.
- Przełącznik sortowania → zmiana kierunku sortowania po `joined_at`.
- Zmiana roli w wierszu (admin): natychmiastowa aktualizacja (optimistic), w razie błędu rollback i komunikat.
- Promocja do admina (admin): natychmiastowa aktualizacja (optimistic), w razie błędu rollback.
- Usunięcie członka: wyświetlenie `ConfirmDialog` z informacją o konsekwencjach; po potwierdzeniu DELETE.
- Samousunięcie (leave): dostępne dla bieżącego użytkownika, jeżeli nie jest jedynym adminem.

## 9. Warunki i walidacja
- Role: wejście musi należeć do `GroupRole` (frontend: select, backend: 400 ROLE_INVALID).
- Ostatni admin: UI blokuje degradację/usunięcie, gdy `adminCount === 1` i dotyczy admina; dodatkowo obsługa 409 `LAST_ADMIN_REMOVAL` z backendu.
- Uprawnienia: akcje roli/promocji dostępne tylko dla `permissions.role === 'admin'`.
- Usuwanie innych: tylko admin; usuwanie siebie: dowolny użytkownik, ale nie ostatni admin.

## 10. Obsługa błędów
- `409 LAST_ADMIN_REMOVAL`: komunikat „Nie można usunąć ani zdegradować ostatniego administratora”.
- `400 ROLE_INVALID`: komunikat „Wybrano nieprawidłową rolę”.
- `403/401`: komunikat „Brak uprawnień do wykonania akcji” i ukrycie/wyłączenie akcji.
- `404`: komunikat „Grupa nie istnieje” + nawigacja do `/groups`.
- Sieć/5xx: toast błędu z opcją „Spróbuj ponownie”; wycofanie optimistic update.

## 11. Kroki implementacji
1) Serwisy API (jeśli brak/uzupełnienie): w `src/lib/services/group-memberships.service.ts` zaimplementować `listMembers`, `changeMemberRole`, `removeMember`, `promoteMember`; doprecyzować `permissions.service.ts` → `fetchPermissions`.
2) Typy: wykorzystać `GroupMemberDTO`, `GroupPermissionsDTO`; dodać lokalne ViewModel-e (`MemberRowVM`, `MembersFiltersVM`, `MembersSort`) w pliku komponentu lub `src/types.ts` (jeśli mają być współdzielone w aplikacji).
3) Hooki: dodać `usePermissions(groupId)` i `useMembers(groupId)` lub pojedynczy `useGroupMembers(groupId)` w `src/lib/` (np. `src/lib/useGroupMembers.ts`) zwracający stan, wiersze VM oraz akcje mutujące z optimistic update i rollback.
4) Komponenty UI:
   - `src/components/groups/GroupMembersView.tsx`
   - `src/components/groups/MembersToolbar.tsx`
   - `src/components/groups/GroupMembersTable.tsx`
   - `src/components/groups/RoleBadge.tsx`
   - `src/components/groups/RoleSelect.tsx`
   - `src/components/groups/MemberActions.tsx`
   - Reuse Shadcn: `Table`, `Badge`, `Select`, `Button`, `AlertDialog`, `Input`, `Tooltip`, `Skeleton`.
5) Strona Astro: `src/pages/groups/[group_id]/members.astro` montująca `GroupMembersView` z `groupId` z parametru ścieżki.
6) Stany UI: skeletony podczas ładowania; `EmptyState` przy braku członków; toasty powodzenia/porażki dla akcji.
7) Reguły UI (ostatni admin): policzyć `adminCount` z listy i zablokować degradację/usunięcie/leave; pokazać tooltip z wyjaśnieniem.
8) Testy ręczne: ścieżki szczęśliwe i błędów (409, 400, 403/401, 404), samousunięcie, promocja, zmiana ról, filtry, sortowanie.
9) Dostępność: focus management w `ConfirmDialog`, etykiety dla przycisków, role tabeli, klawisz Enter/Escape w dialogu.
10) Performance: klientowe filtrowanie/sortowanie; dla bardzo dużych list rozważyć paginację (MVP – brak).


