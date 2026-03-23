// api/db.js — DB for API routes (Neon HTTP driver, serverless-safe)
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL, { fullResults: true });

export async function query(text, params = []) {
  const result = await sql(text, Array.isArray(params) ? params : [params]);
  return { rows: (result && result.rows) ? result.rows : [] };
}
