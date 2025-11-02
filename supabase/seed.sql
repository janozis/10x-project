-- Seed file for local development
-- Creates a default test user for auth-less development mode

-- Insert default dev user into auth.users
-- This user is referenced by DEFAULT_USER_ID in src/db/supabase.client.ts
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES (
  'a7a0c17c-69e9-49a3-8b8e-5926b825a021'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'dev@localhost',
  crypt('devpassword', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- Optional: Create an identity for the user
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES (
  'a7a0c17c-69e9-49a3-8b8e-5926b825a021'::uuid,
  'a7a0c17c-69e9-49a3-8b8e-5926b825a021'::uuid,
  '{"sub":"a7a0c17c-69e9-49a3-8b8e-5926b825a021"}'::jsonb,
  'email',
  now(),
  now(),
  now()
)
ON CONFLICT (provider, id) DO NOTHING;

