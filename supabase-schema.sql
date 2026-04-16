-- EducTrack — Schéma Supabase
-- Colle ce SQL dans Supabase > SQL Editor > New query > Run

-- Table des sessions / groupes
CREATE TABLE IF NOT EXISTS sessions (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- Table des apprenants
CREATE TABLE IF NOT EXISTS students (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT,
  "group"    TEXT,
  photo      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des présences
CREATE TABLE IF NOT EXISTS attendance (
  id         BIGSERIAL PRIMARY KEY,
  date       DATE NOT NULL,
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'present',
  note       TEXT DEFAULT '',
  UNIQUE (date, session_id, student_id)
);

-- Accès public en lecture/écriture (Row Level Security désactivé pour simplifier)
ALTER TABLE sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE students   ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_sessions"   ON sessions   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_students"   ON students   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_attendance" ON attendance FOR ALL USING (true) WITH CHECK (true);

-- Données initiales
INSERT INTO sessions (id, name) VALUES
  ('marketing', 'Marketing Digital'),
  ('web',       'Développement Web et Mobile')
ON CONFLICT (id) DO NOTHING;
