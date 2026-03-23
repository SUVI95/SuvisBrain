/**
 * Neon database client
 * Uses @neondatabase/serverless for serverless/edge compatibility
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export { sql };
