import { vi, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __fileUrl = new URL(import.meta.url);
const schemaPath = resolve(dirname(fileURLToPath(__fileUrl)), '../../src/layer-c-memory/storage/database/schema.sql');

let dbInstance = null;

function getRealDbPath() {
  const projectRoot = resolve(dirname(fileURLToPath(__fileUrl)), '../..');
  return resolve(projectRoot, '.omnysysdata', 'omnysys.db');
}

vi.mock('../../src/layer-c-memory/storage/database/connection.js', async () => {
  const actual = await importOriginal();
  const dbPath = getRealDbPath();

  return {
    ...actual,
    initializeStorage: vi.fn((projectPath) => {
      if (!dbInstance) {
        const dir = dirname(dbPath);
        if (!existsSync(dir)) {
          require('fs').mkdirSync(dir, { recursive: true });
        }

        dbInstance = new Database(dbPath, {
          timeout: 5000,
          fileMustExist: false
        });

        dbInstance.pragma('journal_mode = WAL');
        dbInstance.pragma('busy_timeout = 5000');
        dbInstance.pragma('synchronous = NORMAL');

        if (existsSync(schemaPath)) {
          const sql = readFileSync(schemaPath, 'utf8');
          dbInstance.exec(sql);
        }
      }
      return true;
    }),
    getDatabase: vi.fn(() => {
      if (!dbInstance) throw new Error("DB no inicializada. Ejecutá npm start primero o usá test:unit para modo mock.");
      return dbInstance;
    }),
    shutdownStorage: vi.fn(() => {
      if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
      }
    }),
    connectionManager: {
      getDatabase: () => dbInstance,
      initialize: () => true,
      transaction: (cb) => dbInstance ? dbInstance.transaction(cb)() : cb()
    }
  };
});

beforeEach(() => {
  console.log('[LIVE MODE] Usando DB real - servidor MCP debe estar corriendo');
});