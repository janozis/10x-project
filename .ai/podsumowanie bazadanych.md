<conversation_summary>
<decisions>

### Kluczowe decyzje

Lista podjętych decyzji projektowych dotyczących schematu bazy danych:

1. **Członkostwo w grupach** – użytkownik może należeć do wielu grup HAL jednocześnie (brak historii członkostwa).
2. **System zaproszeń** – kody ważne 7 dni, limit 30 użyć, 8 znaków alfanumerycznych (bez 0, O, I, l).
3. **Struktura zajęć** – 10 wymaganych pól jako osobne kolumny (TEXT), brak JSON/JSONB dla wydajności i walidowalności.
4. **Harmonogramowanie** – wiele terminów zajęć przez tabele `camp_days` i `activity_schedules`.
5. **Wersjonowanie ocen AI** – każda iteracja zapisu tworzy nową wersję oceny.
6. **Real-time updates** – brak osobnego event log; frontend odświeża dane natychmiast po zapisie.
7. **Zadania grupowe** – osobna tabela z opcjonalnym `activity_id` (nullable powiązanie).
8. **Uprawnienia edytorów** – edytorzy mają równe prawa w ramach przypisanych zajęć.
9. **Lore theme** – pole `lore_theme` typu TEXT w `groups`.
10. **RLS policies** – oparte o funkcję `user_group_role(user_id, group_id)` (role: admin/editor/member).
11. **Typy czasowe** – `INTERVAL` (duration), `TIME` (start/end), `TIMESTAMP` (daty).
12. **Materiały/załączniki** – TEXT z walidacją URL (zewnętrzne zasoby, np. Drive / OneDrive).
13. **Nazwy grup** – brak unikalności nazw (identyfikacja przez UUID PK).
14. **Soft delete** – pola `deleted_at` w `groups`, `activities`.
15. **Rate limiting AI** – 5 minut cooldown per activity między ocenami.
16. **Status transitions** – brak restrykcji (elastyczność MVP).
17. **Sugestie AI** – JSON schema (max 10 elementów, wymagane pola).
18. **Audit trail** – pola `created_by`, `updated_by`, `assigned_at`, `assigned_by` w kluczowych tabelach.
19. **Extensions** – `uuid-ossp`, `pgcrypto`, `pg_trgm` (Supabase users).
20. **Constraints** – CHECK: zakresy ocen 1–10, dni ≤30, `order_in_day ≥ 1`.
21. **CASCADE policies** – domyślnie RESTRICT, CASCADE wyłącznie relacje rodzic-dziecko.
22. **Default values** – `group.status='planning'`, `max_members=50`, `task.status='pending'`.
23. **Konwencja nazewnictwa** – snake_case + prefiksy `pk_`, `fk_`, `chk_`, `unq_`, `idx_`.
24. **Widoki** – `group_dashboard_stats`, `user_group_permissions` dla uproszczenia zapytań frontendu.

</decisions>
<matched_recommendations>

### Zgodne rekomendacje (implementacyjne)

Poniższe elementy są zgodne z najlepszymi praktykami i zostały przyjęte:

- Junction `group_memberships (user_id, group_id, role, joined_at)` – obsługa wielu grup.
- System zaproszeń w `groups` z polami `expires_at`, `max_uses=30`, `current_uses`.
- Kolumnowe pola aktywności (brak JSON) dla wydajności i indeksowania.
- Elastyczne planowanie: `camp_days` + `activity_schedules` (wiele terminów per activity).
- Wersjonowane oceny: `ai_evaluations(version, lore_score, scouting_values_score, feedback...)`.
- Tabela `group_tasks` z opcjonalnym `activity_id`.
- Junction `activity_editors` z `assigned_at`, `assigned_by_user_id` (audit trail).
- RLS: funkcja `user_group_role()` centralizuje logikę uprawnień.
- Indeksy pod realtime/dashboard (m.in. na kluczach obcych, filtrach aktywnych rekordów, polach daty).
- Soft delete przez `deleted_at` (możliwość przywrócenia / filtrowania aktywnych rekordów).
- Rate limiting: pole `last_evaluation_requested_at` + CHECK / trigger.
- CHECK constraints dla krytycznych zakresów (oceny, dni, statusy).
- Rozszerzenia PostgreSQL: `uuid-ossp`, `pgcrypto` (bezpieczne UUID), `pg_trgm` (wyszukiwanie tekstowe w nazwach / tematach).
- Widok dashboardu (agregacje metryk) zamiast ciężkich zapytań w aplikacji.

