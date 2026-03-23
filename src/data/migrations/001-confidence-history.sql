-- Add confidence_history for sparklines (run in Neon SQL Editor)
alter table brain_nodes add column if not exists confidence_history jsonb default '[]';

-- Add metadata for mock exam scores
alter table episodes add column if not exists metadata jsonb default '{}';
