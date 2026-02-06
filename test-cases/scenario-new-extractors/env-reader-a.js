/**
 * Env Reader A
 * Tests: env-connections
 * Reads: DB_HOST, PORT
 */

const DB_HOST = process.env.DB_HOST || 'localhost';
const PORT = process.env.PORT || 3000;

export function getDatabaseConfig() {
  return {
    host: DB_HOST,
    port: PORT
  };
}
