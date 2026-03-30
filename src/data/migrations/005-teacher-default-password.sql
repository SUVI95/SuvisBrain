-- Permanent demo teacher login (same as scripts/set-demo-teacher-password.js default: demo123)
-- bcrypt cost 10 — safe to re-run; only fills password_hash when still NULL
UPDATE teachers
SET password_hash = '$2b$10$PKR7aUdz6TWufDT2cpj40OeM.npDoRvCG.8qNrRdomTytZ7R3aoS6'
WHERE LOWER(email) = LOWER('teacher@knuut.fi')
  AND password_hash IS NULL;
