#!/usr/bin/env node
/**
 * Demo data for Jyväskylä Kotoutumiskoulu — run: node scripts/seed-demo.js
 * Requires: DATABASE_URL, bcrypt (see package.json)
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { query } from '../api/db.js';

const ORG_NAME = 'Jyväskylä Kotoutumiskoulu';
const TITLES = [
  'Kaupassa asioiminen',
  'Työhaastattelu sanasto',
  'Suomen verbien taivutus',
  'Arjen sanasto',
  'Terveyspalvelut suomeksi',
  'Julkinen liikenne',
  'Asuminen ja kodin sanasto',
  'Ruoka ja ravintola',
  'Numerot ja kellonajat',
  'Työssäoppiminen sanasto',
];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  console.log('--- Organisation ---');
  await query(
    `INSERT INTO organisations (name, type, plan)
     VALUES ($1, $2, $3)
     ON CONFLICT (name) DO NOTHING`,
    [ORG_NAME, 'municipality', 'pro']
  );
  const orgRes = await query('SELECT id FROM organisations WHERE name = $1', [ORG_NAME]);
  const orgId = orgRes.rows[0]?.id;
  if (!orgId) throw new Error('Could not resolve organisation id');
  console.log('OK org_id:', orgId);

  console.log('--- Teacher ---');
  const passwordHash = await bcrypt.hash('Knuut2026!', 10);
  await query(
    `INSERT INTO teachers (name, email, password_hash, org_id, admin)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO NOTHING`,
    ['Matti Virtanen', 'teacher@knuut.demo', passwordHash, orgId, false]
  );
  const tRes = await query('SELECT id FROM teachers WHERE email = $1', ['teacher@knuut.demo']);
  console.log('OK teacher:', tRes.rows[0]?.id || '(already existed)');

  console.log('--- Learners ---');
  const learnerSpecs = [
    { name: 'Amira Hassan', email: 'amira@knuut.demo', mother_tongue: 'Arabic', cefr: 'A2' },
    { name: 'Pavel Sorokin', email: 'pavel@knuut.demo', mother_tongue: 'Russian', cefr: 'B1' },
    { name: 'Fatuma Warsame', email: 'fatuma@knuut.demo', mother_tongue: 'Somali', cefr: 'A1' },
    { name: 'Leila Ahmadi', email: 'leila@knuut.demo', mother_tongue: 'Dari', cefr: 'A1' },
    { name: 'Dmytro Kovalenko', email: 'dmytro@knuut.demo', mother_tongue: 'Ukrainian', cefr: 'A2' },
    { name: 'Hodan Farah', email: 'hodan@knuut.demo', mother_tongue: 'Somali', cefr: 'A2' },
  ];

  for (const L of learnerSpecs) {
    await query(
      `INSERT INTO learners (name, email, mother_tongue, cefr_level, org_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [L.name, L.email, L.mother_tongue, L.cefr, orgId]
    );
    const lr = await query('SELECT id FROM learners WHERE email = $1', [L.email]);
    console.log('OK learner', L.email, lr.rows[0]?.id);
  }

  const byEmail = async (email) => {
    const r = await query('SELECT id FROM learners WHERE email = $1', [email]);
    return r.rows[0]?.id;
  };

  const nelli = await query(`SELECT id FROM agents WHERE name = 'Nelli' LIMIT 1`);
  const nelliId = nelli.rows[0]?.id || null;

  console.log('--- Clean old demo episodes (same learner emails) ---');
  const demoIds = await query(
    `SELECT id FROM learners WHERE email LIKE '%@knuut.demo'`
  );
  const ids = (demoIds.rows || []).map((r) => r.id);
  if (ids.length) {
    await query(`DELETE FROM episodes WHERE learner_id = ANY($1::uuid[])`, [ids]);
    console.log('OK deleted episodes for', ids.length, 'learners');
  }

  console.log('--- Episodes ---');
  const summaries = [
    'Practiced shopping phrases and polite requests at the counter.',
    'Role-played interview questions and key vocabulary for jobs.',
    'Reviewed present tense conjugation patterns with short drills.',
    'Built everyday vocabulary for home and routines.',
    'Simulated booking an appointment and describing symptoms.',
    'Used tickets, routes, and asking for directions in Finnish.',
    'Covered housing terms and describing a flat.',
    'Ordered food and discussed dietary preferences.',
    'Numbers, prices, and telling time in context.',
    'Workplace small talk and task-related phrases.',
  ];

  async function insertEpisodes(learnerId, dayOffsets) {
    for (let i = 0; i < dayOffsets.length; i++) {
      const day = dayOffsets[i];
      const title = TITLES[i % TITLES.length];
      const summary = summaries[i % summaries.length];
      const duration_s = randInt(900, 2400);
      const created_at = daysAgo(day);
      await query(
        `INSERT INTO episodes (agent_id, learner_id, title, summary, duration_s, language, org_id)
         VALUES ($1, $2, $3, $4, $5, 'fi', $6)`,
        [nelliId, learnerId, title, summary, duration_s, orgId]
      );
      console.log('  episode:', title, 'dayAgo', day, 'learner', learnerId);
    }
  }

  // Pavel: 8, latest today (day 0)
  const pavelId = await byEmail('pavel@knuut.demo');
  await insertEpisodes(pavelId, [0, 1, 3, 5, 8, 12, 18, 22]);

  // Amira: 7
  const amiraId = await byEmail('amira@knuut.demo');
  await insertEpisodes(amiraId, [1, 2, 4, 6, 9, 14, 20]);

  // Dmytro: 6
  const dmytroId = await byEmail('dmytro@knuut.demo');
  await insertEpisodes(dmytroId, [2, 5, 7, 11, 16, 24]);

  // Hodan: 6
  const hodanId = await byEmail('hodan@knuut.demo');
  await insertEpisodes(hodanId, [1, 4, 6, 10, 15, 21]);

  // Fatuma: 4, all >10 days ago
  const fatumaId = await byEmail('fatuma@knuut.demo');
  await insertEpisodes(fatumaId, [12, 16, 22, 28]);

  // Leila: 3, all >10 days ago
  const leilaId = await byEmail('leila@knuut.demo');
  await insertEpisodes(leilaId, [15, 20, 26]);

  console.log('\nDone. Logins:');
  console.log('  Teacher: teacher@knuut.demo / Knuut2026!');
  console.log('  Learners: amira@knuut.demo, pavel@knuut.demo, … (email only, no password)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
