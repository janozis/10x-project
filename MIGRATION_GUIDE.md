# Przewodnik Migracji Supabase

## Jak wgrać migracje do bazy danych?

### Opcja 1: Lokalna baza danych (Development)

#### 1. Uruchom lokalną instancję Supabase

```bash
npx supabase start
```

To uruchomi lokalny stack Supabase z bazą PostgreSQL.

#### 2. Zastosuj wszystkie migracje

```bash
npx supabase db reset
```

**Co robi ta komenda?**
- Resetuje lokalną bazę danych
- Aplikuje wszystkie migracje z folderu `supabase/migrations/` w kolejności chronologicznej
- Wykonuje seed z pliku `supabase/seed.sql` (jeśli istnieje)

**Alternatywnie** (bez resetu, tylko nowe migracje):

```bash
npx supabase migration up
```

To zastosuje tylko te migracje, które jeszcze nie były wykonane.

#### 3. Sprawdź status migracji

```bash
npx supabase migration list
```

Pokazuje które migracje zostały zastosowane.

---

### Opcja 2: Produkcyjna baza danych (Remote)

#### 1. Połącz lokalny projekt z projektem Supabase

```bash
npx supabase link --project-ref twoj-project-ref
```

`project-ref` znajdziesz w dashboardzie Supabase w ustawieniach projektu.

#### 2. Sprawdź różnice między lokalną a zdalną bazą

```bash
npx supabase db diff --linked
```

#### 3. Zastosuj migracje na produkcji

```bash
npx supabase db push
```

**UWAGA**: Ta komenda wgra wszystkie nowe migracje na produkcję. Upewnij się, że:
- Masz backup bazy danych
- Przetestowałeś migracje lokalnie
- Jesteś pewien, że chcesz wprowadzić zmiany

---

### Opcja 3: Ręczne wgranie przez Dashboard Supabase

1. Przejdź do [Supabase Dashboard](https://supabase.com/dashboard)
2. Wybierz swój projekt
3. Idź do **Database** → **SQL Editor**
4. Otwórz plik migracji (np. `20251105000000_ai_evaluation_requests_rls.sql`)
5. Skopiuj zawartość i wklej w edytor SQL
6. Kliknij **RUN**

**Uwaga**: Upewnij się, że wykonujesz migracje w odpowiedniej kolejności chronologicznej!

---

### Opcja 4: Tylko nowa migracja RLS (najszybsza)

Jeśli chcesz zastosować tylko najnowszą migrację RLS, którą właśnie stworzyliśmy:

#### Lokalnie:

```bash
npx supabase migration up --include-all
```

#### Produkcja:

1. Skopiuj zawartość pliku `supabase/migrations/20251105000000_ai_evaluation_requests_rls.sql`
2. Wklej w **SQL Editor** w Supabase Dashboard
3. Uruchom

---

## Dodatkowe komendy Supabase CLI

### Status lokalnej instancji

```bash
npx supabase status
```

Pokazuje porty i URLs dla lokalnych serwisów.

### Zatrzymanie lokalnej instancji

```bash
npx supabase stop
```

### Stworzenie nowej migracji

```bash
npx supabase migration new nazwa_migracji
```

### Generowanie typów TypeScript

```bash
npx supabase gen types typescript --local > src/db/database.types.ts
```

Lub dla produkcji:

```bash
npx supabase gen types typescript --linked > src/db/database.types.ts
```

---

## Troubleshooting

### "Migration already applied"

Jeśli migracja została już zastosowana:

```bash
npx supabase migration list
```

Sprawdź które migracje są aktywne.

### Reset lokalnej bazy z zachowaniem danych

```bash
# Eksportuj dane
npx supabase db dump -f backup.sql

# Reset
npx supabase db reset

# Importuj dane
psql postgresql://postgres:postgres@localhost:54322/postgres < backup.sql
```

### Sprawdzenie logów lokalnej bazy

```bash
npx supabase db logs
```

---

## Recommended Workflow

1. **Develop lokalnie**:
   ```bash
   npx supabase start
   npx supabase db reset  # po każdej zmianie migracji
   ```

2. **Test**:
   ```bash
   npm run test
   npm run test:e2e
   ```

3. **Deploy na produkcję**:
   ```bash
   npx supabase link --project-ref <your-ref>
   npx supabase db push
   npx supabase gen types typescript --linked > src/db/database.types.ts
   ```

4. **Commit**:
   ```bash
   git add supabase/migrations/
   git add src/db/database.types.ts
   git commit -m "feat: add RLS policies for ai_evaluation_requests"
   git push
   ```

---

## Co właśnie dodaliśmy?

Nowa migracja `20251105000000_ai_evaluation_requests_rls.sql` dodaje:

- **RLS dla tabeli `ai_evaluation_requests`**
- **4 polityki**:
  - `SELECT` - użytkownik widzi requesty dla aktywności w swoich grupach
  - `INSERT` - może tworzyć requesty dla aktywności, które może edytować
  - `UPDATE` - tylko admini mogą aktualizować (zwykle backend)
  - `DELETE` - tylko admini mogą usuwać

Szczegółowy opis wszystkich polityk RLS znajdziesz w pliku `supabase/RLS_POLICIES.md`.

