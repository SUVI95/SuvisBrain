-- ============================================================
-- Ensure all required tables/columns exist in Neon
-- Run this in Neon SQL Editor if you're unsure what's been applied
-- Idempotent — safe to run multiple times
-- ============================================================
-- Prerequisite: agents, episodes, brain_nodes must exist.
-- For a fresh DB, run schema.sql first, then this file.

-- 1. Learners table (must exist before episodes.learner_id FK)
CREATE TABLE IF NOT EXISTS learners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  mother_tongue text,
  cefr_level text DEFAULT 'A1',
  agent_id uuid REFERENCES agents(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Episodes: metadata + learner_id (for learner-scoped sessions)
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS learner_id uuid REFERENCES learners(id);

-- 2b. Brain nodes: metadata (if table existed from older schema)
ALTER TABLE brain_nodes ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_episodes_learner ON episodes(learner_id);

-- 3. Brain nodes: confidence_history (for sparklines)
ALTER TABLE brain_nodes ADD COLUMN IF NOT EXISTS confidence_history jsonb DEFAULT '[]';

-- 4. Teachers (for auth)
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text,
  created_at timestamptz DEFAULT now()
);

-- 4b. Default teacher login (bcrypt: demo123) — only sets password_hash when NULL
INSERT INTO teachers (name, email, password_hash)
VALUES ('Teacher Demo', 'teacher@knuut.fi', '$2b$10$PKR7aUdz6TWufDT2cpj40OeM.npDoRvCG.8qNrRdomTytZ7R3aoS6')
ON CONFLICT (email) DO NOTHING;
UPDATE teachers
SET password_hash = '$2b$10$PKR7aUdz6TWufDT2cpj40OeM.npDoRvCG.8qNrRdomTytZ7R3aoS6'
WHERE LOWER(email) = LOWER('teacher@knuut.fi')
  AND password_hash IS NULL;

-- 5. Learners: native_language (ISO 639-1)
ALTER TABLE learners ADD COLUMN IF NOT EXISTS native_language varchar(10) DEFAULT NULL;

-- 6. Teacher override (human-in-the-loop, EU AI Act)
ALTER TABLE learners ADD COLUMN IF NOT EXISTS teacher_reviewed_at timestamptz DEFAULT NULL;

-- 7. Learners: learning_goal (onboarding)
ALTER TABLE learners ADD COLUMN IF NOT EXISTS learning_goal text DEFAULT NULL;

-- 8. Multi-tenancy (required for /api/teacher/learners when teacher has org_id)
CREATE TABLE IF NOT EXISTS organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  type text DEFAULT 'school',
  plan text DEFAULT 'trial',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE learners ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organisations(id);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organisations(id);
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organisations(id);
ALTER TABLE brain_nodes ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organisations(id);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organisations(id);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS admin boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_learners_org ON learners(org_id);
CREATE INDEX IF NOT EXISTS idx_episodes_org ON episodes(org_id);
CREATE INDEX IF NOT EXISTS idx_agents_org ON agents(org_id);
CREATE INDEX IF NOT EXISTS idx_brain_nodes_org ON brain_nodes(org_id);

-- 9. Streak freezes (required for /api/brain/stats and /api/brain/use-freeze)
ALTER TABLE learners ADD COLUMN IF NOT EXISTS streak_freezes_remaining int DEFAULT 2;
ALTER TABLE learners ADD COLUMN IF NOT EXISTS streak_freezes_used jsonb DEFAULT '[]';

-- 10. CEFR history (optional, but used by parts of the learning pipeline)
CREATE TABLE IF NOT EXISTS cefr_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid REFERENCES learners(id),
  from_level text,
  to_level text NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cefr_history_learner ON cefr_history(learner_id);

