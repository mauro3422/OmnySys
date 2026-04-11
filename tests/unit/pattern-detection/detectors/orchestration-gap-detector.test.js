import { describe, it, expect } from 'vitest';
import { OrchestrationGapDetector } from '#layer-a/pattern-detection/detectors/orchestration-gap-detector.js';

describe('Orchestration Gap Detector', () => {
  it('flags missing orchestration links when the pipeline is incomplete', async () => {
    const detector = new OrchestrationGapDetector();

    const systemMap = {
      files: {
        'src/layer-a-static/analyses/phase2-indexer.js': {
          atoms: [
            { name: 'startPhase2' },
            { name: 'finishPhase2' }
          ]
        },
        'src/core/guards/file-watcher-guard.js': {
          atoms: [
            { name: 'validateGuard' }
          ]
        }
      }
    };

    const result = await detector.detect(systemMap);

    expect(result.findings).toHaveLength(4);
    expect(result.summary).toMatchObject({
      missingPostPhase2Hook: 1,
      missingDebtConsolidationTool: 1,
      guardsNotPersisting: 1,
      missingAutomaticDebtReport: 1,
      totalFindings: 4
    });
    expect(result.score).toBe(40);
  });

  it('stays quiet when the pipeline exposes the expected orchestration hooks', async () => {
    const detector = new OrchestrationGapDetector();

    const systemMap = {
      files: {
        'src/layer-a-static/analyses/phase2-indexer.js': {
          atoms: [
            { name: 'stopComplete' }
          ]
        },
        'src/layer-c-memory/mcp/tools/technical-debt-report.js': {
          atoms: [
            { name: 'generateTechnicalDebtReport' }
          ]
        },
        'src/core/guards/file-watcher-guard.js': {
          atoms: [
            { name: 'persistWatcherIssue' }
          ]
        },
        'src/shared/compiler/technical-debt/technical-debt-report-core.js': {
          atoms: [
            { name: 'consolidateDebtReport' }
          ]
        }
      }
    };

    const result = await detector.detect(systemMap);

    expect(result.findings).toHaveLength(0);
    expect(result.score).toBe(100);
    expect(result.summary.totalFindings).toBe(0);
  });
});
