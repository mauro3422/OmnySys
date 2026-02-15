import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../../../src/layer-a-static/shared/architecture-utils.js', () => ({
  detectGodObject: vi.fn((exportsCount, dependents) => exportsCount >= 10 && dependents >= 5),
  detectOrphanModule: vi.fn((exportsCount, dependents) => exportsCount > 0 && dependents === 0)
}));

vi.mock('../../../shared/architecture-utils.js', () => ({
  detectGodObject: vi.fn((exportsCount, dependents) => exportsCount >= 10 && dependents >= 5),
  detectOrphanModule: vi.fn((exportsCount, dependents) => exportsCount > 0 && dependents === 0)
}));

describe('pipeline/enhance/builders/index.js', () => {
  it('exports builder contract', async () => {
    const {
      detectArchetype,
      enrichFile,
      buildEnhancedSystemMap
    } = await import('#layer-a/pipeline/enhance/builders/index.js');
    expect(detectArchetype).toBeTypeOf('function');
    expect(enrichFile).toBeTypeOf('function');
    expect(buildEnhancedSystemMap).toBeTypeOf('function');
  });

  it('detectArchetype classifies edge archetypes', async () => {
    const { detectArchetype } = await import('#layer-a/pipeline/enhance/builders/index.js');
    const god = detectArchetype(12, 10);
    const orphan = detectArchetype(2, 0);
    expect(god?.type).toBeDefined();
    expect(orphan?.type).toBeDefined();
  });

  it('enrichFile returns merged metadata contract', async () => {
    const { enrichFile } = await import('#layer-a/pipeline/enhance/builders/index.js');
    const result = enrichFile(
      'src/a.js',
      { semanticAnalysis: {} },
      { exports: ['a'], usedBy: [] },
      [],
      { total: 2 },
      { sideEffects: { writes: [] }, details: {} }
    );

    expect(result).toHaveProperty('semanticConnections');
    expect(result).toHaveProperty('riskScore');
    expect(result).toHaveProperty('sideEffects');
  });
});
