<project_description>

<decisions>

1. **Grupa docelowa**: zarówno doświadczeni instruktorzy jak i początkujący harcerze przygotowujący obozy, wszyscy traktowani równo
2. **System oceny AI**: skala 1-10 z dwoma osobnymi ocenami (zgodność z lore + umiejętności harcerskie)
3. **Komunikaty oceny**: 
   - 1-3: "Wymaga znacznych poprawek"
   - 4-6: "Dobra podstawa, sugerujemy zmiany"
   - 7-8: "Bardzo dobre"
   - 9-10: "Doskonałe"
4. **Tematyki lore**: całkowicie otwarta lista bez weryfikacji wiedzy AI
5. **Dodatkowe źródło wiedzy AI**: dokumenty w formacie markdown (do przygotowania)
6. **Tryb pracy**: wyłącznie online
7. **Model biznesowy**: darmowa aplikacja finansowana przez organizacje harcerskie
8. **Role użytkowników**: admini (pełne uprawnienia) + edytorzy (edycja przypisanych elementów)
9. **Zarządzanie grupami**: każdy może utworzyć i usunąć swoją grupę, zapraszanie przez kod zaproszenia
10. **Przypisywanie zadań**: jedno zajęcie może mieć wielu edytorów, admini przydzielają zadania
11. **Dane osobowe**: tylko loginy lub imię i nazwisko autorów
12. **Integracje**: brak integracji z istniejącymi systemami harcerskimi
13. **Harmonogram**: 6 tygodni na pełne MVP, brak testowania z użytkownikami
14. **Tech stack**: Astro 5 + React 19 + Supabase + OpenRouter.ai + DigitalOcean
15. **Autoryzacja**: email/hasło przez Supabase Auth
16. **Updates**: real-time dla wszystkich członków grupy
17. **Sugestie AI**: w formie pytań prowokujących do przemyśleń
18. **Strukturowany formularz zajęć**: z 10 wymaganymi polami
19. **Wykluczenia z MVP**: system komentarzy, eksport PDF, ograniczenia ilości grup

</decisions>

<matched_recommendations>

- ✅ **Wprowadzenie skali ocen 1-10** z konkretnymi komunikatami tekstowymi dla każdego przedziału - przyjęte w pełni
- ✅ **System ról admin/edytor** z jasnym podziałem uprawnień - przyjęte i rozwinięte
- ✅ **Minimalizacja zbierania danych osobowych** - przyjęte (tylko login/imię i nazwisko)
- ✅ **Standalone aplikacja** bez integracji z możliwością przyszłego rozwoju - przyjęte
- ✅ **Semi-strukturowany formularz** z wymaganymi i opcjonalnymi polami - przyjęte jako pełny strukturowany formularz
- ✅ **Autosave z live updates** bez konfliktów - przyjęte jako real-time updates
- ✅ **Szybki tech stack** (Supabase dla backend, szybki deploy) - przyjęte i rozwinięte
- ✅ **Dashboard z postępem grupy** i zarządzaniem zadaniami - przyjęte w pełni
- ✅ **System zaproszeń do grup** - przyjęte jako kod zaproszenia
- ✅ **Automatyczna ocena AI** po zapisaniu - przyjęte

</matched_recommendations>

<prd_planning_summary>

## Główne wymagania funkcjonalne produktu

**LoreProgrammer** to aplikacja webowa umożliwiająca harcerzom collaborative planning programów HAL (Harcerskich Akcji Letnich) z automatyczną oceną AI zgodności zajęć z wybraną tematyką i wartościami harcerskimi.

### Kluczowe funkcjonalności:

- **Zarządzanie grupami HAL**: tworzenie, usuwanie grup, zapraszanie członków przez kod
- **System uprawnień**: role admin (pełne uprawnienia) i edytor (edycja przypisanych zajęć)
- **Strukturowany formularz zajęć**: 10 pól obejmujących temat, cel, zadania, czas, miejsce, materiały, odpowiedzialnych, zakres wiedzy, uczestników i przebieg
- **Automatyczna ocena AI**: dwie osobne oceny (lore 1-10 + harcerstwo 1-10) z tekstowymi komunikatami
- **Sugestie AI**: pytania prowokujące do przemyśleń nad poprawkami
- **Dashboard admina**: postęp grupy, lista zadań, aktywności, zarządzanie członkami
- **Struktura dnia**: domyślny szablon z blokami zajęć (śniadanie → bloki 1-5 → posiłki)
- **Real-time collaboration**: natychmiastowe updates dla wszystkich członków

### Kluczowe historie użytkownika i ścieżki korzystania

#### Historia 1: Tworzenie nowej grupy HAL
1. Instruktor rejestruje się w aplikacji (email/hasło)
2. Tworzy nową grupę HAL z nazwą i opisem
3. Otrzymuje kod zaproszenia dla współpracowników
4. Zaprasza edytorów przez udostępnienie kodu
5. Tworzy strukturę dni z blokami zajęć

#### Historia 2: Planowanie zajęć z oceną AI
1. Admin/edytor otwiera formularz nowego zajęcia
2. Wypełnia wszystkie wymagane pola (temat, cel, zadania, etc.)
3. Zapisuje formularz - ręcznie poprzez naciśnięcie przycisku uruchamia się ocena AI
4. Otrzymuje dwie oceny (lore + harcerstwo) z komunikatami
5. Analizuje sugestie AI w formie pytań prowokujących
6. Iteracyjnie poprawia zajęcie do osiągnięcia satysfakcjonującej oceny

#### Historia 3: Collaborative management programu
1. Admin monitoruje postęp na dashboardzie (% zajęć z oceną >7)
2. Przypisuje nowe bloki zajęć do edytorów
3. Śledzi ostatnie aktywności zespołu
4. Edytorzy pracują nad przypisanymi zajęciami
5. Zmiany są widoczne real-time dla wszystkich członków

### Ważne kryteria sukcesu i sposoby ich mierzenia

#### Główne kryterium sukcesu:
**90% zajęć końcowego programu uzyskuje ocenę ≥7** w obu kategoriach (lore + umiejętności harcerskie)

#### Metryki operacyjne:
- Średni czas tworzenia zajęcia
- Liczba iteracji potrzebnych do osiągnięcia oceny ≥7
- Procent zajęć z oceną 9-10 ("Doskonałe")
- Aktywność użytkowników (sesje, czas spędzony w aplikacji)
- Liczba utworzonych grup HAL
- Współczynnik ukończenia programów (groups with >80% planned activities)

#### Metryki techniczne:
- Czas odpowiedzi AI (<30 sekund)
- Uptime aplikacji (>99%)
- Real-time synchronization latency
- User registration/retention rates

</prd_planning_summary>
</project_description>