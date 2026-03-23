// api/db.js — DB for API routes (Neon serverless driver = pg-compatible for Vercel)
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}
