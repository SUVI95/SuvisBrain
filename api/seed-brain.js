// api/seed-brain.js — run once: node api/seed-brain.js
import 'dotenv/config';
import { query } from './db.js';

const nodes = [
  { label: 'Knuut AI', type: 'Core', confidence: 1.0 },
  { label: 'Greeting Finnish', type: 'Skill', confidence: 0.9 },
  { label: 'Partitive case', type: 'Skill', confidence: 0.3 },
  { label: 'Vowel harmony', type: 'Skill', confidence: 0.4 },
  { label: 'Numbers 1-100', type: 'Skill', confidence: 0.8 },
  { label: 'Workplace vocab', type: 'Skill', confidence: 0.5 },
  { label: 'Healthcare vocab', type: 'Skill', confidence: 0.2 },
  { label: 'Transport vocab', type: 'Skill', confidence: 0.3 },
  { label: 'Culture: sisu', type: 'Memory', confidence: 0.7 },
  { label: 'Culture: silence norms', type: 'Memory', confidence: 0.6 },
  { label: 'Prefers short sessions', type: 'Memory', confidence: 0.8 },
  { label: 'Struggles with cases', type: 'Memory', confidence: 0.9 },
  { label: 'Mastered greetings', type: 'Memory', confidence: 1.0 },
  { label: 'Voice correction', type: 'Skill', confidence: 0.7 },
  { label: 'YKI practice mode', type: 'Skill', confidence: 0.5 },
  { label: 'Spaced repetition', type: 'Skill', confidence: 0.8 },
  { label: 'Session: intro', type: 'Conversation', confidence: 0.9 },
  { label: 'Session: workplace', type: 'Conversation', confidence: 0.6 },
  { label: 'Session: YKI mock', type: 'Conversation', confidence: 0.4 },
];

const edges = [
  ['Knuut AI', 'Greeting Finnish'],
  ['Knuut AI', 'Partitive case'],
  ['Knuut AI', 'Vowel harmony'],
  ['Knuut AI', 'Numbers 1-100'],
  ['Knuut AI', 'Workplace vocab'],
  ['Knuut AI', 'Voice correction'],
  ['Knuut AI', 'YKI practice mode'],
  ['Knuut AI', 'Spaced repetition'],
  ['Knuut AI', 'Culture: sisu'],
  ['Knuut AI', 'Culture: silence norms'],
  ['Knuut AI', 'Session: intro'],
  ['Knuut AI', 'Session: workplace'],
  ['Knuut AI', 'Session: YKI mock'],
  ['Workplace vocab', 'Healthcare vocab'],
  ['Workplace vocab', 'Transport vocab'],
  ['Session: intro', 'Greeting Finnish'],
  ['Session: intro', 'Prefers short sessions'],
  ['Session: workplace', 'Workplace vocab'],
  ['Session: workplace', 'Struggles with cases'],
  ['Session: YKI mock', 'YKI practice mode'],
  ['Session: YKI mock', 'Mastered greetings'],
];

async function seed() {
  console.log('Seeding brain_nodes...');
  const idMap = {};

  for (const n of nodes) {
    const existing = await query(`SELECT id FROM brain_nodes WHERE label = $1`, [n.label]);
    if (existing.rows.length > 0) {
      idMap[n.label] = existing.rows[0].id;
      console.log(`  (exists) ${n.label} (${n.type})`);
    } else {
      const r = await query(
        `INSERT INTO brain_nodes (label, type, metadata)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [n.label, n.type, JSON.stringify({ confidence_score: n.confidence, source: 'seed' })]
      );
      idMap[n.label] = r.rows[0].id;
      console.log(`  + ${n.label} (${n.type})`);
    }
  }

  const existing = await query(`SELECT id, label FROM brain_nodes`);
  existing.rows.forEach((r) => {
    idMap[r.label] = r.id;
  });

  console.log('\nSeeding brain_edges...');
  for (const [src, tgt] of edges) {
    if (!idMap[src] || !idMap[tgt]) {
      console.warn(`  ! Skipping edge ${src} → ${tgt} (node not found)`);
      continue;
    }
    const check = await query(
      `SELECT 1 FROM brain_edges WHERE source_id = $1 AND target_id = $2`,
      [idMap[src], idMap[tgt]]
    );
    if (check.rows.length > 0) {
      console.log(`  (exists) ${src} → ${tgt}`);
      continue;
    }
    await query(
      `INSERT INTO brain_edges (source_id, target_id, value)
       VALUES ($1, $2, 2)`,
      [idMap[src], idMap[tgt]]
    );
    console.log(`  → ${src} → ${tgt}`);
  }

  console.log('\nDone. Run GET /api/brain to verify.');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
