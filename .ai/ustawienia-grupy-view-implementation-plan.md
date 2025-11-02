# Plan implementacji widoku Ustawienia grupy

## 1. Przegląd
Widok służy do konfiguracji grupy HAL, zarządzania zaproszeniami (invite code/link) oraz cyklem życia grupy (status, archiwizacja) z obszarem niebezpiecznych akcji (usunięcie, przywrócenie). Uwzględnia uprawnienia użytkownika (admin-only dla akcji modyfikujących), retencję i baner informujący o stanie archiwum.

## 2. Routing widoku
- Ścieżka: `/groups/{id}/settings`
- Implementacja strony: `src/pages/groups/[group_id]/settings.astro` (SSR) osadzająca komponent React z logiką UI.

## 3. Struktura komponentów
- `GroupSettingsView` (kontener)
  - `ArchiveBanner`
  - `GroupDetailsForm`
  - `InviteCard`
  - `DangerZoneCard`
  - `ConfirmDialog` (portal/modal, współdzielony)

Hierarchia (drzewo):
- GroupSettingsView
  - ArchiveBanner (pokazywany warunkowo)
  - GroupDetailsForm
  - InviteCard (ukryty, gdy status=archived lub deleted_at!=null)
  - DangerZoneCard
  - ConfirmDialog (kontrolowany przez stan kontenera)

## 4. Szczegóły komponentów
### GroupSettingsView
- Opis: Główny kontener ekranu. Pobiera dane grupy i uprawnienia, decyduje o widoczności akcji, spina zapisy, rotację invite, archiwizację i usuwanie/przywracanie.
- Główne elementy: wrapper, nagłówek (nazwa grupy), sekcje: `ArchiveBanner`, `GroupDetailsForm`, `InviteCard`, `DangerZoneCard`, `ConfirmDialog`.
- Obsługiwane interakcje:
  - Inicjalne pobranie: `GET /api/groups/{id}` i `GET /api/groups/{id}/permissions` (równolegle).
  - Zapis zmian: `PATCH /api/groups/{id}`.
  - Rotacja zaproszenia: `POST /api/groups/{id}/invite` (z obsługą 429 i Retry-After).
  - Archiwizacja (status=archived)/odarchiwizowanie (status!=archived): `PATCH /api/groups/{id}`.
  - Usunięcie (soft delete): `DELETE /api/groups/{id}`; przywrócenie: `POST /api/groups/{id}/restore`.
- Obsługiwana walidacja: delegowana do `GroupDetailsForm`; kontrola dostępu wg `GroupPermissionsDTO` (admin-only).
- Typy: `GroupDTO`, `GroupUpdateCommand`, `GroupPermissionsDTO`, `GroupRestoreCommand`, `GroupInviteRotateCommand` (puste ciało), `UUID`.
- Propsy:
  - `groupId: UUID`

### ArchiveBanner
- Opis: Baner stanu informujący o archiwizacji (status=archived) lub usunięciu (deleted_at != null). Ukazuje konsekwencje (readonly sekcje, brak Invite).
- Główne elementy: `Alert/Banner`, komunikat, opcjonalna akcja „Przywróć” (gdy `deleted_at` nie null i użytkownik admin).
- Obsługiwane interakcje: klik „Przywróć” -> confirm -> `POST /api/groups/{id}/restore`.
- Walidacja: dostęp tylko dla admina do akcji; brak dla banera.
- Typy: wycinek `GroupDTO` (`status`, `deleted_at`).
- Propsy: `{ status: GroupDTO['status']; deletedAt: GroupDTO['deleted_at']; onRestore?: () => Promise<void>; canManage: boolean }`.

### GroupDetailsForm
- Opis: Edytowalny formularz metadanych grupy (nazwa, opis, lore_theme, daty, max_members, status) z walidacją i zapisem.
- Główne elementy: pola formularza, przyciski `Zapisz` i opcjonalnie `Archiwizuj/Odarchiwizuj` (admin-only).
- Obsługiwane interakcje:
  - Edycja pól; `onSubmit` -> `PATCH /api/groups/{id}` (wysyła tylko zmienione pola, ale w MVP dopuszczalne pełne `GroupUpdateCommand`).
  - Toggling status (archiwizacja/odarchiwizowanie) przez `PATCH` z `status`.
