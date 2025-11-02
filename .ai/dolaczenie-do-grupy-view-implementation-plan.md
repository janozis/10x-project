# Plan implementacji widoku Dołączenie do grupy (Join)

## 1. Przegląd
Widok umożliwia użytkownikowi dołączenie do istniejącej grupy HAL za pomocą 8‑znakowego kodu zaproszenia. Po poprawnym dołączeniu użytkownik zostaje przekierowany do pulpitu grupy. Widok obsługuje pre‑fill kodu z query string (`/join?code=ABCDEFGH`), walidację formatu kodu, stany ładowania, komunikaty o błędach (w tym INVITE_INVALID, INVITE_EXPIRED, INVITE_MAXED) oraz pomoc w kopiowaniu/deeplinkowaniu zaproszenia.

## 2. Routing widoku
- Ścieżka: `/join?code=ABCDEFGH`
- Plik: `src/pages/join.astro`
- Po sukcesie: redirect do `/groups/{group_id}/dashboard`

## 3. Struktura komponentów
- `src/pages/join.astro` (Astro Page)
  - `src/components/JoinCard.tsx` (React, klientowy)
    - `JoinForm` (wewnątrz `JoinCard`)
      - `CodeMaskedInput`
      - `JoinStatus` (komunikaty + loader)
      - `InlineAlert` (błędy)
    - `CopyDeepLink`

## 4. Szczegóły komponentów
### JoinPage (`src/pages/join.astro`)
- Opis: Strona Astro renderująca układ i osadzająca komponenty React. Odczytuje `code` z query params i przekazuje jako `initialCode`.
- Główne elementy: kontener layoutu, nagłówek H1 (dla dostępności), `JoinCard` (client:load).
- Obsługiwane interakcje: brak bezpośrednich, logika po stronie komponentów React.
- Obsługiwana walidacja: brak (delegowana do React).
- Typy: brak dedykowanych poza prostymi string dla props.
- Propsy do dzieci: `initialCode?: string` → do `JoinCard`.

### JoinCard (`src/components/JoinCard.tsx`)
- Opis: Karta z tytułem, opisem, formularzem dołączenia i helperem deep link. Orkiestruje logikę formularza i prezentuje UI.
- Główne elementy: nagłówek, opis, `JoinForm`, `CopyDeepLink`.
- Obsługiwane interakcje: przekazuje do `JoinForm`; odbiera callback sukcesu (redirect).
- Walidacja: brak (delegowana do `JoinForm`).
- Typy: `JoinCardProps` z `initialCode?: string`.
- Propsy:
  - `initialCode?: string`

### JoinForm (w `JoinCard`)
- Opis: Kontrolowany formularz do wpisania/edycji kodu i wysłania `POST /api/groups/join`.
- Główne elementy: `form`, `CodeMaskedInput`, przycisk „Dołącz” (`ui/button`), `JoinStatus`, `InlineAlert`.
- Obsługiwane interakcje:
  - `onChange`/`onInput` (aktualizacja kodu z maską i uppercasem)
  - `onPaste` (sanitize: wyłuskanie dozwolonych znaków, 8 pierwszych)
  - `onSubmit` (walidacja → call API → obsługa sukcesu/błędu)
  - klawisz Enter (submit)
- Obsługiwana walidacja (przed submit i na bieżąco):
  - Długość dokładnie 8 znaków po usunięciu separatorów
  - Regex: `^[A-HJ-NP-Za-km-z1-9]{8}$` (dozwolone znaki; transformacja do UPPERCASE przy wyświetlaniu)
  - Disabled przycisku, jeśli invalid lub `isSubmitting`
- Typy:
  - `GroupJoinCommand` (z `src/types.ts`) — payload `{ code: string }`
  - `JoinFormState` — `{ code: string; isValid: boolean; isSubmitting: boolean; apiError?: InviteErrorCode | GeneralErrorCode; }`
  - `InviteErrorCode` — union: "INVITE_INVALID" | "INVITE_EXPIRED" | "INVITE_MAXED"
  - `GeneralErrorCode` — union podzbioru: "UNAUTHORIZED" | "VALIDATION_ERROR" | "INTERNAL_ERROR" | "BAD_REQUEST"
  - `JoinSuccessPayload` — `{ group_id: UUID } | GroupDTO` (obsługa obu wariantów)
- Propsy:
  - `initialCode?: string`
  - `onSuccess: (groupId: UUID) => void`

