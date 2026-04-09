import { describe, expect, it } from 'vitest';

import { detectCompilerPolicyDriftFromSource } from '../../../../src/shared/compiler/detection.js';

describe('detectCompilerPolicyDriftFromSource', () => {
  it('keeps running conformance detectors for watcher reporting surfaces', () => {
    const source = `
      import { createStandardContext } from '../../shared/context.js';

      export function reportIssue(issue) {
        const issueContext = createStandardContext(issue);
        persistWatcherIssue(issueContext);
        emit('watcher-issue', issueContext);
        return { issueContext };
      }
    `;

    const findings = detectCompilerPolicyDriftFromSource(
      'src/core/file-watcher/guards/custom-guard/reporting.js',
      source
    );

    expect(findings.some((finding) => finding.policyArea === 'propagation_expansion')).toBe(true);
  });

  it('keeps running conformance detectors for MCP tool reporting surfaces', () => {
    const source = `
      export function buildStatusPayload(status) {
        const payload = { summaryText: status.summary };
        return payload;
      }
    `;

    const findings = detectCompilerPolicyDriftFromSource(
      'src/layer-c-memory/mcp/tools/custom-status.js',
      source
    );

    expect(findings.some((finding) => finding.policyArea === 'propagation_expansion')).toBe(true);
  });
});
