/**
 * Test Setup Helper
 *
 * Utilidades comunes para todos los tests.
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createLogger } from '../../src/utils/logger.js';

const logger = createLogger('OmnySys:test:setup');



/**
 * Crea un directorio temporal para tests
 */
export async function createTempDir(prefix = 'omnysys-test-') {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  return tempDir;
}

/**
 * Limpia un directorio temporal
 */
export async function cleanupTempDir(tempDir) {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    // Ignorar errores de limpieza
  }
}

/**
 * Crea archivos de prueba en un directorio
 */
export async function createTestFiles(baseDir, files) {
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(baseDir, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  }
}

/**
 * Espera un tiempo específico
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Crea un mock de EventEmitter para tests
 */
export function createMockEmitter() {
  const events = {};

  return {
    on(event, handler) {
      if (!events[event]) events[event] = [];
      events[event].push(handler);
    },
    emit(event, ...args) {
      if (events[event]) {
        events[event].forEach(handler => handler(...args));
      }
    },
    off(event, handler) {
      if (events[event]) {
        events[event] = events[event].filter(h => h !== handler);
      }
    }
  };
}

/**
 * Assertion helper simple (sin dependencias externas)
 */
export function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function assertEquals(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: ${message}\nExpected: ${expected}\nActual: ${actual}`
    );
  }
}

export function assertTrue(value, message = '') {
  assert(value === true, message || 'Expected true');
}

export function assertFalse(value, message = '') {
  assert(value === false, message || 'Expected false');
}

export function assertThrows(fn, message = '') {
  let threw = false;
  try {
    fn();
  } catch (e) {
    threw = true;
  }
  assert(threw, message || 'Expected function to throw');
}

/**
 * Contador de assertions para reporte final
 */
class TestCounter {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  record(name, passed, error = null) {
    this.tests.push({ name, passed, error });
    if (passed) {
      this.passed++;
    } else {
      this.failed++;
    }
  }

  summary() {
    return {
      total: this.tests.length,
      passed: this.passed,
      failed: this.failed,
      tests: this.tests
    };
  }
}

export const testCounter = new TestCounter();

/**
 * Runner de tests simple
 */
export async function runTests(testSuite) {
  logger.info(`\n🧪 Running: ${testSuite.name}\n`);

  for (const [testName, testFn] of Object.entries(testSuite.tests)) {
    try {
      await testFn();
      testCounter.record(`${testSuite.name}.${testName}`, true);
      logger.info(`  ✅ ${testName}`);
    } catch (error) {
      testCounter.record(`${testSuite.name}.${testName}`, false, error.message);
      logger.info(`  ❌ ${testName}: ${error.message}`);
    }
  }
}

/**
 * Reporte final de todos los tests
 */
export function printFinalReport() {
  const summary = testCounter.summary();

  logger.info('\n' + '='.repeat(50));
  logger.info('📊 TEST SUMMARY');
  logger.info('='.repeat(50));
  logger.info(`Total:  ${summary.total}`);
  logger.info(`Passed: ${summary.passed} ✅`);
  logger.info(`Failed: ${summary.failed} ❌`);
  logger.info('='.repeat(50));

  if (summary.failed > 0) {
    logger.info('\nFailed tests:');
    summary.tests
      .filter(t => !t.passed)
      .forEach(t => logger.info(`  - ${t.name}: ${t.error}`));
  }

  process.exit(summary.failed > 0 ? 1 : 0);
}
