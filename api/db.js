// api/db.js — DB for API routes (Neon HTTP driver, serverless-safe)
import { neon } from '@neondatabase/serverless';

let _sql = null;

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url || !String(url).trim()) {
    return null;
  }
  if (!_sql) {
    _sql = neon(url, { fullResults: true });
  }
  return _sql;
}

/** True when DATABASE_URL is set (Neon is not initialized until first query). */
export function isDatabaseConfigured() {
  return !!(process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim());
}

export async function query(text, params = []) {
  const sql = getSql();
  if (!sql) {
    const err = new Error('DATABASE_URL not configured');
    err.code = 'NO_DATABASE';
    throw err;
  }
  const result = await sql(text, Array.isArray(params) ? params : [params]);
  return { rows: result && result.rows ? result.rows : [] };
}
