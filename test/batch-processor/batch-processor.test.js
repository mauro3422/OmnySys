#!/usr/bin/env node

/**
 * Batch Processor Tests
 *
 * Tests modulares para el BatchProcessor.
 */

import { BatchProcessor, Priority, BatchState } from '../../src/core/batch-processor/index.js';
import {
  runTests,
  assertEquals,
  assertTrue,
  assertFalse,
  wait
} from '../helpers/test-setup.js';

// Test Suite
const batchProcessorTests = {
  name: 'BatchProcessor',
  tests: {

    // Test 1: Crear batch processor
    'should create batch processor with default options': async () => {
      const processor = new BatchProcessor();

      assertEquals(processor.options.maxBatchSize, 50);
      assertEquals(processor.options.batchTimeoutMs, 1000);
      assertEquals(processor.options.maxConcurrent, 5);
      assertFalse(processor.isRunning);

      processor.stop();
    },

    // Test 2: Crear batch processor con opciones personalizadas
    'should create batch processor with custom options': async () => {
      const processor = new BatchProcessor({
        maxBatchSize: 10,
        batchTimeoutMs: 500,
        maxConcurrent: 3
      });

      assertEquals(processor.options.maxBatchSize, 10);
      assertEquals(processor.options.batchTimeoutMs, 500);
      assertEquals(processor.options.maxConcurrent, 3);

      processor.stop();
    },

    // Test 3: Agregar cambios
    'should add changes to pending queue': async () => {
      const processor = new BatchProcessor();
      processor.start();

      processor.addChange('src/file1.js', 'modified');
      processor.addChange('src/file2.js', 'created');

      assertEquals(processor.pendingChanges.size, 2);

      processor.stop();
    },

    // Test 4: Deduplicación de cambios
    'should deduplicate changes for same file': async () => {
      const processor = new BatchProcessor();
      processor.start();

      processor.addChange('src/file1.js', 'modified', { priority: Priority.LOW });
      processor.addChange('src/file1.js', 'modified', { priority: Priority.HIGH });

      assertEquals(processor.pendingChanges.size, 1);

      const change = processor.pendingChanges.get('src/file1.js');
      assertEquals(change.priority, Priority.HIGH); // Debería mantener la mayor prioridad

      processor.stop();
    },

    // Test 5: Calcular prioridad automáticamente
    'should calculate priority based on change type': async () => {
      const processor = new BatchProcessor();

      const change1 = processor.addChange('src/file1.js', 'created');
      assertEquals(change1.priority, Priority.LOW);

      const change2 = processor.addChange('src/file2.js', 'deleted');
      assertEquals(change2.priority, Priority.HIGH);

      const change3 = processor.addChange('src/file3.js', 'modified', {
        exportChanges: ['foo', 'bar']
      });
      assertEquals(change3.priority, Priority.HIGH);

      processor.stop();
    },

    // Test 6: Procesar cambio individual
    'should process individual change': async () => {
      let processed = false;
      const processor = new BatchProcessor({
        processChange: async (change) => {
          processed = true;
          assertEquals(change.filePath, 'src/test.js');
        }
      });

      processor.start();
      processor.addChange('src/test.js', 'modified');
      processor.flushBatch();

      await wait(100); // Esperar procesamiento

      assertTrue(processed);

      processor.stop();
    },

    // Test 7: Batch con múltiples cambios
    'should process batch with multiple changes': async () => {
      const processedFiles = [];
      const processor = new BatchProcessor({
        processChange: async (change) => {
          processedFiles.push(change.filePath);
        }
      });

      processor.start();

      processor.addChange('src/a.js', 'modified');
      processor.addChange('src/b.js', 'modified');
      processor.addChange('src/c.js', 'modified');

      processor.flushBatch();
      await wait(200);

      assertEquals(processedFiles.length, 3);
      assertTrue(processedFiles.includes('src/a.js'));
      assertTrue(processedFiles.includes('src/b.js'));
      assertTrue(processedFiles.includes('src/c.js'));

      processor.stop();
    },

    // Test 8: Orden topológico
    'should process changes in topological order': async () => {
      const order = [];
      const processor = new BatchProcessor({
        dependencyGraph: {
          'src/a.js': { dependsOn: ['src/b.js'], usedBy: [] },
          'src/b.js': { dependsOn: ['src/c.js'], usedBy: ['src/a.js'] },
          'src/c.js': { dependsOn: [], usedBy: ['src/b.js'] }
        },
        processChange: async (change) => {
          order.push(change.filePath);
        }
      });

      processor.start();

      processor.addChange('src/a.js', 'modified');
      processor.addChange('src/b.js', 'modified');
      processor.addChange('src/c.js', 'modified');

      processor.flushBatch();
      await wait(200);

      // c debería procesarse antes que b, y b antes que a
      const indexA = order.indexOf('src/a.js');
      const indexB = order.indexOf('src/b.js');
      const indexC = order.indexOf('src/c.js');

      assertTrue(indexC < indexB, 'c should be processed before b');
      assertTrue(indexB < indexA, 'b should be processed before a');

      processor.stop();
    },

    // Test 9: Estadísticas del batch
    'should provide batch statistics': async () => {
      const processor = new BatchProcessor();
      processor.start();

      processor.addChange('src/file1.js', 'modified', { priority: Priority.HIGH });
      processor.addChange('src/file2.js', 'created', { priority: Priority.LOW });
      processor.addChange('src/file3.js', 'deleted', { priority: Priority.CRITICAL });

      const batch = processor.flushBatch();
      const stats = batch.getStats();

      assertEquals(stats.totalChanges, 3);
      assertEquals(stats.byPriority.critical, 1);
      assertEquals(stats.byPriority.high, 1);
      assertEquals(stats.byPriority.low, 1);
      assertEquals(stats.byType.created, 1);
      assertEquals(stats.byType.modified, 1);
      assertEquals(stats.byType.deleted, 1);

      processor.stop();
    },

    // Test 10: Estadísticas del processor
    'should provide processor statistics': async () => {
      const processor = new BatchProcessor();
      processor.start();

      processor.addChange('src/file1.js', 'modified');
      processor.addChange('src/file2.js', 'modified');

      const stats = processor.getStats();

      assertEquals(stats.isRunning, true);
      assertEquals(stats.pendingChanges, 2);
      assertEquals(stats.maxConcurrent, 5);

      processor.stop();
    },

    // Test 11: Eventos del processor
    'should emit events during processing': async () => {
      const events = [];
      const processor = new BatchProcessor({
        processChange: async () => { /* noop */ }
      });

      processor.on('change:added', () => events.push('change:added'));
      processor.on('batch:created', () => events.push('batch:created'));
      processor.on('batch:started', () => events.push('batch:started'));
      processor.on('batch:completed', () => events.push('batch:completed'));

      processor.start();
      processor.addChange('src/test.js', 'modified');
      processor.flushBatch();

      await wait(100);

      assertTrue(events.includes('change:added'));
      assertTrue(events.includes('batch:created'));
      assertTrue(events.includes('batch:started'));
      assertTrue(events.includes('batch:completed'));

      processor.stop();
    },

    // Test 12: Cancelar batch
    'should cancel pending batch': async () => {
      const processor = new BatchProcessor();
      processor.start();

      processor.addChange('src/test.js', 'modified');
      const batch = processor.flushBatch();

      const cancelled = processor.cancelBatch(batch.id);

      assertTrue(cancelled);
      assertEquals(batch.state, BatchState.CANCELLED);

      processor.stop();
    },

    // Test 13: Retry en fallo
    'should retry failed changes': async () => {
      let attempts = 0;
      const processor = new BatchProcessor({
        processChange: async (change) => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Simulated failure');
          }
        }
      });

      processor.start();

      const change = processor.addChange('src/test.js', 'modified', { maxRetries: 3 });
      processor.flushBatch();

      await wait(500);

      assertEquals(attempts, 3);
      assertEquals(change.retryCount, 2);

      processor.stop();
    },

    // Test 14: Límite de reintentos
    'should stop retrying after max retries': async () => {
      let attempts = 0;
      const processor = new BatchProcessor({
        processChange: async () => {
          attempts++;
          throw new Error('Persistent failure');
        }
      });

      processor.on('batch:failed', () => {
        // Expected
      });

      processor.start();

      processor.addChange('src/test.js', 'modified', { maxRetries: 2 });
      processor.flushBatch();

      await wait(500);

      assertEquals(attempts, 2); // Intenta 2 veces (inicial + 1 retry)

      processor.stop();
    },

    // Test 15: Concurrencia limitada
    'should respect maxConcurrent limit': async () => {
      let concurrent = 0;
      let maxConcurrentObserved = 0;

      const processor = new BatchProcessor({
        maxConcurrent: 2,
        processChange: async () => {
          concurrent++;
          maxConcurrentObserved = Math.max(maxConcurrentObserved, concurrent);
          await wait(50);
          concurrent--;
        }
      });

      processor.start();

      // Agregar 5 cambios
      for (let i = 0; i < 5; i++) {
        processor.addChange(`src/file${i}.js`, 'modified');
      }
      processor.flushBatch();

      await wait(300);

      assertTrue(maxConcurrentObserved <= 2, 'Should not exceed maxConcurrent');
      assertEquals(concurrent, 0); // Todos deberían haber terminado

      processor.stop();
    }

  }
};

// Run tests
runTests(batchProcessorTests).then(() => {
  // Importar y correr otros tests si existen
  console.log('\n✅ Batch Processor tests completed');
});
