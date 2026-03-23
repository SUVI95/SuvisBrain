-- Teachers table + JWT_SECRET reminder
CREATE TABLE IF NOT EXISTS teachers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO teachers (name, email) VALUES
  ('Teacher Demo', 'teacher@knuut.fi')
ON CONFLICT (email) DO NOTHING;
