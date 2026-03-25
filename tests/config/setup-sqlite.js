import { vi, afterAll, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Ubicamos físicamente el esquema de la DB en el proyecto
const __fileUrl = new URL(import.meta.url);
const schemaPath = resolve(dirname(fileURLToPath(__fileUrl)), '../../src/layer-c-memory/storage/database/schema.sql');

let memoryDb = null;

// Mockeamos la capa de conexión canónica. Esto permite que toda la app 
// siga creyendo que inserta en SQLite en disco, pero usa memoria.
vi.mock('#layer-c-memory/storage/database/connection.js', async (importOriginal) => {
  const actual = await importOriginal();
  
  return {
    ...actual,
    initializeStorage: vi.fn((projectPath) => {
      if (!memoryDb) {
        memoryDb = new Database(':memory:');
        
        // Creamos la DB en memoria forzosamente con el esquema oficial SQL
        if (existsSync(schemaPath)) {
            const sql = readFileSync(schemaPath, 'utf8');
            memoryDb.exec(sql);
        } else {
            console.error('SQLite Integration Helper: No se encontró schema.sql en ', schemaPath);
        }
      }
      return true;
    }),
    getDatabase: vi.fn(() => {
      if (!memoryDb) throw new Error("La DB en memoria no fue inicializada en el test.");
      return memoryDb;
    }),
    shutdownStorage: vi.fn(() => {
      if (memoryDb) {
        memoryDb.close();
        memoryDb = null;
      }
    }),
    connectionManager: {
      getDatabase: () => memoryDb,
      initialize: () => true,
      transaction: (cb) => {
        // Ejecución síncrona de transacciones en better-sqlite3
        return memoryDb.transaction(cb)();
      }
    }
  };
});

afterEach(() => {
    // Si queremos reiniciar el estado DB prueba por prueba:
    // (Opcional: aquí se podría hacer TRUNCATE a las tablas)
});

afterAll(() => {
    if (memoryDb) {
        memoryDb.close();
        memoryDb = null;
    }
});
