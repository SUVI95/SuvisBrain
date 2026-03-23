// api/db.js — DB for API routes (Neon HTTP driver, serverless-safe)
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL, { fullResults: true });

export async function query(text, params = []) {
  const result = await sql(text, params);
  return { rows: result.rows || [] };
}
