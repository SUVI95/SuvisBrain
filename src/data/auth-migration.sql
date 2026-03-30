-- Teachers table + JWT_SECRET reminder
CREATE TABLE IF NOT EXISTS teachers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Default password: demo123 (bcrypt) — matches npm run set-teacher-password default
INSERT INTO teachers (name, email, password_hash) VALUES
  ('Teacher Demo', 'teacher@knuut.fi', '$2b$10$PKR7aUdz6TWufDT2cpj40OeM.npDoRvCG.8qNrRdomTytZ7R3aoS6')
ON CONFLICT (email) DO NOTHING;

UPDATE teachers
SET password_hash = '$2b$10$PKR7aUdz6TWufDT2cpj40OeM.npDoRvCG.8qNrRdomTytZ7R3aoS6'
WHERE LOWER(email) = LOWER('teacher@knuut.fi')
  AND password_hash IS NULL;
