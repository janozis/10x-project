-- ================================================
-- DIAGNOSTYKA: Dlaczego teardown nie znajduje grup?
-- ================================================

-- KROK 1: Sprawdź wszystkie grupy testowe w bazie
-- (zamień UUID na swój E2E_USERNAME_ID z .env.test)
SELECT 
  id,
  name,
  created_by,
  created_at,
  deleted_at
FROM public.groups 
WHERE created_by IN (
  'a04ccb88-15f1-49a8-b3c0-f07b7bb226e5',  -- Zamień na E2E_USERNAME_ID
  'ea8413b5-1491-48b1-8e53-baadde8366f2'   -- Zamień na E2E_2_USERNAME_ID
)
ORDER BY created_at DESC;

-- Wynik pokaże:
-- - Czy są jakiekolwiek grupy utworzone przez testowych użytkowników
-- - Czy mają deleted_at (soft delete)

-- ================================================
-- KROK 2: Sprawdź grupy z nazwami testowymi
-- ================================================
SELECT 
  id,
  name,
  created_by,
  created_at,
  deleted_at
FROM public.groups 
WHERE name LIKE '%TEARDOWN%' 
   OR name LIKE '%Test Group%'
   OR name LIKE '%test%'
ORDER BY created_at DESC
LIMIT 20;

-- Wynik pokaże:
-- - Kto faktycznie stworzył grupy testowe (created_by UUID)
-- - Czy created_by pasuje do UUID z .env.test

-- ================================================
-- KROK 3: Znajdź UUID użytkownika testowego
-- ================================================
SELECT 
  id as user_uuid,
  email,
  created_at
FROM auth.users 
WHERE email LIKE '%test%'
ORDER BY created_at DESC;

-- Porównaj UUID z .env.test!

-- ================================================
-- KROK 4: Sprawdź ostatnio utworzone grupy (wszystkie)
-- ================================================
SELECT 
  g.id,
  g.name,
  g.created_by,
  u.email as creator_email,
  g.created_at
FROM public.groups g
LEFT JOIN auth.users u ON g.created_by = u.id
ORDER BY g.created_at DESC
LIMIT 20;

-- Wynik pokaże:
-- - Kto faktycznie tworzy grupy podczas testów
-- - Czy to jest użytkownik testowy czy ktoś inny

-- ================================================
-- KROK 5: Zlicz grupy według utworów
-- ================================================
SELECT 
  g.created_by,
  u.email,
  COUNT(*) as group_count
FROM public.groups g
LEFT JOIN auth.users u ON g.created_by = u.id
GROUP BY g.created_by, u.email
ORDER BY group_count DESC;

-- Wynik pokaże:
-- - Ilu użytkowników tworzy grupy
-- - Kto tworzy najwięcej (prawdopodobnie użytkownik testowy)

-- ================================================
-- MOŻLIWE PRZYCZYNY:
-- ================================================

-- 1. SOFT DELETE (deleted_at)
-- Jeśli grupy mają deleted_at, teardown ich nie znajdzie
-- bo filtruje tylko aktywne grupy. Sprawdź czy w kodzie teardown
-- jest WHERE deleted_at IS NULL

-- 2. UUID NIE PASUJE
-- Sprawdź dokładnie czy UUID w .env.test DOKŁADNIE pasuje
-- do created_by w grupach (case-sensitive!)

-- 3. GRUPY JUŻ ZOSTAŁY USUNIĘTE
-- Może poprzedni teardown już je usunął?
-- Uruchom test ponownie i od razu sprawdź bazę

-- 4. GRUPY SĄ W INNEJ BAZIE
-- Sprawdź czy .env.test wskazuje na właściwy projekt Supabase
-- (tę samą bazę gdzie aplikacja tworzy grupy)

-- ================================================
-- RĘCZNE CZYSZCZENIE (jeśli trzeba)
-- ================================================

-- UWAGA: To usunie WSZYSTKIE grupy testowe!
-- Najpierw uruchom SELECT żeby zobaczyć co zostanie usunięte

-- Znajdź grupy testowe:
SELECT id, name, created_by 
FROM public.groups 
WHERE name LIKE '%test%' OR name LIKE '%TEARDOWN%';

-- Jeśli OK, usuń (skopiuj ID grup z powyższego SELECT):
/*
BEGIN;

-- Usuń powiązane dane (przykład dla jednej grupy):
DELETE FROM public.ai_evaluations WHERE activity_id IN (
  SELECT id FROM public.activities WHERE group_id = 'GROUP-ID-TUTAJ'
);

DELETE FROM public.activity_editors WHERE activity_id IN (
  SELECT id FROM public.activities WHERE group_id = 'GROUP-ID-TUTAJ'
);

DELETE FROM public.activity_schedules WHERE activity_id IN (
  SELECT id FROM public.activities WHERE group_id = 'GROUP-ID-TUTAJ'
);

DELETE FROM public.group_tasks WHERE group_id = 'GROUP-ID-TUTAJ';
DELETE FROM public.activities WHERE group_id = 'GROUP-ID-TUTAJ';
DELETE FROM public.camp_days WHERE group_id = 'GROUP-ID-TUTAJ';
DELETE FROM public.group_memberships WHERE group_id = 'GROUP-ID-TUTAJ';
DELETE FROM public.groups WHERE id = 'GROUP-ID-TUTAJ';

COMMIT;
*/