- Walidacja (zgodnie z API):
  - `name`: min 1, max 200.
  - `description`: min 1, max 2000.
  - `lore_theme`: min 1, max 200.
  - `start_date`, `end_date`: format YYYY-MM-DD; `end_date >= start_date`.
  - `max_members`: liczba całkowita 1..500 (opcjonalne).
  - `status`: jedno z: `planning | active | archived` (enum).
- Typy: `GroupDTO`, `GroupUpdateCommand`; ViewModel: `GroupDetailsFormModel`.
- Propsy: `{ initial: GroupDetailsFormModel; canEdit: boolean; onSave: (changes: GroupUpdateCommand) => Promise<void>; onToggleArchive: (nextStatus: GroupDTO['status']) => Promise<void>; isSubmitting: boolean }`.

### InviteCard
- Opis: Sekcja z informacją o zaproszeniu: maskowany kod, przyciski „Kopiuj kod”, „Kopiuj link”, „Rotuj kod”. Widoczna tylko gdy `status != 'archived'` i `deleted_at == null` oraz `canManage`.
- Główne elementy: pola wyświetlające `code` (maskowane, z przyciskiem „Pokaż”), `expires_at`, `max_uses/current_uses`, przyciski kopiowania i rotacji.
- Obsługiwane interakcje:
  - Kopiuj kod / link: do schowka (`navigator.clipboard.writeText`).
  - Pokaż/Ukryj kod (toggle maski).
  - Rotuj: `POST /api/groups/{id}/invite` z obsługą limitowania (429 + Retry-After, fallback exponential backoff z jitterem).
- Walidacja/warunki:
  - Niewidoczne dla status=archived lub gdy `deleted_at != null`.
  - Disabled, gdy trwa cooldown po 429 (wg Retry-After lub backoff).
- Typy: `InviteDTO` z `GroupDTO['invite']`; ViewModel: `InviteViewModel`.
- Propsy: `{ groupId: UUID; invite: InviteDTO | null; canManage: boolean; onRotate: () => Promise<void>; }`.

### DangerZoneCard
- Opis: Sekcja „Niebezpieczne akcje”: usuń grupę (soft delete) lub przywróć (gdy usunięta). Dostępne tylko dla admina.
- Główne elementy: opis konsekwencji, przyciski `Usuń` lub `Przywróć`.
- Obsługiwane interakcje: `DELETE /api/groups/{id}`; `POST /api/groups/{id}/restore`.
- Walidacja: admin-only; disabled podczas requestów.
- Typy: `UUID`.
- Propsy: `{ groupId: UUID; isDeleted: boolean; canManage: boolean; onDelete: () => Promise<void>; onRestore: () => Promise<void>; }`.

### ConfirmDialog
- Opis: Modal potwierdzeń dla akcji: archiwizuj, odarchiwizuj, usuń, przywróć, rotuj.
- Główne elementy: tytuł, opis konsekwencji, przyciski `Potwierdź`/`Anuluj`.
- Obsługiwane interakcje: sterowane przez `isOpen`, `action`, `onConfirm`, `onCancel`.
- Walidacja: brak.
- Typy: `ConfirmAction = 'archive' | 'unarchive' | 'delete' | 'restore' | 'rotate'`.
- Propsy: `{ isOpen: boolean; action?: ConfirmAction; onConfirm: () => Promise<void>; onCancel: () => void; isSubmitting: boolean }`.

## 5. Typy
- Istniejące (z `src/types.ts`):
  - `GroupDTO`: szczegóły grupy, w tym `invite?: InviteDTO | null`, `status`, `deleted_at`.
  - `InviteDTO`: `{ code: string; expires_at: TimestampISO | null; max_uses: number; current_uses: number; }`.
  - `GroupUpdateCommand`: częściowy update pól: `name`, `description`, `lore_theme`, `status`, `start_date`, `end_date`, `max_members`.
  - `GroupRestoreCommand`: `Record<never, never>`.
  - `GroupInviteRotateCommand`: `Record<never, never>`.
  - `GroupPermissionsDTO`: `{ group_id: UUID; role: 'admin'|'editor'|'member'; can_edit_all: boolean; can_edit_assigned_only: boolean }`.
  - `UUID`, `DateISO`, `TimestampISO`, `ApiResponse<T>`.

