/**
 * @fileoverview Atom Extraction Index Tests
 * 
 * Tests for the atom-extraction index module exports.
 * 
 * @module tests/unit/layer-a-analysis/pipeline/phases/atom-extraction/index
 */

import { describe, it, expect } from 'vitest';
import * as atomExtraction from '../../../../../../src/layer-a-static/pipeline/phases/atom-extraction/index.js';

describe('Atom Extraction Index', () => {
  // ============================================================================
  // Structure Contract - Main Exports
  // ============================================================================
  describe('Structure Contract - Main Exports', () => {
    it('should export AtomExtractionPhase', () => {
      expect(atomExtraction.AtomExtractionPhase).toBeDefined();
      expect(typeof atomExtraction.AtomExtractionPhase).toBe('function');
    });

    it('should export extractAtoms', () => {
      expect(atomExtraction.extractAtoms).toBeDefined();
      expect(typeof atomExtraction.extractAtoms).toBe('function');
    });

    it('should export extractAtomMetadata', () => {
      expect(atomExtraction.extractAtomMetadata).toBeDefined();
      expect(typeof atomExtraction.extractAtomMetadata).toBe('function');
    });

    it('should export buildAtomMetadata', () => {
      expect(atomExtraction.buildAtomMetadata).toBeDefined();
      expect(typeof atomExtraction.buildAtomMetadata).toBe('function');
    });

    it('should export calculateComplexity', () => {
      expect(atomExtraction.calculateComplexity).toBeDefined();
      expect(typeof atomExtraction.calculateComplexity).toBe('function');
    });

    it('should export detectAtomArchetype', () => {
      expect(atomExtraction.detectAtomArchetype).toBeDefined();
      expect(typeof atomExtraction.detectAtomArchetype).toBe('function');
    });

    it('should export recalculateArchetypes', () => {
      expect(atomExtraction.recalculateArchetypes).toBeDefined();
      expect(typeof atomExtraction.recalculateArchetypes).toBe('function');
    });

    it('should export buildCallGraph', () => {
      expect(atomExtraction.buildCallGraph).toBeDefined();
      expect(typeof atomExtraction.buildCallGraph).toBe('function');
    });
  });

  // ============================================================================
  // Structure Contract - Class Hierarchy
  // ============================================================================
  describe('Structure Contract - Class Hierarchy', () => {
    it('AtomExtractionPhase should be instantiable', () => {
      const { AtomExtractionPhase } = atomExtraction;
      const phase = new AtomExtractionPhase();
      expect(phase).toBeDefined();
    });

    it('AtomExtractionPhase should have correct name', () => {
      const { AtomExtractionPhase } = atomExtraction;
      const phase = new AtomExtractionPhase();
      expect(phase.name).toBe('atom-extraction');
    });

    it('AtomExtractionPhase should extend ExtractionPhase', async () => {
      const { ExtractionPhase } = await import('../../../../../../src/layer-a-static/pipeline/phases/base-phase.js');
      const { AtomExtractionPhase } = atomExtraction;
      const phase = new AtomExtractionPhase();
      expect(phase).toBeInstanceOf(ExtractionPhase);
    });
  });

  // ============================================================================
  // Function Exports - Basic Functionality
  // ============================================================================
  describe('Function Exports - Basic Functionality', () => {
    describe('calculateComplexity', () => {
      it('should calculate complexity for simple code', () => {
        const { calculateComplexity } = atomExtraction;
        const complexity = calculateComplexity('function test() { return 1; }');
        expect(typeof complexity).toBe('number');
        expect(complexity).toBeGreaterThanOrEqual(1);
      });

      it('should return higher complexity for complex code', () => {
        const { calculateComplexity } = atomExtraction;
        const simple = calculateComplexity('function a() { return 1; }');
        const complex = calculateComplexity('function b() { if (a) { if (b) { return 1; } } }');
        expect(complex).toBeGreaterThan(simple);
      });
    });

    describe('detectAtomArchetype', () => {
      it('should detect archetype for atom', () => {
        const { detectAtomArchetype } = atomExtraction;
        const atom = {
          complexity: 1,
          hasSideEffects: false,
          hasNetworkCalls: false,
          externalCallCount: 0,
          linesOfCode: 5,
          isExported: false,
          calledBy: [],
          className: null
        };
        
        const archetype = detectAtomArchetype(atom);
        expect(archetype).toHaveProperty('type');
        expect(archetype).toHaveProperty('severity');
        expect(archetype).toHaveProperty('confidence');
      });

      it('should detect dead function', () => {
        const { detectAtomArchetype } = atomExtraction;
        const atom = {
          complexity: 3,
          hasSideEffects: false,
          hasNetworkCalls: false,
          externalCallCount: 0,
          linesOfCode: 10,
          isExported: false,
          calledBy: [],
          className: null
        };
        
        const archetype = detectAtomArchetype(atom);
        expect(archetype.type).toBe('dead-function');
      });

      it('should detect god function', () => {
        const { detectAtomArchetype } = atomExtraction;
        const atom = {
          complexity: 25,
          hasSideEffects: false,
          hasNetworkCalls: false,
          externalCallCount: 6,
          linesOfCode: 100,
          isExported: true,
          calledBy: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'],
          className: null
        };
        
        const archetype = detectAtomArchetype(atom);
        expect(archetype.type).toBe('god-function');
      });
    });

    describe('recalculateArchetypes', () => {
      it('should recalculate archetypes for all atoms', () => {
        const { recalculateArchetypes } = atomExtraction;
        const atoms = [
          { complexity: 1, hasSideEffects: false, hasNetworkCalls: false, externalCallCount: 0, linesOfCode: 5, isExported: false, calledBy: [], className: null },
          { complexity: 3, hasSideEffects: false, hasNetworkCalls: false, externalCallCount: 0, linesOfCode: 10, isExported: false, calledBy: [], className: null }
        ];
        
        recalculateArchetypes(atoms);
        
        expect(atoms[0].archetype).toBeDefined();
        expect(atoms[1].archetype).toBeDefined();
      });
    });

    describe('buildCallGraph', () => {
      it('should build call graph for atoms', () => {
        const { buildCallGraph } = atomExtraction;
        const atoms = [
          { id: 'a', name: 'main', calls: [{ name: 'helper' }] },
          { id: 'b', name: 'helper', calls: [] }
        ];
        
        buildCallGraph(atoms);
        
        expect(atoms[1].calledBy).toContain('a');
      });

      it('should classify calls as internal or external', () => {
        const { buildCallGraph } = atomExtraction;
        const atoms = [
          { id: 'a', name: 'main', calls: [{ name: 'helper' }, { name: 'external' }] },
          { id: 'b', name: 'helper', calls: [] }
        ];
        
        buildCallGraph(atoms);
        
        expect(atoms[0].calls[0].type).toBe('internal');
        expect(atoms[0].calls[1].type).toBe('external');
      });
    });

    describe('buildAtomMetadata', () => {
      it('should build complete atom metadata', () => {
        const { buildAtomMetadata } = atomExtraction;
        const params = {
          functionInfo: { id: 'test', name: 'test', line: 1, endLine: 10, isExported: false },
          filePath: 'test.js',
          linesOfCode: 10,
          complexity: 3,
          sideEffects: { all: [], networkCalls: [], domManipulations: [], storageAccess: [], consoleUsage: [] },
          callGraph: { internalCalls: [], externalCalls: [] },
          temporal: { lifecycleHooks: [], cleanupPatterns: [] },
          temporalPatterns: [],
          typeContracts: {},
          errorFlow: {},
          performanceHints: { nestedLoops: [], blockingOperations: [] },
          performanceMetrics: {},
          dataFlowV2: null,
          functionCode: 'function test() { return 1; }'
        };
        
        const atom = buildAtomMetadata(params);
        
        expect(atom).toHaveProperty('id');
        expect(atom).toHaveProperty('name');
        expect(atom).toHaveProperty('type', 'atom');
        expect(atom).toHaveProperty('complexity', 3);
      });
    });
  });

  // ============================================================================
  // Error Handling Contract
  // ============================================================================
  describe('Error Handling Contract', () => {
    describe('calculateComplexity', () => {
      it('should handle empty string', () => {
        const { calculateComplexity } = atomExtraction;
        const complexity = calculateComplexity('');
        expect(typeof complexity).toBe('number');
        expect(complexity).toBeGreaterThanOrEqual(1);
      });

      it('should handle null input', () => {
        const { calculateComplexity } = atomExtraction;
        const complexity = calculateComplexity(null);
        expect(typeof complexity).toBe('number');
      });
    });

    describe('detectAtomArchetype', () => {
      it('should handle null atom', () => {
        const { detectAtomArchetype } = atomExtraction;
        const archetype = detectAtomArchetype(null);
        expect(archetype).toBeDefined();
        expect(archetype).toHaveProperty('type');
      });

      it('should handle atom with missing properties', () => {
        const { detectAtomArchetype } = atomExtraction;
        const archetype = detectAtomArchetype({});
        expect(archetype).toBeDefined();
        expect(archetype).toHaveProperty('type');
      });
    });

    describe('buildCallGraph', () => {
      it('should handle empty array', () => {
        const { buildCallGraph } = atomExtraction;
        expect(() => buildCallGraph([])).not.toThrow();
      });

      it('should handle null array', () => {
        const { buildCallGraph } = atomExtraction;
        expect(() => buildCallGraph(null)).not.toThrow();
      });
    });

    describe('recalculateArchetypes', () => {
      it('should handle empty array', () => {
        const { recalculateArchetypes } = atomExtraction;
        expect(() => recalculateArchetypes([])).not.toThrow();
      });
    });
  });

  // ============================================================================
  // Integration - Async Functions
  // ============================================================================
  describe('Integration - Async Functions', () => {
    describe('extractAtoms', () => {
      it('should be an async function', () => {
        const { extractAtoms } = atomExtraction;
        const result = extractAtoms({ functions: [] }, '', {}, 'test.js');
        expect(result).toBeInstanceOf(Promise);
      });
    });

    describe('extractAtomMetadata', () => {
      it('should be an async function', () => {
        const { extractAtomMetadata } = atomExtraction;
        const result = extractAtomMetadata({ name: 'test' }, 'function test() {}', {}, 'test.js');
        expect(result).toBeInstanceOf(Promise);
      });
    });
  });
});
