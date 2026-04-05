import { describe, expect, it } from 'vitest';

import { buildAtomEvolutionReport } from '../../../../../src/layer-c-memory/mcp/tools/get-atom-evolution-report.js';

describe('buildAtomEvolutionReport', () => {
  it('combines atom details, DNA, data flow, impact and history into one canonical report', async () => {
    const report = await buildAtomEvolutionReport({
      projectPath: '/workspace/project',
      filePath: 'src/sample.js',
      symbolName: 'sampleFn',
      limit: 5
    }, {
      getAtomDetails: async () => ({
        id: 'sample.js::sampleFn',
        name: 'sampleFn',
        filePath: 'src/sample.js',
        line: 12,
        type: 'function',
        functionType: 'function',
        archetype: { type: 'service', severity: 2 },
        purpose: 'test',
        params: ['input'],
        isExported: true,
        isAsync: true,
        complexity: 7,
        linesOfCode: 24,
        dataFlow: {
          inputs: [{ name: 'input', type: 'string' }],
          outputs: [{ name: 'result', type: 'string' }],
          transformations: [{ operation: 'map' }]
        },
        dna: {
          structuralHash: 'struct-hash',
          contextualHash: 'context-hash',
          semanticHash: 'semantic-hash',
          patternHash: 'pattern-hash',
          flowType: 'transform',
          operationSequence: ['read', 'map', 'return'],
          complexityScore: 7,
          inputCount: 1,
          outputCount: 1,
          transformationCount: 1,
          semanticFingerprint: 'verb:domain:entity',
          duplicabilityScore: 12,
          id: 'dna-id'
        }
      }),
      getFileImpactSummary: async () => ({
        filePath: 'src/sample.js',
        directDependents: ['src/dependent-a.js'],
        transitiveDependents: ['src/dependent-b.js'],
        directCount: 1,
        transitiveCount: 1,
        severity: 'medium',
        highFragilityAtoms: [{ name: 'fragileHelper' }]
      }),
      collectAtomHistory: async () => ({
        ok: true,
        relativePath: 'src/sample.js',
        history: [
          { hash: 'abc1234567', author: 'Ada', date: '2026-04-01', subject: 'initial', codeSnippet: 'const a = 1;' }
        ],
        archiveHistory: [
          {
            version_hash: 'v1',
            atom_id: 'sample.js::sampleFn',
            atom_name: 'sampleFn',
            file_path: 'src/sample.js',
            captured_at: '2026-04-02T10:00:00Z',
            source: 'sqlite',
            field_hashes_json: JSON.stringify({ dataFlow: 'df-1' })
          }
        ],
        metadata: {
          engine: 'git-log-L+atom-archive',
          coherenceScore: 1
        }
      }),
      buildDatabaseSchemaResult: async () => ({
        health: { status: 'healthy', score: 100, grade: 'A' },
        summary: {
          totalRegisteredTables: 3,
          existingTables: 3,
          missingTables: 0,
          tablesWithDrift: 0,
          totalMissingColumns: 0,
          totalExtraColumns: 0
        },
        historicalStores: {
          archiveDir: '.omnysysdata',
          totalStores: 2,
          readyStoreCount: 2,
          missingStoreCount: 0,
          state: 'ready'
        },
        recommendations: [{ severity: 'info', message: 'healthy' }]
      })
    });

    expect(report.correlationId).toContain('sample.js#sampleFn');
    expect(report.metadata).toMatchObject({
      engine: 'atom-evolution-report-v1',
      coherenceScore: 1
    });

    expect(report.results.atom).toMatchObject({
      name: 'sampleFn',
      filePath: 'src/sample.js',
      dna: {
        structuralHash: 'struct-hash',
        patternHash: 'pattern-hash',
        flowType: 'transform'
      },
      dataFlow: {
        inputCount: 1,
        outputCount: 1,
        transformationCount: 1
      }
    });

    expect(report.results.impact).toMatchObject({
      severity: 'medium',
      directCount: 1,
      transitiveCount: 1
    });

    expect(report.results.history).toMatchObject({
      gitVersionCount: 1,
      archiveVersionCount: 1,
      authorCounts: [{ value: 'Ada', count: 1 }],
      sourceCounts: [{ value: 'sqlite', count: 1 }]
    });

    expect(report.results.systemContext).toMatchObject({
      database: {
        health: { status: 'healthy', score: 100, grade: 'A' }
      }
    });
    expect(report.results.systemContext.database.historicalStores).toMatchObject({
      state: 'ready',
      readyStoreCount: 2
    });

    expect(report.results.signals).toEqual(expect.arrayContaining([
      'dna-covered',
      'data-flow-covered',
      'evolution-history-present',
      'impact-medium',
      'db-healthy'
    ]));

    expect(report.results.ramifications).toMatchObject({
      directDependents: ['src/dependent-a.js'],
      transitiveDependents: ['src/dependent-b.js'],
      highFragilityAtoms: ['fragileHelper']
    });
  });
});
