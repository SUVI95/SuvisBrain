#!/usr/bin/env node
/**
 * Set password for demo teacher. Run once after setup.
 * Usage: node scripts/set-demo-teacher-password.js [password]
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { query } from '../api/db.js';

const password = process.argv[2] || 'demo123';
const email = 'teacher@knuut.fi';

async function main() {
  const hash = await bcrypt.hash(password, 10);
  await query('UPDATE teachers SET password_hash = $1 WHERE LOWER(email) = LOWER($2)', [hash, email]);
  console.log('Password set for', email);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