-- 11. Teacher support metadata for S2 Finnish teaching
ALTER TABLE learners ADD COLUMN IF NOT EXISTS teacher_focus_area text DEFAULT NULL;
ALTER TABLE learners ADD COLUMN IF NOT EXISTS teacher_support_type text DEFAULT NULL;
ALTER TABLE learners ADD COLUMN IF NOT EXISTS teacher_barrier text DEFAULT NULL;
ALTER TABLE learners ADD COLUMN IF NOT EXISTS teacher_life_context text DEFAULT NULL;
ALTER TABLE learners ADD COLUMN IF NOT EXISTS teacher_confidence_note text DEFAULT NULL;
ALTER TABLE learners ADD COLUMN IF NOT EXISTS teacher_next_action text DEFAULT NULL;
ALTER TABLE learners ADD COLUMN IF NOT EXISTS teacher_followup_flag boolean DEFAULT false;
ALTER TABLE learners ADD COLUMN IF NOT EXISTS teacher_last_action_at timestamptz DEFAULT NULL;
ALTER TABLE learners ADD COLUMN IF NOT EXISTS learner_goal_domain text DEFAULT NULL;

-- 12. Teacher action log for auditable human-in-the-loop support
CREATE TABLE IF NOT EXISTS teacher_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid REFERENCES learners(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  note text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_actions_learner ON teacher_actions(learner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_actions_teacher ON teacher_actions(teacher_id, created_at DESC);

-- 13. ALKUPOLKU LMS (kotoutumiskoulutus — teacher_kind + module catalog)
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS teacher_kind text
  CHECK (teacher_kind IS NULL OR teacher_kind IN ('vastuuopettaja', 'ohjaaja'));

CREATE TABLE IF NOT EXISTS lms_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  level_label text,
  theme text NOT NULL,
  sort_order int DEFAULT 0,
  content jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

INSERT INTO lms_modules (code, level_label, theme, sort_order, content) VALUES
  ('M1', 'Pre-A1', 'Latin alphabet, basic sounds, numbers', 1, '{"title_fi":"Moduuli 1: Latinalaiset aakkoset, perusäänteet, numerot","title_en":"Module 1: Latin alphabet, basic sounds, numbers","body":"Tervetuloa moduuliin 1. Harjoitellaan aakkoset ja numerot 1–20.","oph":"OPH 2022 — kotoutumiskoulutus","video":"Demo: äänteet ja kirjaimet A–Ö","exercises":["Yhdistä kirjain ja äänne","Kirjoita numero sanana"],"vocabulary":["aakkoset","numero","vokaali","konsonantti"],"speaking":"Lausu aakkoset ääneen hitaasti.","quiz":"Alkutasoitus: aakkoset ja numerot"}'),
  ('M2', 'A1.1', 'Greetings, daily life, family', 2, '{"title_fi":"Moduuli 2: Tervehdykset, arki, perhe","title_en":"Module 2: Greetings, daily life, family","body":"Minun nimi on… Minulla on perhe…","oph":"OPH 2022 — kotoutumiskoulutus","video":"Demo: tervehdykset ja esittäytyminen","exercises":["Täytä dialogi","Kuka tämä on?"],"vocabulary":["terve","hyvää päivää","perhe","lapset"],"speaking":"Esittele itsesi ja perheesi lyhyesti.","quiz":"Tasoitus: arjen sanasto"}'),
  ('M3', 'A1.2', 'Work vocabulary, asking for help', 3, '{"title_fi":"Moduuli 3: Työsanasto, avun pyytäminen","title_en":"Module 3: Work vocabulary, asking for help","body":"Voisitteko auttaa? En ymmärrä ohjetta.","oph":"OPH 2022 — kotoutumiskoulutus","video":"Demo: työpaikalla — pyydä apua kohteliaasti","exercises":["Muodollinen pyyntö","Kuuntele ja toista"],"vocabulary":["vuoro","tauko","apu","ohje"],"speaking":"Harjoittele pyytämään apua työtilanteessa.","quiz":"Työsanasto A1.2"}'),
  ('M4', 'A1.3', 'Healthcare, services, transport', 4, '{"title_fi":"Moduuli 4: Terveydenhuolto, palvelut, liikenne","title_en":"Module 4: Healthcare, services, transport","body":"Minulla on aika. Missä on odotus? Tarvitsen reseptin.","oph":"OPH 2022 — kotoutumiskoulutus","video":"Demo: terveyskeskuksessa","exercises":["Ajanvaraus","Bussilippu"],"vocabulary":["aika","sairas","bussi","lippu"],"speaking":"Kuvitteellinen käynti terveysasemalla.","quiz":"Palvelutilanteet"}'),
  ('M5', 'A2.1', 'Workplace Finnish, instructions', 5, '{"title_fi":"Moduuli 5: Työelämän suomi, ohjeet","title_en":"Module 5: Workplace Finnish, instructions","body":"Työvuoro alkaa kello… Käytä suojavarusteita.","oph":"OPH 2022 — kotoutumiskoulutus","video":"Demo: työturvallisuus ja ohjeet","exercises":["Ohjeen järjestys","Turvamerkit"],"vocabulary":["vuorolista","suojat","varoitus"],"speaking":"Toista ohje omin sanoin.","quiz":"Työpaikan peruskieli"}'),
  ('M6', 'A2.2', 'Job seeking, interviews, YKI prep', 6, '{"title_fi":"Moduuli 6: Työnhaku, haastattelu, YKI-valmennus","title_en":"Module 6: Job seeking, interviews, YKI prep","body":"Kertokaa itsestänne. Miksi haette tätä työtä?","oph":"OPH 2022 — kotoutumiskoulutus","video":"Demo: työhaastattelu","exercises":["CV sanasto","YKI-testin rakenne"],"vocabulary":["kokemus","vahvuus","hakemus"],"speaking":"Lyhyt haastatteluharjoitus.","quiz":"YKI-keskitaso — lähtötaso"}'),
  ('YX', '+All', 'Finnish society & culture (yhteiskuntatietous)', 7, '{"title_fi":"Moduuli 7: Yhteiskuntatietous ja suomalainen kulttuuri","title_en":"Module 7: Finnish society & culture (yhteiskuntatietous)","body":"Oikeudet, velvollisuudet, äänestäminen — perusteet.","oph":"OPH 2022 — kotoutumiskoulutus","video":"Demo: yhteiskunta ja palvelut Suomessa","exercises":["Palvelut kartalla","Keskusteluaiheita"],"vocabulary":["kunta","palvelu","laki"],"speaking":"Keskustelu: arki Suomessa.","quiz":"Yhteiskuntatietous — mini"}'),
  ('EL', '+All', 'Life management (elämänhallinta)', 8, '{"title_fi":"Moduuli 8: Elämänhallinta ja hyvinvointi","title_en":"Module 8: Life management (elämänhallinta)","body":"Budjetti, tavoitteet, tuki — peruskäsitteet.","oph":"OPH 2022 — kotoutumiskoulutus","video":"Demo: talous ja arjen suunnittelu","exercises":["Arjen tavoitteet","Apua mistä?"],"vocabulary":["tavoite","aika","tuki"],"speaking":"Pieni tavoite itselle — kerro suomeksi.","quiz":"Elämänhallinta — mini"}')
ON CONFLICT (code) DO NOTHING;

-- 14. Teacher workflow: placements + HOPS draft (ALKUPOLKU)
CREATE TABLE IF NOT EXISTS learner_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN (
      'not_started',
      'employer_found',
      'briefing_done',
      'active',
      'completed',
      'feedback_given'
    )),
  employer_name text,
  employer_contact text,
  start_date date,
  end_date date,
  briefing_at timestamptz,
  feedback_at timestamptz,
  notes text,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE (learner_id)
);

CREATE INDEX IF NOT EXISTS idx_learner_placements_status ON learner_placements(status);
CREATE INDEX IF NOT EXISTS idx_learner_placements_start ON learner_placements(start_date);

ALTER TABLE learners ADD COLUMN IF NOT EXISTS hops_draft text;
ALTER TABLE learners ADD COLUMN IF NOT EXISTS hops_draft_at timestamptz;

-- 15. Learner micro-practice (daily completion)
CREATE TABLE IF NOT EXISTS learner_micro_practice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  day date NOT NULL,
  word_key text NOT NULL,
  completed_at timestamptz DEFAULT now(),
  UNIQUE (learner_id, day)
);

CREATE INDEX IF NOT EXISTS idx_learner_micro_learner ON learner_micro_practice(learner_id, day DESC);