### CodeMaskedInput
- Opis: Pola tekstowe z maską (wyświetlanie jako `ABCD EFGH` lub `ABCD- EFGH`, wysyłka bez separatorów). Zapewnia filtrację i uppercase.
- Główne elementy: `input[type="text"]` z `inputMode="latin"`, `autoCapitalize="characters"`, `autoComplete="one-time-code"`.
- Obsługiwane interakcje: `onChange`, `onPaste`, internal sanitize → emit `onValue(rawCode)` (bez separatorów), `displayValue` (z maską).
- Walidacja: dopasowanie do regexu, długość 8.
- Typy: `CodeMaskedInputProps` — `{ value: string; onValue: (raw: string) => void; disabled?: boolean; describedById?: string }`.
- Propsy: jw.

### JoinStatus
- Opis: Prezentacja stanu `idle/validating/submitting/success/error`. Live region dla screenreaderów.
- Główne elementy: `div[aria-live="polite"]`, opcjonalny spinner (Tailwind), krótki tekst.
- Interakcje: brak.
- Walidacja: brak.
- Typy: `{ status: "idle" | "submitting" | "error"; message?: string }`.
- Propsy: jw.

### InlineAlert
- Opis: Reużywalny box na błędy/informacje (kolor, ikonka opcjonalnie).
- Główne elementy: `role="alert"`, semantyczne kolory Tailwind.
- Interakcje: brak.
- Walidacja: brak.
- Typy: `{ variant: "error" | "info" | "success"; title?: string; description?: string; }`.
- Propsy: jw.

### CopyDeepLink
- The purpose: Ułatwia skopiowanie linku w formacie `/join?code=ABCDEFGH` i samego kodu.
- Główne elementy: niewielki panel z `input[readOnly]` oraz dwa przyciski: „Kopiuj link”, „Kopiuj kod”.
- Interakcje: `onClick` → `navigator.clipboard.writeText(...)`, `toast`/komunikat sukcesu (opcjonalny aria-live).
- Walidacja: niedostępne przy braku/niepoprawnym kodzie.
- Typy: `{ code?: string }`.
- Propsy: `code?: string` (od JoinForm state).

## 5. Typy
- Reuse z `src/types.ts`:
  - `UUID`, `ApiResponse<T>`, `GroupDTO`, `GroupJoinCommand`
- Nowe (ViewModel):
  - `InviteErrorCode = "INVITE_INVALID" | "INVITE_EXPIRED" | "INVITE_MAXED"`
  - `GeneralErrorCode = "UNAUTHORIZED" | "VALIDATION_ERROR" | "INTERNAL_ERROR" | "BAD_REQUEST"`
  - `JoinSuccessPayload = { group_id: UUID } | GroupDTO`
  - `JoinFormState = { code: string; isValid: boolean; isSubmitting: boolean; apiError?: InviteErrorCode | GeneralErrorCode }`
  - `JoinCardProps = { initialCode?: string }`
  - `JoinFormProps = { initialCode?: string; onSuccess: (groupId: UUID) => void }`
  - `CodeMaskedInputProps = { value: string; onValue: (raw: string) => void; disabled?: boolean; describedById?: string }`

## 6. Zarządzanie stanem
- Lokalny stan React w `JoinForm`:
  - `code` — wartość kontrolowana (raw: 8 znaków bez separatorów)
  - `isValid` — wynik walidacji regex + długości
  - `isSubmitting` — blokada UI i loader
  - `apiError` — ostatni błąd zaproszenia lub ogólny
- Custom hook `useJoinGroup` (`src/lib/useJoinGroup.ts`):
  - API: `const { joinByCode, isSubmitting, error, resetError } = useJoinGroup();`
  - `joinByCode(code: string): Promise<{ groupId: UUID }>` — normalizuje odpowiedź (z `GroupDTO` lub `{group_id}`)
  - Zapewnia mapowanie `ApiError.error.code` → `InviteErrorCode | GeneralErrorCode`
  - Zwraca stan `isSubmitting` do spinera, `error` do `InlineAlert`
- A11y: `JoinStatus` jako `aria-live`, focus management na błędzie/po submit, `aria-describedby` dla inputu.

## 7. Integracja API
- Endpoint: `POST /api/groups/join`
- Request body (JSON): `GroupJoinCommand` → `{ code: string }`
- Response (sukces 200):
  - Preferowane: `{ data: { group_id: UUID } }`
  - Akceptowane: `{ data: GroupDTO }` (fallback — pobieramy `data.id`)
- Response (błąd 4xx/5xx): `{ error: { code: ApiErrorCode; message: string; details?: object } }`
  - Błędy domenowe: `INVITE_INVALID`, `INVITE_EXPIRED`, `INVITE_MAXED`
  - Inne: `UNAUTHORIZED`, `VALIDATION_ERROR`, `INTERNAL_ERROR`, `BAD_REQUEST`
- Frontendowe akcje:
  - `onSubmit` → walidacja → `joinByCode(code)` → on success `window.location.href = "/groups/" + groupId + "/dashboard"`
  - Na `UNAUTHORIZED` → CTA „Zaloguj się” (link do `/login?redirect=/join?code=...`)

