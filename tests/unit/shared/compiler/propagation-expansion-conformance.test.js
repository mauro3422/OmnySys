import { describe, expect, it } from 'vitest';

import { detectPropagationExpansionConformanceFromSource } from '../../../../src/shared/compiler/propagation-expansion-conformance.js';

describe('propagation expansion conformance', () => {
  it('flags watcher and tool surfaces that emit payloads without propagation', () => {
    const source = `
      import { createStandardContext } from '../../shared/context.js';

      export function reportIssue(issue) {
        const issueContext = createStandardContext(issue);
        persistWatcherIssue(issueContext);
        emit('watcher-issue', issueContext);
        return { issueContext };
      }
    `;

    const findings = detectPropagationExpansionConformanceFromSource(
      'src/core/file-watcher/guards/custom-guard/reporting.js',
      source
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('propagation_surface_without_contract');
  });

  it('keeps propagation-aware surfaces clean', () => {
    const source = `
      import { buildImpactWavePropagationPlan, summarizePropagationPlan } from '../../../../src/shared/compiler/index.js';

      export function reportIssue(issue) {
        const propagation = summarizePropagationPlan(buildImpactWavePropagationPlan({ changeType: 'impact_wave' }));
        return { ...issue, propagation };
      }
    `;

    const findings = detectPropagationExpansionConformanceFromSource(
      'src/layer-c-memory/mcp/tools/status.js',
      source
    );

    expect(findings).toHaveLength(0);
  });
});