</matched_recommendations>
<database_planning_summary>

### Główne wymagania schematu
Aplikacja LoreProgrammer wymaga schematu wspierającego: współpracę zespołową, granularne role, wersjonowanie ocen AI, elastyczne harmonogramy, bezpieczeństwo dostępu (RLS) oraz audyt zmian.

### Kluczowe encje i relacje
- **Users** – zarządzani przez Supabase Auth; UUID referencje w innych tabelach.
- **Groups** – obozy HAL: zakres dat, tema lore, system zaproszeń.
- **Group_memberships** – role użytkowników w grupach (admin/editor/member) + `joined_at`.
- **Activities** – strukturyzowane zajęcia (10 kolumn obowiązkowych).
- **Camp_days** – dni obozu (oddzielona warstwa czasu, opcjonalny motyw dnia).
- **Activity_schedules** – mapowanie aktywności na konkretne dni/godziny (wiele wpisów per activity).
- **Activity_editors** – przypisania edytorów (audit: kiedy i przez kogo).
- **AI_evaluations** – wersje ocen (iteracje jakości i postępu).
- **Group_tasks** – zarządzanie zadaniami (opcjonalnie powiązane z aktywnością).

### Bezpieczeństwo i skalowalność
- RLS oparty o funkcję `user_group_role()` – kontrola kontekstowa per grupa.
- Soft delete dla danych wrażliwych biznesowo (grupy, aktywności) – zachowanie spójności referencji.
- Rate limiting dla kosztownych operacji AI.
- Walidacja zaproszeń: limit czasu, liczby użyć, czytelne kody.
- Rozszerzenia PostgreSQL zwiększające bezpieczeństwo i możliwości (UUID, kryptografia, trigram).

### Wydajność i optymalizacja
- Widoki `group_dashboard_stats`, `user_group_permissions` – redukcja złożoności zapytań w warstwie aplikacji.
- Strategiczne indeksy: filtry aktywne (`deleted_at IS NULL`), klucze obce, sortowanie wg czasu.
- JSON schema dla sugestii AI – spójność struktury wyników.
- Ostrożne użycie CASCADE – minimalizacja niezamierzonych usunięć.
- Realtime przez mechanizmy Supabase/Postgres (LISTEN/NOTIFY) – brak potrzeby dodatkowych log tables.

### Architektura danych
9 głównych tabel zapewnia wyraźne rozdzielenie odpowiedzialności:
1. Users (zewnętrzne – Supabase)
2. Groups
3. Group_memberships
4. Activities
5. Camp_days
6. Activity_schedules
7. Activity_editors
8. AI_evaluations
9. Group_tasks

### Audit & Integralność
- Pola śledzące (created_by, updated_by) + przypisania edytorów.
- CHECK / NOT NULL / klucze obce zapewniające spójność.
- Soft delete zamiast fizycznego usuwania – możliwość odtworzenia.

</database_planning_summary>
<unresolved_issues>

### Nierozwiązane kwestie
Aktualnie brak nierozwiązanych kwestii – wszystkie decyzje przyjęte. Schemat gotowy do implementacji (CREATE TABLE, funkcje, triggery, RLS policies).

**Następny krok:** generacja kompletnego zestawu DDL (tabele, indeksy, constraints, funkcje RLS, widoki) i wdrożenie migracji.

</unresolved_issues>
</conversation_summary>