## 8. Interakcje użytkownika
- Wpisywanie kodu: maska, automatyczny uppercase, odfiltrowanie niedozwolonych znaków
- Wklejanie kodu: sanitize i przycięcie do 8 dozwolonych znaków
- Wysłanie formularza: przycisk „Dołącz” lub Enter; disabled, jeśli invalid
- Kopiowanie: „Kopiuj link” i „Kopiuj kod” (feedback w aria-live)
- Pre‑fill z URL: jeśli `code` w query i valid, wstępne wypełnienie pola; opcjonalnie auto‑focus na przycisku

## 9. Warunki i walidacja
- Reguły kodu:
  - Długość: dokładnie 8 znaków (po strip separatorów)
  - Pattern: `^[A-HJ-NP-Za-km-z1-9]{8}$`
  - Transformacja: wyświetlanie uppercase, do API wysyłamy uppercase bez separatorów
- UI:
  - `aria-invalid` i komunikat błędu przy niespełnieniu reguł
  - disabled submit przy invalid lub `isSubmitting`
- Query param:
  - Jeśli obecny, walidujemy i ustawiamy `code`

## 10. Obsługa błędów
- Mapowanie kodów:
  - `INVITE_INVALID`: „Nieprawidłowy kod zaproszenia. Sprawdź i spróbuj ponownie.”
  - `INVITE_EXPIRED`: „Kod zaproszenia wygasł. Poproś administratora o nowy kod.”
  - `INVITE_MAXED`: „Limit użyć kodu został wyczerpany.”
  - `UNAUTHORIZED`: „Zaloguj się, aby dołączyć do grupy.” + link do loginu z redirectem
  - `VALIDATION_ERROR`/`BAD_REQUEST`: „Nieprawidłowe żądanie.” (pokazanie szczegółów, jeśli dostępne)
  - `INTERNAL_ERROR`: „Wystąpił błąd. Spróbuj ponownie później.”
- Techniczne:
  - Timeout/request error: „Brak odpowiedzi serwera. Spróbuj ponownie.”
  - Reset błędu przy zmianie pola (`resetError`).

## 11. Kroki implementacji
1. Routing i strona:
   - Utwórz `src/pages/join.astro` (layout + odczyt `Astro.url.searchParams.get("code")` + mount `JoinCard`)
2. Komponenty UI:
   - Dodaj `src/components/JoinCard.tsx` (export domyślny z `client:load`)
   - Wewnątrz: `JoinForm`, `CodeMaskedInput`, `JoinStatus`, `InlineAlert`, `CopyDeepLink`
   - Reużyj `src/components/ui/button.tsx` dla przycisku submit; dla inputu użyj natywnego `<input>` ze stylami Tailwind
3. Hook i logika API:
   - Dodaj `src/lib/useJoinGroup.ts`
   - Zaimplementuj `joinByCode(code)` → `fetch('/api/groups/join', { method: 'POST', body: JSON.stringify({ code }) })`
   - Obsłuż oba formaty sukcesu (`{ group_id }` lub `GroupDTO`) i mapuj błędy na `InviteErrorCode | GeneralErrorCode`
4. Walidacja i maska:
   - Zaimplementuj regex i helpery: `sanitizeInput`, `formatMasked`, `isValidCode`
   - W `onPaste` wyłuskaj dozwolone znaki i przytnij do 8
5. UX/A11y:
   - `aria-live` dla statusów, `role="alert"` dla błędów
   - Focus na `InlineAlert` po błędzie; `aria-describedby` z komunikatem walidacji
6. Redirect po sukcesie:
   - W `onSuccess(groupId)` → `window.location.href = "/groups/" + groupId + "/dashboard"`
7. Helper kopiowania:
   - `CopyDeepLink` — użyj `window.location.origin + "/join?code=" + code`
   - Obsłuż brak `navigator.clipboard` fallbackiem (wybór i `document.execCommand('copy')` jeśli konieczne)
8. Edge cases:
   - Auto‑fill z query: ustaw `initialCode`; nie wysyłaj automatycznie, jeśli nie ma interakcji (zapobieganie niechcianym requestom)
   - Debounce walidacji (opcjonalne; prosta walidacja wystarczy bez debounca)
9. Testy manualne scenariuszy:
   - Poprawny kod → redirect
   - `INVITE_INVALID`/`INVITE_EXPIRED`/`INVITE_MAXED`
   - `UNAUTHORIZED` (spodziewane CTA do logowania)
   - Puste/krótsze/niepoprawne znaki, wklejanie z przerwami

---
- Stack: Astro 5, React 19, TypeScript 5, Tailwind 4, shadcn/ui (button)
- Zgodność z PRD: US‑003 (dołączenie do grupy przez kod) — spełniona poprzez formularz + obsługę domenowych błędów i redirect po sukcesie.
