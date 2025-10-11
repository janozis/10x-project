# Dokument wymagań produktu (PRD) - LoreProgrammer

## 1. Przegląd produktu
LoreProgrammer to aplikacja webowa wspierająca harcerzy i instruktorów w planowaniu programów Harcerskich Akcji Letnich (HAL) zgodnie z wybraną tematyką „lore” oraz wartościami harcerskimi. Umożliwia współpracę zespołową, automatyczną ocenę AI, zarządzanie grupami i zadaniami, a także iteracyjne doskonalenie zajęć.

## 2. Problem użytkownika
Brak narzędzi pozwalających na tworzenie spójnych programów obozowych, które jednocześnie zachowują klimat wybranego „lore” i realizują cele wychowania harcerskiego. Użytkownicy mają trudności z oceną i ulepszaniem propozycji zajęć pod kątem zgodności z tematyką oraz wartościami harcerskimi.

## 3. Wymagania funkcjonalne
- Tworzenie i zarządzanie grupami HAL (tworzenie, usuwanie, zapraszanie przez kod, dodanie Lore HAL)
- System ról: admin (pełne uprawnienia), edytor (edycja przypisanych zajęć)
- Strukturowany formularz zajęć (10 wymaganych pól: temat, cel, zadania, czas, miejsce, materiały, odpowiedzialni, zakres wiedzy, uczestnicy, przebieg, podsumowanie)
- Ręcznie sterowana ocena AI: dwie osobne oceny (zgodność z lore 1-10, wartości harcerskie 1-10) z komunikatami tekstowymi
- Sugestie AI w formie pytań prowokujących do przemyśleń
- Dashboard admina: postęp grupy, lista zadań, aktywności, zarządzanie członkami
- Domyślny szablon dnia z blokami zajęć
- Real-time updates dla wszystkich członków grupy
- Uwierzytelnianie przez email/hasło (Supabase Auth)
- Minimalizacja zbierania danych osobowych (login lub imię i nazwisko)

## 4. Granice produktu
- Brak automatycznego generowania całych programów przez AI
- Brak integracji z gotowymi bazami scenariuszy i systemami harcerskimi
- Brak zaawansowanych raportów i analiz dla rodziców
- Brak systemu komentarzy, eksportu PDF, ograniczeń ilości grup
- Praca wyłącznie online
- Brak testowania z użytkownikami w MVP

## 5. Historyjki użytkowników

### US-001: Rejestracja i uwierzytelnianie
- Tytuł: Bezpieczna rejestracja użytkownika
- Opis: Jako instruktor lub harcerz chcę się zarejestrować i zalogować do aplikacji, aby uzyskać dostęp do funkcji planowania programu.
- Kryteria akceptacji:
  - Użytkownik może zarejestrować się podając email i hasło
  - Użytkownik może się zalogować
  - Dane są przechowywane bezpiecznie

### US-002: Tworzenie nowej grupy HAL
- Tytuł: Inicjacja grupy programowej
- Opis: Jako instruktor chcę utworzyć nową grupę HAL, aby rozpocząć planowanie programu.
- Kryteria akceptacji:
  - Użytkownik może utworzyć grupę podając nazwę i opis
  - Otrzymuje kod zaproszenia
  - Może usunąć własną grupę
  - Użytkownik daje informację na temat tego od kiedy do kiedy jest HAL

### US-003: Zapraszanie członków do grupy
- Tytuł: Dodawanie współpracowników
- Opis: Jako admin chcę zaprosić innych użytkowników do grupy przez kod, aby wspólnie planować program.
- Kryteria akceptacji:
  - Użytkownik może dołączyć do grupy przez kod
  - Admin może zarządzać członkami

### US-004: Zarządzanie rolami użytkowników
- Tytuł: Przypisywanie ról
- Opis: Jako admin chcę przypisywać role (admin/edytor) członkom grupy, aby kontrolować uprawnienia.
- Kryteria akceptacji:
  - Admin może nadać/zmienić rolę użytkownika
  - Edytor może edytować tylko przypisane zajęcia
  - Edytor moze przeglądać wszystkie zajęcia w grupie