- Nowe ViewModel-e (frontend):
  - `GroupDetailsFormModel`:
    - `name: string`
    - `description: string`
    - `lore_theme: string`
    - `start_date: DateISO`
    - `end_date: DateISO`
    - `max_members?: number`
    - `status: 'planning'|'active'|'archived'`
  - `InviteViewModel` (pochodna `InviteDTO` + pochodne):
    - `codeMasked: string` (np. `••••••••` lub częściowo `AB•••••9`)
    - `joinLink: string` (np. `/join?code={code}`)
    - `expiresAtLabel: string | null`
    - `usageLabel: string` (np. `3/10` lub `—`)
  - `GroupSettingsState` (kontener):
    - `group?: GroupDTO`
    - `permissions?: GroupPermissionsDTO`
    - `loading: boolean`
    - `error?: string` (skrót komunikatu)
    - `cooldownUntil?: number` (timestamp z Retry-After)
    - `busyAction?: ConfirmAction`

## 6. Zarządzanie stanem
- W `GroupSettingsView`:
  - `useEffect` do równoległego pobrania `group` i `permissions`.
  - `useState`/`useReducer` dla `loading`, `error`, `group`, `permissions`, `cooldownUntil`, `busyAction`.
  - `derived`: `canManage = permissions?.role === 'admin'`.
  - Po sukcesie `PATCH` aktualizacja `group` lokalnie (optimistic lub wg payloadu z odpowiedzi).
  - Po 429 podczas rotacji: ustaw `cooldownUntil = now + parseRetryAfter(headers)`; disable przycisku rotacji.

- Custom hooki:
  - `useGroupSettings(groupId)` – łączy fetch group + permissions, zwraca stan i akcje: `saveDetails(changes)`, `toggleArchive()`, `rotateInvite()`, `softDelete()`, `restore()`.
  - `useRetryAfter()` – util do parsowania `Retry-After` (sekundy lub HTTP-date) i obliczania pozostałego czasu.

## 7. Integracja API
- Pobranie szczegółów:
  - `GET /api/groups/{group_id}` → `ApiResponse<GroupDTO>`
  - Frontend: `fetch`, sprawdzenie `content-type`, parsowanie do `ApiResponse<GroupDTO>`.

- Uprawnienia:
  - `GET /api/groups/{group_id}/permissions` → `ApiResponse<GroupPermissionsDTO>`.

- Zapis szczegółów/archiwizacja:
  - `PATCH /api/groups/{group_id}`
  - Body: `GroupUpdateCommand` (np. `{ name, description, lore_theme, start_date, end_date, max_members, status }`).
  - Response: `ApiResponse<GroupDTO>`.

- Rotacja zaproszenia:
  - `POST /api/groups/{group_id}/invite`
  - Body: puste (`GroupInviteRotateCommand`).
  - Response: `ApiResponse<GroupDTO>` (zaktualizowane `invite`).
  - Rate limit: 429 + nagłówek `Retry-After` (sekundy/HTTP-date).

- Usunięcie / Przywrócenie:
  - `DELETE /api/groups/{group_id}` → `ApiResponse<unknown>`.
  - `POST /api/groups/{group_id}/restore` → `ApiResponse<GroupDTO>`.

Mapowanie kodów błędów (min): `VALIDATION_ERROR(400)`, `DATE_RANGE_INVALID(400)`, `GROUP_LIMIT_REACHED(400)`, `UNAUTHORIZED(401)`, `NOT_FOUND(404)`, `CONFLICT(409)`, `RATE_LIMIT_EXCEEDED(429)`, `INTERNAL_ERROR(500)`.

## 8. Interakcje użytkownika
- Wejście na stronę:
  - Równoległe pobranie `group` i `permissions`. Przy błędzie 404 → komunikat „Nie znaleziono grupy”. 401 → przekierowanie do logowania (wg globalnej polityki).
- Zapis szczegółów:
  - Klik „Zapisz” → walidacja → `PATCH`. Sukces: toast „Zapisano”, odświeżenie stanu. Błąd walidacji: podświetlenie pól.
- Archiwizacja/odarchiwizowanie:
  - Klik „Archiwizuj/Odarchiwizuj” → `ConfirmDialog` → `PATCH` z `status`. Archiwum ukrywa `InviteCard`.
