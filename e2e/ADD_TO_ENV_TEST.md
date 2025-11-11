# INSTRUKCJA: Dodaj brakującą zmienną do .env.test

## Problem
Teardown nie widzi zmiennej `SUPABASE_ANON_KEY` ponieważ w `.env.test` jest tylko `PUBLIC_SUPABASE_KEY`.

## Rozwiązanie

Otwórz plik `.env.test` w edytorze i znajdź linię z `PUBLIC_SUPABASE_KEY`:

```bash
PUBLIC_SUPABASE_KEY=twoj-anon-key
```

Dodaj **pod spodem** tę samą wartość jako `SUPABASE_ANON_KEY`:

```bash
PUBLIC_SUPABASE_KEY=twoj-anon-key
SUPABASE_ANON_KEY=twoj-anon-key
```

## Pełny przykład

Twój `.env.test` powinien mieć **wszystkie 4 zmienne**:

```bash
# Supabase URL and Keys (both formats required)
SUPABASE_URL=https://your-test-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Public variants (required for Astro client-side)
PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
PUBLIC_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**WAŻNE:** 
- `SUPABASE_URL` = `PUBLIC_SUPABASE_URL` (ta sama wartość)
- `SUPABASE_ANON_KEY` = `PUBLIC_SUPABASE_KEY` (ta sama wartość)

## Po dodaniu zmiennej

Uruchom test ponownie:

```bash
npx playwright test teardown-verification.spec.ts
```

Teraz powinno działać!

