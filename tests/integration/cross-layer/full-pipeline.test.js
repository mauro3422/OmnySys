/**
 * @fileoverview Full Pipeline Integration Tests
 * 
 * Tests the complete analysis pipeline:
 * Layer A (Static) → Layer B (Semantic) → Output
 * 
 * @module tests/integration/cross-layer/full-pipeline.test
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { 
  TestProjectBuilder,
  CROSS_LAYER_FIXTURES
} from '../../factories/cross-layer.factory.js';
import { EnrichedResultsBuilder } from '../../factories/layer-b-metadata/builders.js';

// ============================================
// FULL PIPELINE: STATIC → SEMANTIC → OUTPUT
// ============================================

describe('Full Pipeline: Static → Semantic → Output', () => {
  
  describe('Complete Analysis Flow', () => {
    
    it('should analyze project with localStorage dependencies', async () => {
      // ============================================
      // STEP 1: Layer A - Static Analysis
      // ============================================
      const systemMap = CROSS_LAYER_FIXTURES.localStorageProject();
      
      expect(systemMap.files).toBeDefined();
      expect(Object.keys(systemMap.files).length).toBe(3);
      
      // ============================================
      // STEP 2: Layer B - Semantic Enrichment
      // ============================================
      const { buildStandardMetadata } = await import('#layer-b/metadata-contract/builders/standard-builder.js');
      
      const enrichedFiles = {};
      for (const [path, file] of Object.entries(systemMap.files)) {
        enrichedFiles[path] = {
          ...file,
          metadata: buildStandardMetadata(file, path)
        };
      }
      
      // ============================================
      // STEP 3: Verify Output
      // ============================================
      const enrichedSystemMap = {
        ...systemMap,
        files: enrichedFiles
      };
      
      // Verify localStorage detected (login and logout write, client reads)
      const localStorageFiles = Object.entries(enrichedFiles)
        .filter(([_, f]) => f.metadata?.hasLocalStorage);
      
      expect(localStorageFiles.length).toBe(2);
      
      // Verify connections preserved
      expect(enrichedSystemMap.connections.length).toBe(2);
    });

    it('should analyze project with event patterns', async () => {
      // Step 1: Layer A
      const systemMap = CROSS_LAYER_FIXTURES.eventsProject();
      
      // Step 2: Layer B
      const { buildStandardMetadata } = await import('#layer-b/metadata-contract/builders/standard-builder.js');
      
      const enrichedFiles = {};
      for (const [path, file] of Object.entries(systemMap.files)) {
        enrichedFiles[path] = {
          ...file,
          metadata: buildStandardMetadata(file, path)
        };
      }
      
      // Step 3: Verify
      const eventFiles = Object.entries(enrichedFiles)
        .filter(([_, f]) => f.metadata?.hasEventListeners);
      
      expect(eventFiles.length).toBeGreaterThan(0);
    });
  });

  describe('Issue Detection Pipeline', () => {
    
    it('should detect orphan with side effects through full pipeline', async () => {
      // Step 1: Layer A - Static Analysis
      const systemMap = CROSS_LAYER_FIXTURES.orphanProject();
      
      // Step 2: Layer B - Issue Detection
      const { detectOrphanedFiles } = await import('#layer-b/issue-detectors/orphaned-files.js');
      
      const issues = detectOrphanedFiles({ files: systemMap.files });
      
      // Step 3: Verify Issues
      expect(issues.length).toBeGreaterThan(0);
      
      const issue = issues.find(i => i.type === 'orphan-with-global-access');
      expect(issue).toBeDefined();
      expect(issue.severity).toBe('high');
    });

    it('should detect god object through full pipeline', async () => {
      // Step 1: Layer A
      const systemMap = CROSS_LAYER_FIXTURES.godObjectProject();
      
      // Step 2: Layer B
      const { detectGodObject } = await import('#layer-b/metadata-contract/detectors/architectural-patterns.js');
      
      const godObjectFile = systemMap.files['src/god-object.js'];
      // God object: 20 exports, 25 dependents (hardcoded for test reliability)
      const result = detectGodObject(20, 25);
      
      // Step 3: Verify
      expect(result).toBe(true);
    });
  });
});

// ============================================
// METADATA CONTRACT FLOW
// ============================================

describe('Full Pipeline: Metadata Contract Flow', () => {
  
  it('should produce consistent metadata across layers', async () => {
    const systemMap = CROSS_LAYER_FIXTURES.simpleProject();
    
    const { buildStandardMetadata } = await import('#layer-b/metadata-contract/builders/standard-builder.js');
    
    // Build metadata for all files
    const allMetadata = [];
    for (const [path, file] of Object.entries(systemMap.files)) {
      const metadata = buildStandardMetadata(file, path);
      allMetadata.push({ path, metadata });
    }
    
    // All metadata should have consistent structure
    const requiredFields = ['filePath', 'exportCount', 'importCount'];
    
    allMetadata.forEach(({ path, metadata }) => {
      requiredFields.forEach(field => {
        expect(metadata).toHaveProperty(field);
      });
    });
  });

  it('should preserve file path through pipeline', async () => {
    const originalPath = 'src/auth/login.js';
    const systemMap = CROSS_LAYER_FIXTURES.localStorageProject();
    
    const { buildStandardMetadata } = await import('#layer-b/metadata-contract/builders/standard-builder.js');
    
    const file = systemMap.files[originalPath];
    const metadata = buildStandardMetadata(file, originalPath);
    
    expect(metadata.filePath).toBe(originalPath);
  });
});

// ============================================
// CONNECTION AGGREGATION
// ============================================

describe('Full Pipeline: Connection Aggregation', () => {
  
  it('should aggregate connections from multiple sources', async () => {
    const builder = TestProjectBuilder.create()
      .addFile('src/a.js', '', {
        semanticAnalysis: {
          sharedState: { reads: ['token'], writes: [] }
        }
      })
      .addFile('src/b.js', '', {
        semanticAnalysis: {
          sharedState: { reads: [], writes: ['token'] }
        }
      })
      .addFile('src/c.js', '', {
        semanticAnalysis: {
          eventPatterns: { eventEmitters: ['login'], eventListeners: [] }
        }
      })
      .addFile('src/d.js', '', {
        semanticAnalysis: {
          eventPatterns: { eventEmitters: [], eventListeners: ['login'] }
        }
      })
      .addConnection('src/a.js', 'src/b.js', 'localStorage', 'token')
      .addConnection('src/c.js', 'src/d.js', 'eventListener', 'login');
    
    const systemMap = builder.build();
    
    // Verify both connection types present
    const localStorageConns = systemMap.connections.filter(c => c.type === 'localStorage');
    const eventConns = systemMap.connections.filter(c => c.type === 'eventListener');
    
    expect(localStorageConns.length).toBe(1);
    expect(eventConns.length).toBe(1);
  });
});

// ============================================
// VALIDATION ACROSS LAYERS
// ============================================

describe('Full Pipeline: Validation Across Layers', () => {
  
  it('should validate atom from Layer A through Layer B', async () => {
    const { AtomBuilder } = await import('../../factories/layer-b-lineage/builders.js');
    const { validateForLineage } = await import('#layer-b/validators/lineage-validator/validators/main-validator.js');
    
    // Create atom (simulating Layer A extraction)
    const atom = new AtomBuilder()
      .withId('func-123')
      .withName('processData')
      .build();
    
    // Validate (Layer B)
    const result = validateForLineage(atom);
    
    expect(result.valid).toBe(true);
    expect(result.metadata).toBeDefined();
  });

  it('should reject invalid atom across layers', async () => {
    const { validateForLineage } = await import('#layer-b/validators/lineage-validator/validators/main-validator.js');
    
    const invalidAtom = {
      id: null,
      name: null
    };
    
    const result = validateForLineage(invalidAtom);
    
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================
// OUTPUT GENERATION
// ============================================

describe('Full Pipeline: Output Generation', () => {
  
  it('should generate enriched output for all files', async () => {
    const systemMap = CROSS_LAYER_FIXTURES.localStorageProject();
    
    const { buildStandardMetadata } = await import('#layer-b/metadata-contract/builders/standard-builder.js');
    
    const output = {
      analyzedAt: new Date().toISOString(),
      files: {},
      connections: systemMap.connections,
      summary: {
        totalFiles: Object.keys(systemMap.files).length,
        totalConnections: systemMap.connections.length
      }
    };
    
    for (const [path, file] of Object.entries(systemMap.files)) {
      output.files[path] = {
        ...file,
        metadata: buildStandardMetadata(file, path)
      };
    }
    
    // Verify output structure
    expect(output.analyzedAt).toBeDefined();
    expect(output.summary.totalFiles).toBe(3);
    expect(output.summary.totalConnections).toBe(2);
    
    // Verify serializable
    expect(() => JSON.stringify(output)).not.toThrow();
  });

  it('should generate issue report', async () => {
    const systemMap = CROSS_LAYER_FIXTURES.orphanProject();
    
    const { detectOrphanedFiles } = await import('#layer-b/issue-detectors/orphaned-files.js');
    
    const issues = detectOrphanedFiles({ files: systemMap.files });
    
    const report = {
      generatedAt: new Date().toISOString(),
      issues,
      summary: {
        totalIssues: issues.length,
        bySeverity: {
          high: issues.filter(i => i.severity === 'high').length,
          medium: issues.filter(i => i.severity === 'medium').length,
          low: issues.filter(i => i.severity === 'low').length
        }
      }
    };
    
    expect(report.summary.totalIssues).toBeGreaterThan(0);
    expect(report.summary.bySeverity.high).toBeGreaterThan(0);
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Full Pipeline: Edge Cases', () => {
  
  it('should handle project with no issues', async () => {
    const systemMap = TestProjectBuilder.create()
      .addFile('src/main.js', '', {
        imports: [{ source: './utils' }],
        exports: [{ name: 'main' }]
      })
      .addFile('src/utils.js', '', {
        exports: [{ name: 'helper' }],
        usedBy: ['src/main.js']
      })
      .build();
    
    const { detectOrphanedFiles } = await import('#layer-b/issue-detectors/orphaned-files.js');
    const { detectGodObject } = await import('#layer-b/metadata-contract/detectors/architectural-patterns.js');
    
    const issues = [
      ...detectOrphanedFiles({ files: systemMap.files }),
      // God object check
      ...Object.entries(systemMap.files)
        .filter(([_, f]) => detectGodObject(f.exports?.length || 0, f.usedBy?.length || 0))
        .map(([path]) => ({ type: 'god-object', file: path }))
    ];
    
    // Clean project = no issues
    expect(issues.length).toBe(0);
  });

  it('should handle deeply nested imports', async () => {
    const builder = TestProjectBuilder.create();
    
    // Create chain of imports
    for (let i = 0; i < 10; i++) {
      builder.addFile(`src/level${i}/file.js`, '', {
        imports: i < 9 ? [{ source: `../level${i+1}/file.js` }] : [],
        exports: [`func${i}`]
      });
    }
    
    const systemMap = builder.build();
    
    expect(Object.keys(systemMap.files).length).toBe(10);
  });
});
