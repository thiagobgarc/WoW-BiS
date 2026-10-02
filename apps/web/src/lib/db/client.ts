import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

/** Lazily connects on first use so importing this module never requires DATABASE_URL to be set (Phases 1-2 don't touch Postgres at all). */
export function getDb() {
  if (dbInstance) return dbInstance;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Set it in .env to use the BiS data layer.');
  }

  const client = postgres(connectionString, { max: 5 });
  dbInstance = drizzle(client, { schema });
  return dbInstance;
}
