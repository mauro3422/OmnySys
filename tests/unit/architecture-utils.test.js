/**
 * @fileoverview architecture-utils.test.js
 * 
 * Tests for architectural pattern detection
 */

import { describe, it, expect } from 'vitest';
import {
  detectGodObject,
  detectOrphanModule,
  detectArchitecturalPatterns
} from '#shared/architecture-utils.js';

describe('Architecture Utils - God Object Detection', () => {
  it('should detect classic god object (many exports + many dependents)', () => {
    const isGod = detectGodObject(10, 20);
    expect(isGod).toBe(true);
  });

  it('should detect with very high dependents', () => {
    const isGod = detectGodObject(2, 25);
    expect(isGod).toBe(true);
  });

  it('should detect extreme coupling ratio', () => {
    const isGod = detectGodObject(3, 10);
    expect(isGod).toBe(true);
  });

  it('should NOT detect normal module as god object', () => {
    const isGod = detectGodObject(3, 5);
    expect(isGod).toBe(false);
  });

  it('should NOT detect small module as god object', () => {
    const isGod = detectGodObject(1, 2);
    expect(isGod).toBe(false);
  });
});

describe('Architecture Utils - Orphan Module Detection', () => {
  it('should detect true orphan (exports but no dependents)', () => {
    const isOrphan = detectOrphanModule(5, 0);
    expect(isOrphan).toBe(true);
  });

  it('should NOT detect module with dependents as orphan', () => {
    const isOrphan = detectOrphanModule(5, 3);
    expect(isOrphan).toBe(false);
  });

  it('should NOT detect module without exports as orphan', () => {
    const isOrphan = detectOrphanModule(0, 0);
    expect(isOrphan).toBe(false);
  });
});

describe('Architecture Utils - Pattern Detection', () => {
  it('should detect all patterns correctly', () => {
    const patterns = detectArchitecturalPatterns({
      exportCount: 10,
      dependentCount: 25
    });

    expect(patterns.isGodObject).toBe(true);
    expect(patterns.hasHighCoupling).toBe(true);
    expect(patterns.hasManyExports).toBe(true);
    expect(patterns.isOrphanModule).toBe(false);
  });
});
