-- Prevent duplicate SOL profiles for the same email (case-insensitive).
-- Empty emails are excluded so a failed Clerk profile fetch cannot block others.
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_lower_unique"
  ON "users" (lower("email"))
  WHERE "email" <> '';
