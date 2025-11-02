-- Skrypt do sprawdzenia czy użytkownik jest członkiem grupy
-- Uruchom w Supabase SQL Editor lub psql

-- 1. Sprawdź czy DEFAULT_USER_ID istnieje w auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE id = 'a7a0c17c-69e9-49a3-8b8e-5926b825a021';

-- 2. Sprawdź członkostwo w grupie (group_id z URL)
SELECT 
  gm.user_id,
  gm.group_id,
  gm.role,
  gm.joined_at,
  g.name as group_name
FROM public.group_memberships gm
JOIN public.groups g ON g.id = gm.group_id
WHERE gm.group_id = 'b12b5eef-70d0-427a-88c1-aed3cd8cc0b5'
  AND gm.user_id = 'a7a0c17c-69e9-49a3-8b8e-5926b825a021';

-- 3. Sprawdź widok user_group_permissions
SELECT *
FROM public.user_group_permissions
WHERE group_id = 'b12b5eef-70d0-427a-88c1-aed3cd8cc0b5'
  AND user_id = 'a7a0c17c-69e9-49a3-8b8e-5926b825a021';

-- 4. Sprawdź wszystkie członkostwa dla tego użytkownika
SELECT 
  gm.group_id,
  g.name as group_name,
  gm.role,
  gm.joined_at
FROM public.group_memberships gm
JOIN public.groups g ON g.id = gm.group_id
WHERE gm.user_id = 'a7a0c17c-69e9-49a3-8b8e-5926b825a021';

-- 5. Sprawdź aktywności w grupie (powinno być 6)
SELECT 
  id,
  title,
  status,
  created_by,
  deleted_at,
  created_at
FROM public.activities
WHERE group_id = 'b12b5eef-70d0-427a-88c1-aed3cd8cc0b5'
  AND deleted_at IS NULL;

-- 6. Jeśli użytkownik nie jest członkiem, dodaj go jako admina (UWAGA: uruchom tylko jeśli potrzebujesz)
-- INSERT INTO public.group_memberships (user_id, group_id, role)
-- VALUES ('a7a0c17c-69e9-49a3-8b8e-5926b825a021', 'b12b5eef-70d0-427a-88c1-aed3cd8cc0b5', 'admin')
-- ON CONFLICT (user_id, group_id) DO UPDATE SET role = 'admin';

