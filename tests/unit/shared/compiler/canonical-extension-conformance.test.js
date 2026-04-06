import { describe, it, expect } from 'vitest';

import { detectCanonicalExtensionConformanceFromSource } from '../../../../src/shared/compiler/canonical-extension-conformance.js';
import { resolveArchitecturalRecommendation } from '../../../../src/shared/compiler/architectural-recommendations.js';
import { buildCompilerContractLayer } from '../../../../src/shared/compiler/compiler-contract-layer/layer.js';

describe('canonical-extension conformance - barrel surfaces', () => {
  it('flags mixed barrels that re-export and define local logic', () => {
    const source = `
      export * from './helpers.js';
      export { buildThing } from './build-thing.js';

      function buildLocalFallback() {
        return buildThing();
      }
    `;

    const findings = detectCanonicalExtensionConformanceFromSource('src/core/file-watcher/handlers.js', source);
    const barrelFinding = findings.find((finding) => finding.rule === 'local_barrel_with_logic');

    expect(barrelFinding).toBeTruthy();

    const recommendation = resolveArchitecturalRecommendation({
      filePath: 'src/core/file-watcher/handlers.js',
      context: { findings },
      issueType: 'canonical_extension_medium'
    });

    expect(recommendation?.strategy).toBe('pure_barrel_split');
  });

  it('keeps pure re-export barrels clean', () => {
    const source = `
      export * from './helpers.js';
      export { buildThing } from './build-thing.js';
    `;

    const findings = detectCanonicalExtensionConformanceFromSource('src/core/file-watcher/handlers.js', source);

    expect(findings.some((finding) => finding.rule === 'local_barrel_with_logic')).toBe(false);
  });

  it('counts mixed barrels in canonical contract governance', () => {
    const contract = buildCompilerContractLayer({
      policySummary: {
        byRule: {
          local_barrel_with_logic: 2
        },
        byPolicyArea: {}
      },
      tableCounts: {
        atoms: 1,
        files: 1,
        atom_relations: 1,
        risk_assessments: 0
      }
    });

    expect(contract.apiGovernance.governanceMetrics.canonicalBarrelFindings).toBe(2);
    expect(contract.summary.canonicalBarrelFindings).toBe(2);
    expect(contract.summary.nextAction).toContain('mixed barrels');
  });
});