- Rotacja invite:
  - Klik „Rotuj” → `ConfirmDialog` → `POST /invite`. Przy 429: wylicz i pokaż „Spróbuj ponownie za X s”; zablokuj przycisk do upłynięcia czasu.
- Kopiowanie kodu/linku:
  - Klik „Kopiuj kod” / „Kopiuj link” → schowek + toast potwierdzający.
- Usunięcie/przywrócenie:
  - Klik „Usuń” → `ConfirmDialog` → `DELETE`. Sukces: toast i przekierowanie (np. do `/groups`).
  - Klik „Przywróć” → `ConfirmDialog` → `POST /restore`. Sukces: odświeżenie stanu.

## 9. Warunki i walidacja
- Widoczność i dostępność:
  - `canManage = permissions.role === 'admin'`. Tylko admin widzi przyciski zapisu, rotacji, archiwizacji, usunięcia/przywrócenia.
  - `InviteCard` ukryty gdy `group.status === 'archived'` lub `group.deleted_at != null`.
  - `DangerZoneCard` pokazuje „Usuń” gdy `deleted_at == null`; „Przywróć” gdy `deleted_at != null`.
  - Przy `cooldownUntil > now` – przycisk rotacji disabled z odliczaniem.

- Walidacja formularza (frontend, zod):
  - `name` [1..200], `description` [1..2000], `lore_theme` [1..200].
  - Daty: `YYYY-MM-DD`, `end_date >= start_date` (spójnie z backendem).
  - `max_members` w zakresie 1..500.
  - `status in {'planning','active','archived'}`.

## 10. Obsługa błędów
- Sieć/format: brak `application/json` → pokaż ogólny błąd i sugestię odświeżenia.
- 400 VALIDATION_ERROR/DATE_RANGE_INVALID: pokaż błędy pod polami; globalny komunikat.
- 401 UNAUTHORIZED: przekierowanie do logowania (lub banner).
- 404 NOT_FOUND: ekran „Grupa nie istnieje lub brak dostępu”.
- 409 CONFLICT: ponów pobranie i zasygnalizuj konflikt zapisu.
- 429 RATE_LIMIT_EXCEEDED przy rotacji: zastosuj Retry-After; odliczanie; zablokuj przycisk.
- 500 INTERNAL_ERROR: toast z błędem i raport w konsoli.

## 11. Kroki implementacji
1. Routing strony: utwórz `src/pages/groups/[group_id]/settings.astro` z kontenerem `GroupSettingsView` (React).
2. Stwórz komponent `GroupSettingsView.tsx` w `src/components/groups/` i podłącz do strony.
3. Zaimplementuj hook `useGroupSettings(groupId)` w `src/lib/` (np. `src/lib/useGroupSettings.ts`) do pobierania `GroupDTO` i `GroupPermissionsDTO` równolegle.
4. Dodaj util `useRetryAfter` (lub funkcję `parseRetryAfter`) w `src/lib/utils.ts` do obsługi 429 Retry-After.
5. Zaimplementuj `GroupDetailsForm.tsx` (z zod walidacją; jeśli brak – dodaj `groupUpdateSchema` w `src/lib/validation/group.ts`).
6. Zaimplementuj `InviteCard.tsx` (maskowanie kodu, kopiowanie, rotacja z cooldownem; schowaj, gdy archived/deleted).
7. Zaimplementuj `ArchiveBanner.tsx` (pokazuj dla archived lub deleted; akcja „Przywróć” jeśli deleted i admin).
8. Zaimplementuj `DangerZoneCard.tsx` (Usuń/Przywróć z ConfirmDialog).
9. Zaimplementuj `ConfirmDialog.tsx` (uniwersalny modal potwierdzeń), wykorzystaj komponenty `src/components/ui/*` (shadcn/ui).
10. Podłącz akcje API w kontenerze: `PATCH`, `POST /invite`, `DELETE`, `POST /restore`; ustawiaj stany busy/cooldown i odświeżaj `group`.
11. UX: dodaj toasty komunikatów sukces/błąd; licznik cooldownu dla rotacji; focus management w modalu (a11y).
12. Testy ręczne: scenariusze admin vs non-admin; archived vs active; deleted vs active; 429 rotacja; walidacje dat i limitów.
13. Refaktor/cleanup: wyodrębnij wspólne utilsy i dopasuj stylistykę do Tailwind/shadcn.


