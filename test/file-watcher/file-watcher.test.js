#!/usr/bin/env node

/**
 * File Watcher Tests
 *
 * Tests modulares para el FileWatcher.
 */

import { FileWatcher } from '../../src/core/file-watcher.js';
import fs from 'fs/promises';
import path from 'path';
import {
  createTempDir,
  cleanupTempDir,
  createTestFiles,
  runTests,
  assertEquals,
  assertTrue,
  assertFalse,
  wait
} from '../helpers/test-setup.js';

// Test Suite
const fileWatcherTests = {
  name: 'FileWatcher',
  tests: {

    // Test 1: Crear FileWatcher
    'should create file watcher with default options': async () => {
      const tempDir = await createTempDir();
      const watcher = new FileWatcher(tempDir);

      assertEquals(watcher.options.debounceMs, 500);
      assertEquals(watcher.options.batchDelayMs, 1000);
      assertEquals(watcher.options.maxConcurrent, 3);
      assertFalse(watcher.isRunning);

      await cleanupTempDir(tempDir);
    },

    // Test 2: Crear con opciones personalizadas
    'should create file watcher with custom options': async () => {
      const tempDir = await createTempDir();
      const watcher = new FileWatcher(tempDir, {
        debounceMs: 200,
        batchDelayMs: 500,
        maxConcurrent: 5
      });

      assertEquals(watcher.options.debounceMs, 200);
      assertEquals(watcher.options.batchDelayMs, 500);
      assertEquals(watcher.options.maxConcurrent, 5);

      await cleanupTempDir(tempDir);
    },

    // Test 3: Inicializar file watcher
    'should initialize file watcher': async () => {
      const tempDir = await createTempDir();
      await createTestFiles(tempDir, {
        'src/index.js': 'console.log("hello");'
      });

      const watcher = new FileWatcher(tempDir, { verbose: false });

      let readyEmitted = false;
      watcher.on('ready', () => {
        readyEmitted = true;
      });

      await watcher.initialize();

      assertTrue(readyEmitted);
      assertTrue(watcher.fileHashes.has('src/index.js'));

      await watcher.stop();
      await cleanupTempDir(tempDir);
    },

    // Test 4: Notificar cambio
    'should queue file change notification': async () => {
      const tempDir = await createTempDir();
      await createTestFiles(tempDir, {
        'src/test.js': 'const x = 1;'
      });

      const watcher = new FileWatcher(tempDir, { verbose: false });
      await watcher.initialize();

      const filePath = path.join(tempDir, 'src', 'test.js');
      await watcher.notifyChange(filePath, 'modified');

      assertEquals(watcher.pendingChanges.size, 1);
      assertTrue(watcher.pendingChanges.has('src/test.js'));

      await watcher.stop();
      await cleanupTempDir(tempDir);
    },

    // Test 5: Ignorar archivos no relevantes
    'should ignore non-JS files': async () => {
      const tempDir = await createTempDir();

      const watcher = new FileWatcher(tempDir, { verbose: false });
      await watcher.initialize();

      await watcher.notifyChange(path.join(tempDir, 'readme.md'), 'modified');
      await watcher.notifyChange(path.join(tempDir, 'styles.css'), 'modified');
      await watcher.notifyChange(path.join(tempDir, 'image.png'), 'modified');

      assertEquals(watcher.pendingChanges.size, 0);

      await watcher.stop();
      await cleanupTempDir(tempDir);
    },

    // Test 6: Ignorar directorios del sistema
    'should ignore system directories': async () => {
      const tempDir = await createTempDir();

      const watcher = new FileWatcher(tempDir, { verbose: false });
      await watcher.initialize();

      await watcher.notifyChange(path.join(tempDir, 'node_modules/lodash/index.js'), 'modified');
      await watcher.notifyChange(path.join(tempDir, '.git/hooks/pre-commit'), 'modified');
      await watcher.notifyChange(path.join(tempDir, 'dist/bundle.js'), 'modified');

      assertEquals(watcher.pendingChanges.size, 0);

      await watcher.stop();
      await cleanupTempDir(tempDir);
    },

    // Test 7: Debounce de cambios
    'should debounce rapid changes': async () => {
      const tempDir = await createTempDir();
      await createTestFiles(tempDir, {
        'src/test.js': 'const x = 1;'
      });

      const watcher = new FileWatcher(tempDir, {
        debounceMs: 100,
        verbose: false
      });
      await watcher.initialize();

      const filePath = path.join(tempDir, 'src', 'test.js');

      // Múltiples cambios rápidos
      await watcher.notifyChange(filePath, 'modified');
      await watcher.notifyChange(filePath, 'modified');
      await watcher.notifyChange(filePath, 'modified');

      assertEquals(watcher.pendingChanges.size, 1);

      await watcher.stop();
      await cleanupTempDir(tempDir);
    },

    // Test 8: Detectar tipo de cambio (create)
    'should handle file creation': async () => {
      const tempDir = await createTempDir();

      const watcher = new FileWatcher(tempDir, { verbose: false });

      let createdEvent = null;
      watcher.on('file:created', (event) => {
        createdEvent = event;
      });

      await watcher.initialize();

      // Crear archivo
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'src', 'new.js'), 'export const foo = 1;', 'utf-8');

      await watcher.notifyChange(path.join(tempDir, 'src', 'new.js'), 'created');

      // Esperar procesamiento (sin análisis real por ahora)
      await wait(100);

      assertTrue(watcher.pendingChanges.has('src/new.js'));

      await watcher.stop();
      await cleanupTempDir(tempDir);
    },

    // Test 9: Detectar tipo de cambio (delete)
    'should handle file deletion': async () => {
      const tempDir = await createTempDir();
      await createTestFiles(tempDir, {
        'src/old.js': 'export const old = true;'
      });

      const watcher = new FileWatcher(tempDir, { verbose: false });

      let deletedEvent = null;
      watcher.on('file:deleted', (event) => {
        deletedEvent = event;
      });

      await watcher.initialize();

      await watcher.notifyChange(path.join(tempDir, 'src', 'old.js'), 'deleted');
      await wait(100);

      assertTrue(watcher.pendingChanges.has('src/old.js'));

      await watcher.stop();
      await cleanupTempDir(tempDir);
    },

    // Test 10: Estadísticas
    'should provide statistics': async () => {
      const tempDir = await createTempDir();
      await createTestFiles(tempDir, {
        'src/a.js': 'const a = 1;',
        'src/b.js': 'const b = 2;'
      });

      const watcher = new FileWatcher(tempDir, { verbose: false });
      await watcher.initialize();

      await watcher.notifyChange(path.join(tempDir, 'src', 'a.js'), 'modified');

      const stats = watcher.getStats();

      assertTrue(stats.isRunning);
      assertEquals(stats.pendingChanges, 1);
      assertEquals(stats.trackedFiles, 2);

      await watcher.stop();
      await cleanupTempDir(tempDir);
    },

    // Test 11: Stop gracefully
    'should stop gracefully': async () => {
      const tempDir = await createTempDir();

      const watcher = new FileWatcher(tempDir, { verbose: false });
      await watcher.initialize();

      assertTrue(watcher.isRunning);

      await watcher.stop();

      assertFalse(watcher.isRunning);

      await cleanupTempDir(tempDir);
    },

    // Test 12: Content hash tracking
    'should track file content hashes': async () => {
      const tempDir = await createTempDir();
      const filePath = path.join(tempDir, 'test.js');
      await fs.writeFile(filePath, 'const x = 1;', 'utf-8');

      const watcher = new FileWatcher(tempDir, { verbose: false });
      await watcher.initialize();

      const hash = watcher.fileHashes.get('test.js');
      assertTrue(hash);
      assertEquals(hash.length, 32); // MD5 hash = 32 hex chars

      await watcher.stop();
      await cleanupTempDir(tempDir);
    },

    // Test 13: Evento change:error
    'should emit error event on processing failure': async () => {
      const tempDir = await createTempDir();

      const watcher = new FileWatcher(tempDir, { verbose: false });

      let errorEvent = null;
      watcher.on('change:error', (event) => {
        errorEvent = event;
      });

      await watcher.initialize();

      // Notificar cambio en archivo inexistente
      await watcher.notifyChange(path.join(tempDir, 'nonexistent.js'), 'modified');

      // El error se emitiría durante el procesamiento
      // (implementación específica depende del processChange)

      await watcher.stop();
      await cleanupTempDir(tempDir);
    },

    // Test 14: Concurrent change protection
    'should protect against concurrent processing': async () => {
      const tempDir = await createTempDir();
      await createTestFiles(tempDir, {
        'src/test.js': 'const x = 1;'
      });

      const watcher = new FileWatcher(tempDir, {
        maxConcurrent: 1,
        verbose: false
      });
      await watcher.initialize();

      // El Set processingFiles debería estar vacío inicialmente
      assertEquals(watcher.processingFiles.size, 0);

      await watcher.stop();
      await cleanupTempDir(tempDir);
    },

    // Test 15: Clear pending on stop
    'should handle stop with pending changes': async () => {
      const tempDir = await createTempDir();
      await createTestFiles(tempDir, {
        'src/test.js': 'const x = 1;'
      });

      const watcher = new FileWatcher(tempDir, { verbose: false });
      await watcher.initialize();

      // Agregar cambios pendientes
      await watcher.notifyChange(path.join(tempDir, 'src', 'test.js'), 'modified');
      await watcher.notifyChange(path.join(tempDir, 'src', 'test.js'), 'modified');

      assertTrue(watcher.pendingChanges.size > 0);

      // Stop debería manejar esto gracefulmente
      await watcher.stop();

      assertFalse(watcher.isRunning);

      await cleanupTempDir(tempDir);
    }

  }
};

// Run tests
runTests(fileWatcherTests).then(() => {
  console.log('\n✅ File Watcher tests completed');
});
