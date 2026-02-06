/**
 * Env Reader B
 * Tests: env-connections
 * Reads: DB_HOST, API_KEY (DB_HOST is shared with env-reader-a.js)
 * Expected: shared-env connection on DB_HOST
 */

const DB_HOST = process.env.DB_HOST || 'localhost';
const API_KEY = process.env.API_KEY || '';

export function getConnectionString() {
  return `mongodb://${DB_HOST}:27017?apiKey=${API_KEY}`;
}
