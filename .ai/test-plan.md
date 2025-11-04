# Plan testów projektu 10x

## 1. Wprowadzenie i cele testowania
Celem testowania jest zapewnienie, że aplikacja 10x spełnia wymagania funkcjonalne i niefunkcjonalne, jest stabilna, bezpieczna i gotowa do wdrożenia. Testy mają:

- Wykryć wczesne defekty w komponentach front- i backendowych.
- Zweryfikować integralność przepływów użytkownika (E2E).
- Zmierzyć wydajność krytycznych ścieżek.
- Zapewnić zgodność z wymaganiami bezpieczeństwa i dostępności.

## 2. Zakres testów
| Obszar | Opis |
|--------|------|
| **Front-end (Astro/React)** | Komponenty w `src/components`, strony w `src/pages`, układy w `src/layouts`. |
| **API (`src/pages/api`)** | End-pointy REST korzystające z Supabase. |
| **Warstwa usług (`src/lib`)** | Hooki, klienci API, logika biznesowa. |
| **Baza danych (Supabase)** | Typy w `src/db` i migracje. |
| **Middleware (`src/middleware`)** | Autoryzacja i obsługa błędów. |
| **Worker (`src/workers/ai-evaluation-worker.ts`)** | Przetwarzanie ocen AI. |
| **Styling (Tailwind/Shadcn)** | Spójność i dostępność UI. |

## 3. Typy testów
1. **Testy jednostkowe** – Vitest + React Testing Library.
2. **Testy integracyjne** – Supertest (API), Vitest (hooki, serwisy).
3. **Testy E2E** – Playwright z trybem headless i CI.
4. **Testy regresji wizualnej** – Playwright + Percy.
5. **Testy wydajności** – k6 (API), Lighthouse CI (front-end).
6. **Testy bezpieczeństwa** – OWASP ZAP Baseline Scan, dependency-check.
7. **Testy dostępności** – axe-core w Playwright, lighthouse-a11y.

## 4. Scenariusze testowe dla kluczowych funkcjonalności
| ID | Funkcjonalność | Scenariusz (Happy Path) | Scenariusze negatywne |
|----|----------------|-------------------------|-----------------------|
| F-AUTH-01 | Rejestracja użytkownika | Użytkownik poprawnie wypełnia `RegisterForm`, otrzymuje e-mail weryfikacyjny. | Puste pola, duplikat e-mail, słabe hasło. |
| F-AUTH-02 | Logowanie | Poprawne dane -> przekierowanie na dashboard. | Błędny login/hasło, zablokowane konto. |
| F-GRP-01 | Tworzenie grupy | `CreateGroupDialog` zapisuje grupę i przekierowuje do view. | Brak nazwy, brak uprawnień. |
| F-ACT-01 | Dodanie aktywności | `NewActivityStepper` przechodzi kolejne kroki i zapisuje. | Brak wymaganych pól, konflikt czasu. |
| F-CD-01 | Edycja dnia obozu | `CampDayEditForm` zapisuje zmiany, odświeża listę slotów. | Kolizja slotów, brak uprawnień. |
| F-TASK-01 | Aktualizacja zadania | `TaskForm` zapisuje status i notyfikacja w grupie. | Nieprawidłowy status, brak dostępu. |
| F-AI-01 | Ocena AI | Worker tworzy rekord AI-evaluation, UI wyświetla postęp. | Brak odpowiedzi modelu, timeout. |

## 5. Środowisko testowe
- **CI/CD:** GitHub Actions.
- **Baza danych:** Supabase lokalny z seedem testowym.
- **Zmienne środowiskowe:** `.env.test` (klucze Supabase, OpenAI, itp.).
- **Przeglądarki:** Chromium (Playwright default), WebKit, Firefox.
- **Pozostałe:** Node 20, pnpm.

## 6. Narzędzia do testowania
| Cel | Narzędzie |
|------|-----------|
| Jednostkowe/Integracyjne | Vitest, React Testing Library, Supertest |
| E2E + a11y | Playwright, Axe-core |
| Regressja wizualna | Percy CLI |
| Wydajność | k6, Lighthouse CI |
| Bezpieczeństwo | OWASP ZAP, npm-audit-ci, Snyk |
| Raportowanie | Allure, GitHub Checks |

## 7. Harmonogram testów
| Faza | Zakres | Termin |
|------|--------|--------|
| **Sprint 0** | Konfiguracja narzędzi, CI, seedy DB | T+1 tydzień |
| **Sprint 1-N** | Testy jednostkowe nowych funkcji, aktualizacja E2E | Każdy sprint |
| **Milestone Beta** | Pełna regresja E2E, wydajność, a11y | 2 tyg. przed betą |
| **Milestone RC** | Pełna pętla testów, hardening security | 1 tydz. przed RC |
| **Po wdrożeniu** | Smoke tests produkcyjne | Każde wdrożenie |

## 8. Kryteria akceptacji testów
- Pokrycie kodu jednostkowego ≥ 80 %.
- Wszystkie testy E2E przechodzą na branchu `main`.
- Brak krytycznych i wysokich defektów otwartych.
- Średni TTFB API ≤ 200 ms w testach k6.
- Wynik Lighthouse Performance ≥ 90.
- Brak problemów a11y krytycznych wg axe.

## 9. Role i odpowiedzialności
| Rola | Odpowiedzialności |
|------|-------------------|
| **QA Lead** | Utrzymanie planu testów, priorytetyzacja defektów, raporty sprintowe. |
| **QA Engineer** | Implementacja i utrzymanie testów, analiza ryzyka, przegląd przypadków testowych. |
| **Dev** | Pisanie testów jednostkowych, naprawa defektów, code reviews. |
| **DevOps** | Utrzymanie infrastruktury CI/CD, monitorowanie środowisk testowych. |
| **Product Owner** | Akceptacja kryteriów testowych, priorytety defektów. |

## 10. Procedury raportowania błędów
1. Zgłoszenie w GitHub Issues z szablonem „Bug Report”.
2. Priorytet nadany wg wpływu i prawdopodobieństwa.
3. QA Lead weryfikuje i przypisuje do sprintu.
4. Defekt „Done” po przejściu testu regresji.

---

> Dokument wygenerowany automatycznie – aktualizacja wymagana przy zmianach architektury lub wymagań.
