import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../src/core/file-watcher/guards/complexity-guard/persistence.js', () => ({
  clearComplexityIssues: vi.fn(async () => true),
  persistComplexityIssues: vi.fn(async (_rootPath, _filePath, issues) => ({
    highIssues: issues.filter((issue) => issue.severity === 'high'),
    mediumIssues: issues.filter((issue) => issue.severity === 'medium')
  }))
}));

import { detectHighComplexity } from '../../../../../src/core/file-watcher/guards/complexity-guard.js';
import { collectComplexityIssues } from '../../../../../src/core/file-watcher/guards/complexity-guard/analysis.js';

describe('complexity-guard propagation', () => {
  const filePath = 'src/app/request-handler.js';
  const atoms = [{
    id: 'atom-1',
    name: 'handleRequest',
    type: 'function',
    filePath,
    purpose: 'API_EXPORT',
    complexity: 18,
    linesOfCode: 120,
    isAsync: true
  }];

  it('attaches canonical propagation to collected issue contexts', () => {
    const issues = collectComplexityIssues(filePath, atoms, {
      complexityHigh: 15,
      complexityMedium: 10,
      linesHigh: 250,
      linesMedium: 120,
      operationalRole: { role: 'service' }
    });

    expect(issues).toHaveLength(1);
    expect(issues[0].context.propagation).toMatchObject({
      state: 'watch'
    });
  });

  it('emits propagation on the complexity event payload', async () => {
    const emit = vi.fn();

    await detectHighComplexity(
      process.cwd(),
      filePath,
      { emit },
      atoms,
      {
        complexityHigh: 15,
        complexityMedium: 10,
        linesHigh: 250,
        linesMedium: 120,
        verbose: false
      }
    );

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith(
      'code:complexity',
      expect.objectContaining({
        filePath,
        propagation: expect.objectContaining({
          state: 'watch'
        }),
        issues: [
          expect.objectContaining({
            atomName: 'handleRequest',
            propagation: expect.objectContaining({
              state: 'watch'
            })
          })
        ]
      })
    );
  });
});
