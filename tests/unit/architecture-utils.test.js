/**
 * @fileoverview architecture-utils.test.js
 * 
 * Tests for architectural pattern detection
 */

import {
  detectGodObject,
  detectOrphanModule,
  detectArchitecturalPatterns
} from '#shared/architecture-utils.js';

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

function assertFalse(value, message) {
  if (value) {
    throw new Error(message || 'Expected false');
  }
}

console.log('\n🧪 Running architecture-utils tests...\n');

// God Object detection tests
test('detectGodObject: Classic god object (many exports + many dependents)', () => {
  const isGod = detectGodObject(10, 20); // 10 exports, 20 dependents
  assertTrue(isGod, 'Should detect as god object');
});

test('detectGodObject: Very high dependents (even with few exports)', () => {
  const isGod = detectGodObject(2, 25); // 2 exports, 25 dependents
  assertTrue(isGod, 'Should detect as god object due to high dependents');
});

test('detectGodObject: Extreme coupling ratio', () => {
  const isGod = detectGodObject(3, 10); // 3 exports, 10 dependents (ratio 3.3)
  assertTrue(isGod, 'Should detect due to extreme coupling ratio');
});

test('detectGodObject: Normal module (not god object)', () => {
  const isGod = detectGodObject(3, 5); // 3 exports, 5 dependents
  assertFalse(isGod, 'Should not detect as god object');
});

test('detectGodObject: Small module (not god object)', () => {
  const isGod = detectGodObject(1, 2); // 1 export, 2 dependents
  assertFalse(isGod, 'Should not detect as god object');
});

// Orphan Module detection tests
test('detectOrphanModule: True orphan (exports but no dependents)', () => {
  const isOrphan = detectOrphanModule(5, 0); // 5 exports, 0 dependents
  assertTrue(isOrphan, 'Should detect as orphan');
});

test('detectOrphanModule: Not orphan (has dependents)', () => {
  const isOrphan = detectOrphanModule(5, 3); // 5 exports, 3 dependents
  assertFalse(isOrphan, 'Should not detect as orphan');
});

test('detectOrphanModule: Not orphan (no exports)', () => {
  const isOrphan = detectOrphanModule(0, 0); // 0 exports, 0 dependents
  assertFalse(isOrphan, 'Should not detect as orphan (no exports)');
});

// Pattern detection tests
test('detectArchitecturalPatterns: Detects all patterns', () => {
  const patterns = detectArchitecturalPatterns({
    exportCount: 10,
    dependentCount: 25
  });
  
  assertTrue(patterns.isGodObject, 'Should detect god object');
  assertTrue(patterns.hasHighCoupling, 'Should detect high coupling');
  assertTrue(patterns.hasManyExports, 'Should detect many exports');
  assertFalse(patterns.isOrphanModule, 'Should not detect as orphan');
});

console.log('\n✨ Architecture-utils tests completed!\n');
