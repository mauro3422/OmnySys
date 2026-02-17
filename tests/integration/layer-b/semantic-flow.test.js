/**
 * @fileoverview Integration Tests: Layer B Semantic Flows
 * 
 * Tests the complete flows within Layer B:
 * - Metadata building pipeline
 * - Issue detection pipeline
 * - Validation pipeline
 * 
 * @module tests/integration/layer-b/semantic-flow.test
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createIntegrationTestSuite } from '../../factories/integration-test.factory.js';
import { 
  TestProjectBuilder,
  CROSS_LAYER_FIXTURES 
} from '../../factories/cross-layer.factory.js';
import { EnrichedResultsBuilder } from '../../factories/layer-b-metadata/builders.js';

// Import Layer B modules
import { buildStandardMetadata } from '#layer-b/metadata-contract/builders/standard-builder.js';
import { detectGodObject } from '#layer-b/metadata-contract/detectors/architectural-patterns.js';
import { detectOrphanModule } from '#layer-b/metadata-contract/detectors/architectural-patterns.js';

// ============================================
// METADATA BUILDING FLOW
// ============================================

describe('Layer B Integration: Metadata Building Flow', () => {
  
  describe('Standard Metadata Pipeline', () => {
    
    it('should build metadata from Layer A file analysis', () => {
      const fileAnalysis = {
        exports: [{ name: 'Component' }, { name: 'helper' }],
        imports: [{ source: 'react' }],
        usedBy: ['src/App.js'],
        functions: [{ name: 'render' }],
        semanticAnalysis: {
          sharedState: { reads: [], writes: ['token'] },
          eventPatterns: { eventEmitters: ['click'], eventListeners: [] },
          sideEffects: { hasGlobalAccess: true }
        }
      };
      
      const metadata = buildStandardMetadata(fileAnalysis, 'src/components/Button.js');
      
      expect(metadata.filePath).toBe('src/components/Button.js');
      expect(metadata.hasLocalStorage).toBe(true);
      expect(metadata.hasEventListeners).toBe(true);
      expect(metadata.hasGlobalAccess).toBe(true);
      expect(metadata.exportCount).toBe(2);
    });

    it('should extract localStorage keys from semantic analysis', () => {
      const fileAnalysis = {
        semanticAnalysis: {
          sharedState: { writes: ['userSettings', 'appConfig'] }
        }
      };
      
      const metadata = buildStandardMetadata(fileAnalysis, 'test.js');
      
      expect(metadata.hasLocalStorage).toBe(true);
      expect(metadata.localStorageKeys).toContain('userSettings');
      expect(metadata.localStorageKeys).toContain('appConfig');
    });

    it('should extract event names from semantic analysis', () => {
      const fileAnalysis = {
        semanticAnalysis: {
          eventPatterns: {
            eventEmitters: ['user:login'],
            eventListeners: ['data:update']
          }
        }
      };
      
      const metadata = buildStandardMetadata(fileAnalysis, 'test.js');
      
      expect(metadata.hasEventListeners).toBe(true);
      expect(metadata.eventNames).toContain('user:login');
      expect(metadata.eventNames).toContain('data:update');
    });
  });
});

// ============================================
// DETECTOR PIPELINE FLOW
// ============================================

describe('Layer B Integration: Detector Pipeline', () => {
  
  describe('God Object Detection', () => {
    
    it('should detect god object pattern', () => {
      const exportCount = 20;
      const dependentCount = 30;
      
      const result = detectGodObject(exportCount, dependentCount);
      
      expect(result).toBe(true);
    });

    it('should not detect god object in normal files', () => {
      const exportCount = 1;
      const dependentCount = 1;
      
      const result = detectGodObject(exportCount, dependentCount);
      
      expect(result).toBe(false);
    });
  });

  describe('Orphan Module Detection', () => {
    
    it('should detect orphan with side effects', async () => {
      const enrichedResults = new EnrichedResultsBuilder()
        .addFile('src/orphan.js', {
          imports: [],
          usedBy: [],
          hasGlobalAccess: true,
          sharedStateWrites: ['config']
        })
        .build();
      
      const { detectOrphanedFiles } = await import('#layer-b/issue-detectors/orphaned-files.js');
      const issues = detectOrphanedFiles(enrichedResults);
      
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('orphan-with-global-access');
    });
  });
});

// ============================================
// ENRICHMENT FLOW
// ============================================

describe('Layer B Integration: Enrichment Pipeline', () => {
  
  it('should enrich file analysis with semantic data', () => {
    const systemMap = CROSS_LAYER_FIXTURES.localStorageProject();
    
    // Simular enrichimiento
    const enrichedFiles = {};
    
    Object.entries(systemMap.files).forEach(([path, file]) => {
      enrichedFiles[path] = {
        ...file,
        metadata: buildStandardMetadata(file, path)
      };
    });
    
    // Verificar que se agregó metadata
    Object.values(enrichedFiles).forEach(file => {
      expect(file.metadata).toBeDefined();
      expect(file.metadata.filePath).toBeDefined();
    });
  });

  it('should preserve Layer A data during enrichment', () => {
    const systemMap = CROSS_LAYER_FIXTURES.simpleProject();
    
    const originalImports = JSON.parse(JSON.stringify(systemMap.files['src/index.js'].imports));
    
    // Enrich (simulated)
    const enrichedFile = {
      ...systemMap.files['src/index.js'],
      metadata: buildStandardMetadata(systemMap.files['src/index.js'], 'src/index.js')
    };
    
    // Original data should be preserved
    expect(enrichedFile.imports).toEqual(originalImports);
  });
});

// ============================================
// VALIDATION FLOW
// ============================================

describe('Layer B Integration: Validation Pipeline', () => {
  
  describe('Lineage Validation', () => {
    
    it('should validate complete atom', async () => {
      const { validateForLineage } = await import('#layer-b/validators/lineage-validator/validators/main-validator.js');
      const { AtomBuilder } = await import('../../factories/layer-b-lineage/builders.js');
      
      const atom = new AtomBuilder().build();
      const result = validateForLineage(atom);
      
      expect(result.valid).toBe(true);
      expect(result.confidence).toBeDefined();
    });

    it('should reject invalid atom', async () => {
      const { validateForLineage } = await import('#layer-b/validators/lineage-validator/validators/main-validator.js');
      
      const result = validateForLineage(null);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Atom is null');
    });
  });
});

// ============================================
// CROSS-MODULE FLOW
// ============================================

describe('Layer B Integration: Cross-Module Flow', () => {
  
  it('should pass data from metadata builder to detectors', () => {
    const fileAnalysis = {
      filePath: 'src/complex.js',
      exports: Array(20).fill(0).map((_, i) => ({ name: `export${i}` })),
      imports: [],
      usedBy: Array(25).fill(0).map((_, i) => `file${i}.js`),
      functions: []
    };
    
    // Step 1: Build metadata
    const metadata = buildStandardMetadata(fileAnalysis, 'src/complex.js');
    
    // Step 2: Pass to detector (using counts from metadata)
    const godObjectResult = detectGodObject(metadata.exportCount, metadata.dependentCount);
    
    // Verificar que el detector recibió los datos correctos
    expect(godObjectResult).toBe(true);
  });

  it('should aggregate issues from multiple detectors', async () => {
    const enrichedResults = new EnrichedResultsBuilder()
      .addFile('src/orphan1.js', {
        imports: [],
        usedBy: [],
        hasGlobalAccess: true
      })
      .addFile('src/orphan2.js', {
        imports: [],
        usedBy: [],
        eventEmitters: ['orphan-event']
      })
      .build();
    
    const issues = [];
    
    // Detectar con múltiples detectores
    const { detectOrphanedFiles } = await import('#layer-b/issue-detectors/orphaned-files.js');
    issues.push(...detectOrphanedFiles(enrichedResults));
    
    expect(issues.length).toBe(2);
  });
});
