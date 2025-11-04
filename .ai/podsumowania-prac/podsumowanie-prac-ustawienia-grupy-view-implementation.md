# Podsumowanie prac – Ustawienia grupy

## Co zaimplementowano
- Strona: `src/pages/groups/[group_id]/settings.astro` (SSR, mount `GroupSettingsView`).
- Kontener: `src/components/groups/GroupSettingsView.tsx` (orkiestracja danych/akcji, confirmy, toasty).
- Formularz: `src/components/groups/GroupDetailsForm.tsx` (Zod, zapis, toggle statusu).
- Zaproszenia: `src/components/groups/InviteCard.tsx` (maskowanie, kopiowanie, rotacja + confirm + cooldown UI).
- Baner: `src/components/groups/ArchivedBanner.tsx` (archived + deleted, przycisk „Przywróć” dla admina).
- Danger zone: `src/components/groups/DangerZoneCard.tsx` (Usuń/Przywróć, admin-only).
- Hook: `src/lib/useGroupSettings.ts` (fetch równoległy + akcje: save, toggleArchive, rotateInvite, softDelete, restore, cooldownUntil).

## API i serwis
- Klient: `src/lib/groups/api.client.ts` – `getGroup`, `getGroupPermissions`, `patchGroup`, `deleteGroup`, `restoreGroup`, `rotateInvite`, obsługa `Retry-After`.
- Serwis: `src/lib/services/groups.service.ts` – `updateGroup`, `rotateGroupInvite`, istniejące `softDeleteGroup`, `restoreGroupById`.
- Endpointy:
  - `GET /api/groups/{id}`, `PATCH /api/groups/{id}` – `src/pages/api/groups/[group_id].ts`.
  - `POST /api/groups/{id}/invite` – `src/pages/api/groups/[group_id]/invite.ts`.
  - `DELETE /api/groups/{id}`, `POST /api/groups/{id}/restore`, `GET /api/groups/{id}/permissions` – używane.

## Walidacja i mapowanie
- `src/lib/validation/group.ts` – `groupUpdateSchema` (Zod) + weryfikacja zakresu dat.
- `src/lib/mappers/group.mapper.ts` – mapowanie Row → `GroupDTO`.

## Interakcje (zgodnie z planem)
- Równoległe pobranie szczegółów i uprawnień (błędy nie-krytyczne dla uprawnień).
- Zapis zmian (PATCH) z walidacją i toastami.
- Archiwizacja/odarchiwizowanie (ConfirmDialog + PATCH), ukrywanie invite w archived.
- Zaproszenia: kopiuj kod/link, rotacja z confirm; UI cooldown na bazie `Retry-After`.
- Usunięcie (soft delete) z confirm i redirect do `/groups`; przywrócenie z confirm (baner/Danger Zone).

## Uwagi dot. 429/Retry-After
- Klient i UI w pełni obsługują `Retry-After`; endpoint `invite` umożliwia zwrócenie nagłówka. (Limiter serwerowy można dodać niezależnie – nie blokuje działania UI.)

## Status
- Implementacja spełnia początkowe założenia widoku. Gotowe do UAT.
