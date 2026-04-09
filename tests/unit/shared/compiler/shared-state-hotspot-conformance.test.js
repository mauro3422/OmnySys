import { describe, expect, it } from 'vitest';

import { detectSharedStateHotspotConformanceFromSource } from '../../../../src/shared/compiler/shared-state-hotspot-conformance.js';

describe('shared-state-hotspot-conformance', () => {
  it('returns canonical finding shapes with string rules', () => {
    const source = `
      export function analyze(contentionState) {
        const hot = contentionState.current;
        const env = process.env.NODE_ENV;
        const cache = localStorage.getItem('hot');
        return { hot, env, cache, fallback: global.fetch, retry: window.PR_SHOULD_USE_CONTINUATION };
      }
    `;

    const findings = detectSharedStateHotspotConformanceFromSource(
      'src/layer-c-memory/mcp/core/initialization/steps/mcp-tool-call-helpers.js',
      source
    );

    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((finding) => typeof finding.rule === 'string')).toBe(true);
  });
});
