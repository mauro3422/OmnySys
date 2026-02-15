import { describe, it, expect } from 'vitest';
import { TestingAdvisor } from '#layer-a/race-detector/scorers/TestingAdvisor.js';

describe('race-detector/scorers/TestingAdvisor.js', () => {
  it('returns guidance matrix by severity', () => {
    const advisor = new TestingAdvisor();
    expect(advisor.getAdvice('critical')).toMatchObject({ level: 'mandatory', priority: 'P0' });
    expect(advisor.getAdvice('high')).toMatchObject({ level: 'recommended', priority: 'P1' });
    expect(advisor.getAdvice('medium')).toMatchObject({ level: 'optional', priority: 'P2' });
    expect(advisor.getAdvice('low')).toMatchObject({ level: 'documentation', priority: 'P3' });
  });

  it('falls back to low advice for unknown severities', () => {
    const advisor = new TestingAdvisor();
    expect(advisor.getAdvice('non-existent')).toMatchObject({ level: 'documentation', priority: 'P3' });
  });
});