### US-005: Tworzenie i edycja zajęć
- Tytuł: Planowanie aktywności
- Opis: Jako admin lub edytor chcę dodawać i edytować zajęcia w programie, aby dostosować je do potrzeb grupy.
- Kryteria akceptacji:
  - Użytkownik może dodać nowe zajęcie przez formularz (10 pól)
  - Może edytować istniejące zajęcia
  - Może przypisać zajęcie do wielu edytorów

### US-006: Automatyczna ocena AI
- Tytuł: Ocena zgodności zajęć
- Opis: Jako użytkownik chcę otrzymać na żądanie ocenę AI dla każdego zajęcia, aby sprawdzić zgodność z lore i wartościami harcerskimi.
- Kryteria akceptacji:
  - Po zapisaniu zajęcia jest możliwość wygenerowania ocen
  - Po wywołaniu wygenerowania ocen AI (np. za pomocą przycisku), generowane są dwie oceny (lore, harcerstwo)
  - Wyświetlane są komunikaty tekstowe zgodnie ze skalą

### US-007: Sugestie AI do zajęć
- Tytuł: Ulepszanie aktywności
- Opis: Jako użytkownik chcę otrzymać sugestie AI w formie pytań, aby poprawić zajęcia.
- Kryteria akceptacji:
  - Po ocenie AI wyświetlane są pytania prowokujące do przemyśleń

### US-008: Real-time updates
- Tytuł: Współpraca w czasie rzeczywistym
- Opis: Jako członek grupy chcę widzieć zmiany w programie natychmiast, aby efektywnie współpracować.
- Kryteria akceptacji:
  - Zmiany w programie są widoczne dla wszystkich członków grupy jak najszybciej (po wprowadzeniu i zapisaniu zmian)

### US-009: Dashboard admina
- Tytuł: Monitorowanie postępu
- Opis: Jako admin chcę monitorować postęp grupy, zarządzać zadaniami i aktywnościami.
- Kryteria akceptacji:
  - Admin widzi % zajęć z oceną >7
  - Może przypisywać zadania
  - Widzi ostatnie aktywności zespołu

### US-010: Struktura dnia
- Tytuł: Szablon bloków zajęć
- Opis: Jako użytkownik chcę korzystać z domyślnego szablonu dnia, aby łatwiej planować harmonogram.
- Kryteria akceptacji:
  - Użytkownik może dodać bloki zajęć według szablonu

### US-011: Minimalizacja danych osobowych
- Tytuł: Ochrona prywatności
- Opis: Jako użytkownik chcę podawać tylko login lub imię i nazwisko, aby chronić swoją prywatność.
- Kryteria akceptacji:
  - Formularz rejestracji nie wymaga dodatkowych danych osobowych

### US-012: Usuwanie grupy
- Tytuł: Zarządzanie własnymi grupami
- Opis: Jako użytkownik chcę mieć możliwość usunięcia własnej grupy, aby kontrolować swoje zasoby.
- Kryteria akceptacji:
  - Użytkownik może usunąć grupę, którą utworzył

### US-013: Przypisywanie zadań do wielu edytorów
- Tytuł: Wspólna odpowiedzialność
- Opis: Jako admin chcę przypisać jedno zajęcie do wielu edytorów, aby zwiększyć współpracę.
- Kryteria akceptacji:
  - Jedno zajęcie może mieć wielu edytorów

### US-014: Dostępność online
- Tytuł: Praca wyłącznie online
- Opis: Jako użytkownik chcę korzystać z aplikacji wyłącznie online, aby mieć dostęp z dowolnego miejsca.
- Kryteria akceptacji:
  - Aplikacja działa wyłącznie w trybie online

### US-010: Struktura obozu
- Tytuł: Widok bloków zajęć na całym obozie
- Opis: Jako użytkownik chcę widzieć wszystkie dni obozowe wraz z ich zajęciami lub ich brakiem
  - Użytkownik może zobaczyć wszystkie zajęcia w HAL

## 6. Metryki sukcesu
- 90% zajęć końcowego programu uzyskuje ocenę ≥7 w obu kategoriach (lore + umiejętności harcerskie)
- Średni czas tworzenia zajęcia
- Liczba iteracji do osiągnięcia oceny ≥7
- Procent zajęć z oceną 9-10
- Aktywność użytkowników (sesje, czas spędzony w aplikacji)
- Liczba utworzonych grup HAL
- Współczynnik ukończenia programów (grupy z >80% zaplanowanych aktywności)
