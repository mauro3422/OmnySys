/**
 * @fileoverview Tests for lineage tracking
 * @module tests/unit/layer-c-memory/shadow-registry/lineage-tracker.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  registerDeath,
  registerBirth,
  reconstructLineage,
  compareLineage,
  detectEvolutionType,
  calculateVibrationScore
} from '#layer-c/shadow-registry/lineage-tracker/index.js';
import { ShadowBuilder, AtomBuilder, LineageBuilder } from '#test-factories/layer-c-shadow-registry';
import { ShadowStatus, EvolutionType } from '#layer-c/shadow-registry/types.js';

describe('Lineage Tracker', () => {
  describe('Structure Contract', () => {
    it('MUST export registerDeath function', () => {
      expect(typeof registerDeath).toBe('function');
    });

    it('MUST export registerBirth function', () => {
      expect(typeof registerBirth).toBe('function');
    });

    it('MUST export reconstructLineage function', () => {
      expect(typeof reconstructLineage).toBe('function');
    });

    it('MUST export compareLineage function', () => {
      expect(typeof compareLineage).toBe('function');
    });

    it('MUST export detectEvolutionType function', () => {
      expect(typeof detectEvolutionType).toBe('function');
    });

    it('MUST export calculateVibrationScore function', () => {
      expect(typeof calculateVibrationScore).toBe('function');
    });
  });

  describe('registerDeath()', () => {
    it('creates shadow correctly', () => {
      const atom = AtomBuilder.create()
        .withId('src/test.js::func')
        .withName('func')
        .build();

      const shadow = registerDeath(atom, { reason: 'file_deleted' });

      expect(shadow).toBeDefined();
      expect(shadow.shadowId).toMatch(/^shadow_/);
      expect(shadow.originalId).toBe('src/test.js::func');
      expect(shadow.status).toBe(ShadowStatus.DELETED);
      expect(shadow.dna).toBeDefined();
      expect(shadow.metadata).toBeDefined();
      expect(shadow.lineage).toBeDefined();
      expect(shadow.inheritance).toBeDefined();
      expect(shadow.death).toBeDefined();
    });

    it('sets REPLACED status when replacementId provided', () => {
      const atom = AtomBuilder.create().build();

      const shadow = registerDeath(atom, { 
        reason: 'refactored',
        replacementId: 'src/new.js::newFunc'
      });

      expect(shadow.status).toBe(ShadowStatus.REPLACED);
      expect(shadow.replacedBy).toBe('src/new.js::newFunc');
      expect(shadow.death.replacementId).toBe('src/new.js::newFunc');
    });

    it('calculates lifespan correctly', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      
      const atom = AtomBuilder.create().build();
      atom.createdAt = pastDate.toISOString();

      const shadow = registerDeath(atom);

      expect(shadow.lifespan).toBeGreaterThanOrEqual(9);
      expect(shadow.lifespan).toBeLessThanOrEqual(11);
    });

    it('preserves atom ancestry in lineage', () => {
      const atom = AtomBuilder.create()
        .withAncestry({
          replaced: 'shadow_parent',
          generation: 2
        })
        .build();

      const shadow = registerDeath(atom);

      expect(shadow.lineage.parentShadowId).toBe('shadow_parent');
      expect(shadow.lineage.generation).toBe(2);
    });

    it('stores death information', () => {
      const atom = AtomBuilder.create().build();

      const shadow = registerDeath(atom, {
        reason: 'manual_delete',
        commits: ['abc123', 'def456'],
        risk: 0.75
      });

      expect(shadow.death.reason).toBe('manual_delete');
      expect(shadow.death.commitsInvolved).toEqual(['abc123', 'def456']);
      expect(shadow.death.riskIntroduced).toBe(0.75);
    });

    it('handles atom without createdAt', () => {
      const atom = { id: 'test', name: 'test' };

      const shadow = registerDeath(atom);

      expect(shadow.lifespan).toBe(0);
    });
  });

  describe('reconstructLineage()', () => {
    it('builds full ancestry', async () => {
      const grandparent = ShadowBuilder.create()
        .withShadowId('shadow_gen0')
        .withLineage({ generation: 0, parentShadowId: null })
        .build();
      
      const parent = ShadowBuilder.create()
        .withShadowId('shadow_gen1')
        .withParent('shadow_gen0')
        .withLineage({ generation: 1, parentShadowId: 'shadow_gen0' })
        .build();
      
      const child = ShadowBuilder.create()
        .withShadowId('shadow_gen2')
        .withParent('shadow_gen1')
        .withLineage({ generation: 2, parentShadowId: 'shadow_gen1' })
        .build();

      const shadows = {
        'shadow_gen2': child,
        'shadow_gen1': parent,
        'shadow_gen0': grandparent
      };

      const getShadow = vi.fn((id) => Promise.resolve(shadows[id] || null));

      const lineage = await reconstructLineage('shadow_gen2', getShadow);

      expect(lineage.length).toBe(3);
      expect(lineage[0].shadowId).toBe('shadow_gen0');
      expect(lineage[1].shadowId).toBe('shadow_gen1');
      expect(lineage[2].shadowId).toBe('shadow_gen2');
    });

    it('returns single element for genesis shadow', async () => {
      const genesis = ShadowBuilder.create()
        .withShadowId('shadow_genesis')
        .withLineage({ generation: 0, parentShadowId: null })
        .build();

      const getShadow = vi.fn((id) => Promise.resolve(id === 'shadow_genesis' ? genesis : null));

      const lineage = await reconstructLineage('shadow_genesis', getShadow);

      expect(lineage.length).toBe(1);
      expect(lineage[0].shadowId).toBe('shadow_genesis');
    });

    it('handles circular lineage gracefully', async () => {
      const circularShadow = {
        shadowId: 'shadow_circular',
        lineage: { parentShadowId: 'shadow_circular' }
      };

      const getShadow = vi.fn((id) => Promise.resolve(circularShadow));

      await expect(reconstructLineage('shadow_circular', getShadow))
        .rejects.toThrow('Lineage too deep');
    });

    it('handles missing shadows', async () => {
      const getShadow = vi.fn((id) => Promise.resolve(null));

      const lineage = await reconstructLineage('shadow_missing', getShadow);

      expect(lineage).toEqual([]);
    });
  });

  describe('compareLineage()', () => {
    it('returns 1 for identical lineages', () => {
      const atom1 = {
        ancestry: { lineage: ['shadow_a', 'shadow_b'] }
      };
      const atom2 = {
        ancestry: { lineage: ['shadow_a', 'shadow_b'] }
      };

      const similarity = compareLineage(atom1, atom2);

      expect(similarity).toBe(1);
    });

    it('returns 0 for completely different lineages', () => {
      const atom1 = { ancestry: { lineage: ['shadow_x', 'shadow_y'] } };
      const atom2 = { ancestry: { lineage: ['shadow_a', 'shadow_b'] } };

      const similarity = compareLineage(atom1, atom2);

      expect(similarity).toBe(0);
    });

    it('calculates partial similarity', () => {
      const atom1 = { ancestry: { lineage: ['shadow_a', 'shadow_b'] } };
      const atom2 = { ancestry: { lineage: ['shadow_a', 'shadow_c'] } };

      const similarity = compareLineage(atom1, atom2);

      expect(similarity).toBeCloseTo(0.333, 2);
    });

    it('returns 1 when both have no lineage', () => {
      const atom1 = { ancestry: { lineage: [] } };
      const atom2 = { ancestry: { lineage: [] } };

      const similarity = compareLineage(atom1, atom2);

      expect(similarity).toBe(1);
    });

    it('returns 0 when one has no lineage', () => {
      const atom1 = { ancestry: { lineage: ['shadow_a'] } };
      const atom2 = { ancestry: { lineage: [] } };

      const similarity = compareLineage(atom1, atom2);

      expect(similarity).toBe(0);
    });

    it('handles missing ancestry', () => {
      const atom1 = {};
      const atom2 = {};

      const similarity = compareLineage(atom1, atom2);

      expect(similarity).toBe(1);
    });
  });

  describe('detectEvolutionType()', () => {
    it('detects REFACTOR for similar atoms', () => {
      const oldAtom = AtomBuilder.create()
        .withDNA({ structuralHash: 'hash1', complexityScore: 5 })
        .build();
      
      const newAtom = AtomBuilder.create()
        .withDNA({ structuralHash: 'hash1', complexityScore: 5 })
        .build();

      const type = detectEvolutionType(oldAtom, newAtom);

      expect(type).toBeDefined();
      expect([EvolutionType.REFACTOR, EvolutionType.RENAMED]).toContain(type);
    });

    it('detects RENAMED when only name differs', () => {
      const oldAtom = AtomBuilder.create().withName('oldFunc').build();
      const newAtom = AtomBuilder.create().withName('newFunc').build();

      const type = detectEvolutionType(oldAtom, newAtom);

      expect(type).toBeDefined();
    });
  });

  describe('calculateVibrationScore()', () => {
    it('calculates score from inheritance', () => {
      const atom = AtomBuilder.create()
        .withAncestry({
          strongConnections: [
            { strength: 0.9 },
            { strength: 0.8 },
            { strength: 0.7 }
          ]
        })
        .build();

      const score = calculateVibrationScore(atom);

      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('returns 0 for atom without connections', () => {
      const atom = AtomBuilder.create().build();

      const score = calculateVibrationScore(atom);

      expect(score).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('handles null atom in registerDeath', () => {
      expect(() => registerDeath(null)).toThrow();
    });

    it('handles undefined atom in registerDeath', () => {
      expect(() => registerDeath(undefined)).toThrow();
    });

    it('handles missing options in registerDeath', () => {
      const atom = AtomBuilder.create().build();

      const shadow = registerDeath(atom);

      expect(shadow).toBeDefined();
      expect(shadow.death.reason).toBe('unknown');
    });
  });
});
