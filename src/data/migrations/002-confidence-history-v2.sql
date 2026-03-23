-- Task 1: confidence_history with score/date format + backfill
-- Run in Neon SQL Editor

ALTER TABLE brain_nodes
  ADD COLUMN IF NOT EXISTS confidence_history JSONB DEFAULT '[]';

-- Backfill current scores as first history entry
UPDATE brain_nodes
SET confidence_history = jsonb_build_array(
  jsonb_build_object(
    'score', COALESCE((metadata->>'confidence_score')::float, 0.5),
    'date',  NOW()::date
  )
)
WHERE confidence_history = '[]' OR confidence_history IS NULL;
