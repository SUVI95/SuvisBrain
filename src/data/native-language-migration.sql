-- ============================================================
-- Add native_language (ISO 639-1) to learners — run in Neon SQL Editor
-- Used by Knuut prompt for brief native-language bridging when needed
-- ============================================================

ALTER TABLE learners ADD COLUMN IF NOT EXISTS native_language VARCHAR(10) DEFAULT NULL;

-- Optional: backfill from mother_tongue for test users
UPDATE learners SET native_language = 'en'  WHERE LOWER(TRIM(mother_tongue)) = 'english';
UPDATE learners SET native_language = 'ar'  WHERE LOWER(TRIM(mother_tongue)) = 'arabic';
UPDATE learners SET native_language = 'ru'  WHERE LOWER(TRIM(mother_tongue)) = 'russian';
UPDATE learners SET native_language = 'so'  WHERE LOWER(TRIM(mother_tongue)) = 'somali';
UPDATE learners SET native_language = 'zh'  WHERE LOWER(TRIM(mother_tongue)) IN ('mandarin', 'chinese');
