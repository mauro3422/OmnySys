import { describe, it, expect } from 'vitest';
import { extractRuntimeContracts } from '#layer-a/extractors/metadata/runtime-contracts.js';

describe('extractors/metadata/runtime-contracts.js', () => {
  it('extracts assertions, validations, null checks and invariants', () => {
    const code = `
      console.assert(user, "required");
      if (x === null) { throw new TypeError("x"); }
      if (!ready) return;
      if (typeof value === "string") {}
      if (obj instanceof Date) {}
    `;
    const out = extractRuntimeContracts(code);
    expect(out.assertions.length).toBe(1);
    expect(out.validations.length).toBeGreaterThanOrEqual(2);
    expect(out.nullChecks.length).toBe(1);
    expect(out.invariants.length).toBe(1);
    expect(out.all.length).toBeGreaterThan(0);
  });
});

