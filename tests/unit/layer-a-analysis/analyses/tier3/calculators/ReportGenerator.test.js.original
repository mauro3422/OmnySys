import { describe, it, expect } from 'vitest';
import { ReportGenerator } from '#layer-a/analyses/tier3/calculators/ReportGenerator.js';

describe('analyses/tier3/calculators/ReportGenerator.js', () => {
  it('generates structured report from risk scores', () => {
    const gen = new ReportGenerator();
    const out = gen.generate({
      'a.js': { total: 9, severity: 'critical' },
      'b.js': { total: 5, severity: 'medium' }
    });
    expect(out.summary.totalFiles).toBe(2);
    expect(Array.isArray(out.highRiskFiles)).toBe(true);
    expect(Array.isArray(out.recommendations)).toBe(true);
  });
});

