/**
 * @fileoverview config.test.js
 * 
 * Tests for configuration module
 */

import { 
  DATA_DIR, 
  getIndexPath, 
  getSystemMapPath,
  getDataPath 
} from '#config/paths.js';

import {
  BATCH,
  ANALYSIS,
  SERVER
} from '#config/limits.js';

import {
  FileChangeType,
  SemanticChangeType,
  Priority
} from '#config/change-types.js';

// Simple test runner
function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertTrue(value, message) {
  if (!value) {
    throw new Error(message || 'Expected true');
  }
}

console.log('\n🧪 Running config tests...\n');

// Paths tests
test('DATA_DIR should be .omnysysdata', () => {
  assertEqual(DATA_DIR, '.omnysysdata', 'DATA_DIR');
});

test('getIndexPath should construct correct path', () => {
  const path = getIndexPath('/project');
  assertTrue(path.includes('.omnysysdata'), 'Path should include .omnysysdata');
  assertTrue(path.includes('index.json'), 'Path should include index.json');
});

test('getSystemMapPath should construct correct path', () => {
  const path = getSystemMapPath('/project');
  assertTrue(path.includes('system-map.json'), 'Path should include system-map.json');
});

// Limits tests
test('BATCH.SIZE should be defined', () => {
  assertTrue(typeof BATCH.SIZE === 'number', 'BATCH.SIZE should be a number');
  assertTrue(BATCH.SIZE > 0, 'BATCH.SIZE should be positive');
});

test('ANALYSIS.TIMEOUT_MS should be defined', () => {
  assertTrue(typeof ANALYSIS.TIMEOUT_MS === 'number', 'ANALYSIS.TIMEOUT_MS should be a number');
});

test('SERVER.ORCHESTRATOR_PORT should be 9999', () => {
  assertEqual(SERVER.ORCHESTRATOR_PORT, 9999, 'ORCHESTRATOR_PORT');
});

// Change types tests
test('FileChangeType should have CREATED, MODIFIED, DELETED', () => {
  assertEqual(FileChangeType.CREATED, 'created', 'CREATED');
  assertEqual(FileChangeType.MODIFIED, 'modified', 'MODIFIED');
  assertEqual(FileChangeType.DELETED, 'deleted', 'DELETED');
});

test('SemanticChangeType should have all levels', () => {
  assertEqual(SemanticChangeType.CRITICAL, 'critical', 'CRITICAL');
  assertEqual(SemanticChangeType.SEMANTIC, 'semantic', 'SEMANTIC');
});

test('Priority should be ordered correctly', () => {
  assertTrue(Priority.CRITICAL > Priority.HIGH, 'CRITICAL > HIGH');
  assertTrue(Priority.HIGH > Priority.MEDIUM, 'HIGH > MEDIUM');
});

console.log('\n✨ Config tests completed!\n');
