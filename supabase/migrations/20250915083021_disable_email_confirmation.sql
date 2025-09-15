-- Disable email confirmation for new user signups
-- This allows users to login immediately after signup without email verification

-- Update the auth.config table to disable email confirmation
ALTER TABLE auth.users
ALTER COLUMN email_confirmed_at SET DEFAULT NOW();

-- For existing unconfirmed users, confirm them
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;