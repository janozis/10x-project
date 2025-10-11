Podsumowanie ustaleń dla PRD aplikacji LoreProgrammer
🎯 Cel produktu
Aplikacja webowa pomagająca harcerzom planować programy HAL (Harcerskich Akcji Letnich) z oceną AI zgodności zajęć z wybraną tematyką (lore) oraz wartościami harcerskimi.

👥 Użytkownicy docelowi
Instruktorzy harcerscy (zarówno doświadczeni jak i początkujący)
Jeden poziom wsparcia dla wszystkich użytkowników
🏗 Architektura systemu
Tech Stack:
Frontend: Astro 5 + React 19 + TypeScript 5 + Tailwind 4 + Shadcn/ui
Backend: Supabase (pełne rozwiązanie backendowe)
AI: OpenRouter.ai dla komunikacji z modelami
CI/CD: GitHub Actions
Hosting: DigitalOcean (Docker)
Autoryzacja:
Email/hasło przez Supabase Auth
Standardowe funkcje: rejestracja, login, reset hasła
🔐 Model uprawnień
Role:
Admin grupy: pełne uprawnienia, może tworzyć/usuwać grupę, zarządzać członkami, przypisywać zadania
Edytor: może edytować przypisane zajęcia
Zarządzanie grupami:
Każdy może utworzyć grupę HAL
Twórca = admin, może usunąć swoją grupę
Zapraszanie przez kod zaproszenia
Jedno zajęcie może mieć wielu edytorów
🤖 System oceny AI
Kryteria oceny:
Dwie osobne oceny: zgodność z lore + umiejętności harcerskie
Skala: 1-10 dla każdej kategorii
Komunikaty:
1-3: "Wymaga znacznych poprawek"
4-6: "Dobra podstawa, sugerujemy zmiany"
7-8: "Bardzo dobre"
9-10: "Doskonałe"
Funkcjonalność:
Automatyczna ocena po zapisaniu formularza
Sugestie w formie pytań prowokujących do przemyśleń
Baza wiedzy: dokumenty markdown (do przygotowania)
Otwarta lista tematyk lore (bez walidacji AI na tym etapie)
📋 Struktura formularza zajęć
Temat (np. "Bandażowanie poszkodowanego")
Cel (perspektywa prowadzącego)
Zadania/cele poboczne (wymierzalne cele dla uczestników)
Czas (przewidywany czas trwania)
Miejsce (określenie przestrzeni)
Potrzebne materiały
Osoba/y odpowiedzialna/e
Zakres wiedzy wymaganej
Uczestnicy (liczba, poziom wiedzy)
Przebieg zbiórki (szczegółowy plan)
🎛 Dashboard admina
Kluczowe elementy:
Postęp grupy (% zajęć z oceną >7)
Lista zadań do przypisania
Ostatnie aktywności edytorów
Szybki dostęp do dodawania zajęć i zarządzania członkami
Struktura dnia:
Domyślny szablon: Śniadanie → Blok zajęć 1-2 → Obiad → Blok zajęć 3-4 → Kolacja → Blok zajęć 5
Format nazewnictwa: "2026-07-02 :: Blok zajęć 1"
Możliwość tworzenia wielu bloków zajęć
🚀 Zakres MVP
Zawiera:
Rejestracja/logowanie użytkowników
Tworzenie i zarządzanie grupami HAL
System ról (admin/edytor)
Strukturowany formularz zajęć
Automatyczna ocena AI (lore + harcerstwo)
Dashboard z postępem i zarządzaniem zadaniami
Real-time updates zmian
Nie zawiera:
Różne poziomy wsparcia dla użytkowników
System komentarzy
Eksport do PDF
Ograniczenia ilości grup/projektów
Walidacja wiedzy AI o tematykach
Testowanie z użytkownikami
⏰ Harmonogram
Czas realizacji: 6 tygodni
Cel: Funkcjonalna aplikacja webowa gotowa dla prawdziwych użytkowników
Model finansowy: Darmowa aplikacja finansowana przez organizacje harcerskie
🎯 Kryteria sukcesu
90% zajęć końcowego programu uzyskuje ocenę ≥7 w obu kategoriach (lore + umiejętności harcerskie) według AI.