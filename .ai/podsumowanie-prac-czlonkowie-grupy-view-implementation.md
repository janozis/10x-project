## Podsumowanie prac: Widok Członkowie grupy

### Zakres i efekt
- Dodano komplet widoku zarządzania członkami grupy zgodnie z planem.
- Widok wspiera wyszukiwanie, filtr roli, sortowanie po dacie dołączenia, zmianę ról (admin), promocję do admina oraz usuwanie/opuszczanie z potwierdzeniem.
- Uwzględniono reguły ostatniego administratora oraz mapowanie błędów backendu na przyjazne komunikaty.

### Integracje API (frontend klient)
- `src/lib/groups/members/api.client.ts`
  - `listMembers(groupId)` → GET `/api/groups/{group_id}/members`
  - `changeMemberRole(groupId, userId, role)` → PATCH `/api/groups/{group_id}/members/{user_id}`
  - `removeMember(groupId, userId)` → DELETE `/api/groups/{group_id}/members/{user_id}`
  - `promoteMember(groupId, userId)` → POST `/api/groups/{group_id}/members/{user_id}/promote`
  - `getPermissions(groupId)` → GET `/api/groups/{group_id}/permissions`

### Zarządzanie stanem i logika (hook)
- `src/lib/groups/useGroupMembers.ts`
  - Stan: `permissions`, `members`, `currentUserId`, `loading`, `error`.
  - Filtry: `{ q, role }` (klientowe), sort: `{ by: 'joined_at', direction }` (klientowe).
  - Pochodne: `adminCount`, `rows: MemberRowVM[]` z polami guardów (`canEditRole`, `canPromote`, `canRemove`, `isLastAdmin`).
  - Akcje z optimistic update + rollback: `changeRole`, `promote`, `remove`, `refresh`.

### Komponenty UI
- `src/components/groups/GroupMembersView.tsx` – kontener widoku, łączy hook, toolbar, tabelę, dialog potwierdzeń i toasty.
- `src/components/groups/MembersToolbar.tsx` – wyszukiwarka, filtr roli, przełącznik sortu, licznik wyników.
- `src/components/groups/GroupMembersTable.tsx` – tabela z kolumnami: Użytkownik, Rola, Dołączył, Akcje; skeleton i pusty stan.
- `src/components/groups/RoleBadge.tsx` – odznaka roli.
- `src/components/groups/RoleSelect.tsx` – selektor roli z `disabled`, `aria-disabled`, `title` (ostatni admin / brak uprawnień).
- `src/components/groups/MemberActions.tsx` – akcje (promocja/usunięcie/leave) z `disabled` i `title` przy blokadach.

### Strona i routing
- `src/pages/groups/[group_id]/members.astro` – montuje `GroupMembersView` z `client:load`.

### UX, A11y, błędy
- Blokady i komunikaty dla przypadków brzegowych: ostatni admin, brak uprawnień, błędna rola, brak grupy.
- Mapowanie kodów błędów: `LAST_ADMIN_REMOVAL`, `ROLE_INVALID`, `UNAUTHORIZED`, `FORBIDDEN_ROLE`, `NOT_FOUND` → przyjazne toasty.
- Dostępność: `aria-label`, `aria-disabled`, sensowne `title` przy wyłączonych akcjach, focus i semantyka z komponentami dialogu.

### Dalsze kroki (opcjonalne)
- Paginacja dla dużych list członków.
- Testy jednostkowe hooka i podstawowych interakcji UI.
- Dodatkowe tooltipy i e2e weryfikacja ścieżek błędów.


