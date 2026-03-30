-- ALKUPOLKU LMS — teacher roles + module catalog (Kuopio tender backbone)
-- Idempotent; safe to re-run.

ALTER TABLE teachers ADD COLUMN IF NOT EXISTS teacher_kind text
  CHECK (teacher_kind IS NULL OR teacher_kind IN ('vastuuopettaja', 'ohjaaja'));

COMMENT ON COLUMN teachers.teacher_kind IS 'Vastuuopettaja (A) vs Ohjaaja (B) — tender roles';

CREATE TABLE IF NOT EXISTS lms_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  level_label text,
  theme text NOT NULL,
  sort_order int DEFAULT 0,
  content jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Mock shell content aligned with api/lms.js MODULES_OPH2022; run 004-oph-module-shell-content.sql to refresh existing rows.
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
