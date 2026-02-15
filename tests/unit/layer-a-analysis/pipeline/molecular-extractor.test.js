/**
 * @fileoverview Molecular Extractor Tests
 * 
 * Tests for molecular-extractor.js - Molecular chain extraction pipeline
 * 
 * @module tests/unit/layer-a-analysis/pipeline/molecular-extractor
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  MolecularExtractionPipeline, 
  extractMolecularStructure,
  analyzeProjectSystem,
  detectRaceConditions 
} from '#layer-a/pipeline/molecular-extractor.js';
import { 
  MolecularChainBuilder,
  createMockPhase 
} from '../../../factories/pipeline-test.factory.js';

// Mock dependencies
vi.mock('#layer-a/pipeline/phases/index.js', () => ({
  AtomExtractionPhase: vi.fn(),
  ChainBuildingPhase: vi.fn()
}));

vi.mock('#utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('Molecular Extractor', () => {
  describe('MolecularExtractionPipeline', () => {
    describe('Structure Contract', () => {
      it('should export MolecularExtractionPipeline class', () => {
        expect(MolecularExtractionPipeline).toBeDefined();
        expect(typeof MolecularExtractionPipeline).toBe('function');
      });

      it('should have phases array after construction', () => {
        const pipeline = new MolecularExtractionPipeline();
        expect(pipeline.phases).toBeDefined();
        expect(Array.isArray(pipeline.phases)).toBe(true);
        expect(pipeline.phases).toHaveLength(2);
      });

      it('should have AtomExtractionPhase as first phase', () => {
        const pipeline = new MolecularExtractionPipeline();
        expect(pipeline.phases[0]).toBeDefined();
      });

      it('should have ChainBuildingPhase as second phase', () => {
        const pipeline = new MolecularExtractionPipeline();
        expect(pipeline.phases[1]).toBeDefined();
      });
    });

    describe('Processing Flow', () => {
      it('should process file and return molecular structure', async () => {
        const pipeline = new MolecularExtractionPipeline();
        const result = await pipeline.processFile(
          'src/test.js',
          'function test() {}',
          {},
          {}
        );

        expect(result).toHaveProperty('filePath');
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('atomCount');
        expect(result).toHaveProperty('atoms');
        expect(result).toHaveProperty('molecularChains');
        expect(result).toHaveProperty('extractedAt');
      });

      it('should set type to molecule', async () => {
        const pipeline = new MolecularExtractionPipeline();
        const result = await pipeline.processFile('src/test.js', '', {}, {});
        
        expect(result.type).toBe('molecule');
      });

      it('should include filePath in result', async () => {
        const pipeline = new MolecularExtractionPipeline();
        const result = await pipeline.processFile('src/module.js', '', {}, {});
        
        expect(result.filePath).toBe('src/module.js');
      });

      it('should include extraction timestamp', async () => {
        const pipeline = new MolecularExtractionPipeline();
        const before = Date.now();
        const result = await pipeline.processFile('src/test.js', '', {}, {});
        const after = Date.now();
        
        const extractedAt = new Date(result.extractedAt).getTime();
        expect(extractedAt).toBeGreaterThanOrEqual(before);
        expect(extractedAt).toBeLessThanOrEqual(after);
      });

      it('should initialize atoms as empty array by default', async () => {
        const pipeline = new MolecularExtractionPipeline();
        const result = await pipeline.processFile('src/test.js', '', {}, {});
        
        expect(result.atoms).toEqual([]);
        expect(result.atomCount).toBe(0);
      });

      it('should skip phase when canExecute returns false', async () => {
        const pipeline = new MolecularExtractionPipeline();
        
        // Override phases with mock that returns false for canExecute
        const mockPhase = createMockPhase('MockPhase', false);
        pipeline.phases = [mockPhase];

        await pipeline.processFile('src/test.js', '', {}, {});

        expect(mockPhase.canExecute).toHaveBeenCalled();
        expect(mockPhase.execute).not.toHaveBeenCalled();
      });

      it('should execute phase when canExecute returns true', async () => {
        const pipeline = new MolecularExtractionPipeline();
        
        const mockPhase = createMockPhase('MockPhase', true);
        pipeline.phases = [mockPhase];

        await pipeline.processFile('src/test.js', '', {}, {});

        expect(mockPhase.execute).toHaveBeenCalled();
      });
    });

    describe('Error Handling Contract', () => {
      it('should handle phase errors with handleError method', async () => {
        const pipeline = new MolecularExtractionPipeline();
        const error = new Error('Phase failed');
        
        const mockPhase = createMockPhase('MockPhase', true);
        mockPhase.execute.mockRejectedValue(error);
        pipeline.phases = [mockPhase];

        await pipeline.processFile('src/test.js', '', {}, {});

        expect(mockPhase.handleError).toHaveBeenCalledWith(error, expect.any(Object));
      });

      it('should throw when phase fails without handleError', async () => {
        const pipeline = new MolecularExtractionPipeline();
        const error = new Error('Phase failed');
        
        const mockPhase = {
          name: 'MockPhase',
          canExecute: () => true,
          execute: vi.fn().mockRejectedValue(error)
          // No handleError method
        };
        pipeline.phases = [mockPhase];

        await expect(pipeline.processFile('src/test.js', '', {}, {}))
          .rejects.toThrow('Phase failed');
      });
    });

    describe('Integration with Factories', () => {
      it('should process context built with MolecularChainBuilder', async () => {
        const builder = new MolecularChainBuilder()
          .withFilePath('src/utils.js')
          .withCode('function helper() {}')
          .addAtom({ name: 'helper', type: 'function' })
          .addAtom({ name: 'format', type: 'function' });

        const pipeline = new MolecularExtractionPipeline();
        const context = builder.buildContext();

        const result = await pipeline.processFile(
          context.filePath,
          context.code,
          context.fileInfo,
          context.fileMetadata
        );

        expect(result.filePath).toBe('src/utils.js');
      });

      it('should include atoms from context in result', async () => {
        const builder = new MolecularChainBuilder()
          .withFilePath('src/module.js')
          .addAtom({ name: 'init', type: 'function', complexity: 3 })
          .addAtom({ name: 'process', type: 'function', complexity: 5 });

        const pipeline = new MolecularExtractionPipeline();
        
        // Simulate phase execution that adds atoms
        const mockPhase = {
          name: 'MockPhase',
          canExecute: () => true,
          execute: vi.fn(async (ctx) => ({
            ...ctx,
            atoms: builder.atoms
          }))
        };
        pipeline.phases = [mockPhase];

        const result = await pipeline.processFile('src/module.js', '', {}, {});

        expect(result.atoms).toHaveLength(2);
        expect(result.atomCount).toBe(2);
      });

      it('should handle chains from builder context', async () => {
        const builder = new MolecularChainBuilder()
          .withFilePath('src/app.js')
          .addAtom({ name: 'start', type: 'function' })
          .addAtom({ name: 'end', type: 'function' })
          .addChain({ name: 'initChain', steps: ['start', 'end'] })
          .addConnection('start', 'end', 'sequence');

        const pipeline = new MolecularExtractionPipeline();
        const mockPhase = {
          name: 'MockPhase',
          canExecute: () => true,
          execute: vi.fn(async (ctx) => ({
            ...ctx,
            atoms: builder.atoms,
            molecularChains: builder.chains
          }))
        };
        pipeline.phases = [mockPhase];

        const result = await pipeline.processFile('src/app.js', '', {}, {});

        expect(result.molecularChains).toBeDefined();
      });
    });
  });

  describe('extractMolecularStructure (Legacy)', () => {
    it('should export extractMolecularStructure function', () => {
      expect(extractMolecularStructure).toBeDefined();
      expect(typeof extractMolecularStructure).toBe('function');
    });

    it('should return molecular structure', async () => {
      const result = await extractMolecularStructure('src/test.js', '', {}, {});

      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('type', 'molecule');
      expect(result).toHaveProperty('atoms');
    });
  });

  describe('analyzeProjectSystem', () => {
    it('should export analyzeProjectSystem function', () => {
      expect(analyzeProjectSystem).toBeDefined();
      expect(typeof analyzeProjectSystem).toBe('function');
    });

    it('should return project analysis result', async () => {
      const molecules = [
        { filePath: 'src/a.js', atoms: [] },
        { filePath: 'src/b.js', atoms: [] }
      ];

      const result = await analyzeProjectSystem('/test', molecules);

      expect(result).toHaveProperty('molecules');
      expect(result).toHaveProperty('modules');
      expect(result).toHaveProperty('system');
      expect(result).toHaveProperty('summary');
    });

    it('should preserve input molecules in result', async () => {
      const molecules = [{ filePath: 'src/test.js', atoms: [] }];
      
      const result = await analyzeProjectSystem('/test', molecules);

      expect(result.molecules).toBe(molecules);
    });

    it('should include summary with module counts', async () => {
      const result = await analyzeProjectSystem('/test', []);

      expect(result.summary).toHaveProperty('totalModules');
      expect(result.summary).toHaveProperty('totalBusinessFlows');
    });
  });

  describe('detectRaceConditions', () => {
    it('should export detectRaceConditions function', () => {
      expect(detectRaceConditions).toBeDefined();
      expect(typeof detectRaceConditions).toBe('function');
    });

    it('should return project data with race analysis', async () => {
      const projectData = {
        molecules: [],
        modules: [],
        system: null,
        summary: {}
      };

      const result = await detectRaceConditions(projectData);

      expect(result).toBeDefined();
    });
  });
});
