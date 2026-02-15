import { describe, it, expect } from 'vitest';
import {
  CompatibilityEngine,
  validateTypeCompatibility,
  getCompatibilityEngine
} from '#layer-a/extractors/metadata/type-contracts/validators/compatibility-validator.js';

describe('extractors/metadata/type-contracts/validators/compatibility-validator.js', () => {
  it('validates exact type matches with max confidence', () => {
    const out = validateTypeCompatibility('string', 'string');
    expect(out.compatible).toBe(true);
    expect(out.confidence).toBe(1);
  });

  it('supports generic compatibility checks through engine rules', () => {
    const engine = new CompatibilityEngine();
    const out = engine.validate('Promise<string>', 'Promise<string>');
    expect(out.compatible).toBe(true);
    expect(out.confidence).toBeGreaterThan(0.8);
  });

  it('exposes singleton engine instance', () => {
    const singleton = getCompatibilityEngine();
    expect(singleton).toBeTypeOf('object');
    expect(singleton.validate).toBeTypeOf('function');
  });
});

