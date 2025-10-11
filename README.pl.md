<!-- Wersja polska README. Oryginał angielski znajduje się w pliku README.md -->

# LoreProgrammer

Budowanie wspólnego, opartego na lore programowania dla Harcerskich Akcji Letnich (HAL). LoreProgrammer pomaga harcerzom i instruktorom współtworzyć spójne programy obozowe, wierne wybranej tematyce „lore” oraz wspierające wartości i cele wychowania harcerskiego.

![Wersja Node](https://img.shields.io/badge/node-22.14.0-43853d?logo=node.js) ![Astro](https://img.shields.io/badge/Astro-5.x-ff5d01?logo=astro) ![React](https://img.shields.io/badge/React-19-61dafb?logo=react) ![Licencja: MIT](https://img.shields.io/badge/License-MIT-green.svg)

> Status: Wczesny szkielet (implementacja funkcji w toku)

---

## Spis treści
1. [Nazwa projektu](#loreprogrammer)
2. [Opis projektu](#opis-projektu)
3. [Stos technologiczny](#stos-technologiczny)
4. [Uruchomienie lokalne](#uruchomienie-lokalne)
5. [Dostępne skrypty](#dostępne-skrypty)
6. [Zakres projektu](#zakres-projektu)
7. [Status projektu](#status-projektu)
8. [Licencja](#licencja)

---

## Opis projektu
LoreProgrammer to aplikacja webowa umożliwiająca zespołom HAL wspólne planowanie, iterowanie i ocenianie zajęć obozowych. Koncentruje się na:
- Strukturyzowanym projektowaniu zajęć (cele, materiały, role, przebieg, rezultaty)
- Wspomaganej przez AI ocenie na żądanie (dwuwymiarowe: zgodność z lore oraz wartości harcerskie)
- Iteracyjnym ulepszaniu poprzez pytania refleksyjne generowane przez AI
- Współpracy w obrębie grup programowych
- Uprawnieniach opartych o role (admin vs edytor) z możliwością przypisania wielu edytorów
- Szablonach dnia oraz widoku całego planu obozu

Aplikacja celowo unika pełnej automatycznej generacji programu — stawia na kreatywność ludzi wspieraną precyzyjnym feedbackiem AI.

## Stos technologiczny
Technologie główne (obecne / planowane):
- Astro 5 (hybrydowy SSR / statyczne buildy)
- React 19 (tylko interaktywne komponenty tam, gdzie potrzebne)
- TypeScript 5
- Tailwind CSS 4 (utility-first)
- Shadcn/ui (planowana integracja w `src/components/ui`)
- Supabase (Auth, Database, Realtime) – planowane
- Zod (walidacja danych / DTO) – planowane

Biblioteki wspierające:
- class-variance-authority, clsx, tailwind-merge (ergonomia stylowania)
- lucide-react (ikony)
- radix-ui Slot (kompozycja)
- tw-animate-css (animacje)

Narzędzia jakości:
- ESLint 9 + TypeScript ESLint
- Prettier (`prettier-plugin-astro`)
- Husky + lint-staged (pre-commit)

Runtime:
- Node.js 22.14.0 (zdefiniowane w `.nvmrc`)

## Uruchomienie lokalne

### Wymagania wstępne
- Node.js 22.14.0 (`nvm install 22.14.0 && nvm use`)
- npm (lub alternatywnie pnpm / yarn po dostosowaniu skryptów)

### Klonowanie i instalacja
```bash
git clone https://github.com/janozis/10x-project.git loreprogrammer
cd loreprogrammer
nvm use # gwarantuje Node 22.14.0
npm install
```

### Tryb deweloperski
```bash
npm run dev
```
Domyślnie: http://localhost:4321 (dokładny adres wyświetli Astro).

### Build produkcyjny i podgląd
```bash
npm run build
npm run preview
```

### Zalecany workflow
1. Utwórz gałąź feature
2. Wdrażaj zmianę małymi, czytelnymi commitami
3. Uruchom `npm run lint` i napraw ewentualne błędy
4. Uzupełnij dokumentację / komentarze jeśli trzeba
5. Otwórz Pull Request

### Zmienne środowiskowe (planowane)
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
```
Zostaną użyte przy integracji z Supabase (auth, realtime, przechowywanie danych).

## Dostępne skrypty
| Skrypt | Cel |
| ------ | --- |
| `npm run dev` | Uruchamia serwer deweloperski Astro |
| `npm run build` | Buduje wersję produkcyjną do `dist/` |
| `npm run preview` | Podgląd buildu produkcyjnego lokalnie |
| `npm run lint` | Uruchamia ESLint |
| `npm run lint:fix` | Automatyczne poprawki ESLint |
| `npm run format` | Formatuje kod i pliki treści Prettierem |

## Zakres projektu

### Wymagania funkcjonalne (PRD / plan)
- Cykl życia grup: tworzenie, usuwanie, dołączanie przez kod, ramy czasowe HAL + lore
- Role: admin (pełny dostęp), edytor (edycja przypisanych zajęć, podgląd wszystkich)
- Formularz zajęć (pola: temat, cel, zadania, czas, miejsce, materiały, odpowiedzialni, zakres wiedzy, uczestnicy, przebieg, podsumowanie)
- Ocena AI na żądanie: dwa wyniki liczbowe (lore, wartości harcerskie 1–10) + feedback tekstowy
- Pytania refleksyjne AI po ocenie
- Przypisanie wielu edytorów do jednego zajęcia
- Szablon dnia + widok całego planu obozu
- Aktualizacje w (quasi) czasie rzeczywistym
- Dashboard admina: metryki postępu, zadania, ostatnie aktywności
- Minimalizacja danych osobowych (login lub imię i nazwisko)

### Poza zakresem (MVP)
- Pełna automatyczna generacja programu przez AI
- Zewnętrzne bazy scenariuszy / integracje systemowe
- Zaawansowane raporty dla rodziców
- System komentarzy, eksport PDF
- Limity liczby grup
- Tryb offline (tylko online)

## Status projektu
Aktualnie dostępny jest podstawowy szkielet Astro + React + Tailwind. Implementacja funkcji z PRD w toku. Planowana mapa etapów (user stories):

| Faza | Obszar | Wybrane User Stories |
| ---- | ------ | -------------------- |
| 1 | Autoryzacja i Grupy | US-001, US-002, US-003, US-012 |
| 2 | Role i Zajęcia | US-004, US-005, US-013, US-010 (struktura dnia) |
| 3 | Ocena AI i Sugestie | US-006, US-007 |
| 4 | Realtime i Dashboard | US-008, US-009 |
| 5 | Prywatność i Szlify | US-011, audyt wydajności i dostępności |

### Wczesne metryki sukcesu (PRD)
- ≥90% zajęć końcowych osiąga wynik ≥7 (oba wymiary)
- Średnia liczba iteracji do osiągnięcia ≥7
- % zajęć z oceną 9–10
- Aktywność użytkowników: sesje, czas w aplikacji
- Liczba utworzonych grup HAL
- Wskaźnik ukończenia programu (>80% zaplanowanych aktywności)

### Wskazówki kontrybucji (tymczasowe)
Do czasu powstania `CONTRIBUTING.md`:
- Stosuj wytyczne z `.github/copilot-instructions.md`
- Preferuj komponenty Astro dla statycznego layoutu; React tylko dla interakcji
- Używaj wczesnych returnów i guard clauses
- Planuj walidację z użyciem Zod przy dodawaniu endpointów

## Licencja
Licencja MIT. Dodaj / uzupełnij plik LICENSE przy forkowaniu lub wdrożeniu produkcyjnym.

---

Brakuje czegoś? Otwórz zgłoszenie (issue) z opisem i odniesieniem do odpowiednich sekcji PRD.
