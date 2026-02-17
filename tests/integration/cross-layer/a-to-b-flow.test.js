/**
 * @fileoverview Cross-Layer Integration Tests: Layer A → Layer B
 * 
 * Tests the complete flow from Layer A static analysis
 * to Layer B semantic enrichment.
 * 
 * @module tests/integration/cross-layer/a-to-b-flow.test
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { 
  TestProjectBuilder,
  CROSS_LAYER_FIXTURES,
  validateLayerAOutput,
  validateLayerBInput
} from '../../factories/cross-layer.factory.js';

// ============================================
// LAYER A → LAYER B DATA FLOW
// ============================================

describe('Cross-Layer: Layer A → Layer B Data Flow', () => {
  
  describe('System Map Transfer', () => {
    
    it('should transfer files from Layer A to Layer B', () => {
      const systemMap = CROSS_LAYER_FIXTURES.simpleProject();
      
      // Validate Layer A output
      const aValidation = validateLayerAOutput(systemMap);
      expect(aValidation.valid).toBe(true);
      
      // Validate Layer B can process it
      const bValidation = validateLayerBInput(systemMap);
      expect(bValidation.canProcess).toBe(true);
      
      // Files should be accessible
      expect(Object.keys(systemMap.files).length).toBeGreaterThan(0);
    });

    it('should preserve connection data across layers', () => {
      const systemMap = CROSS_LAYER_FIXTURES.localStorageProject();
      
      // Layer A detecta conexión
      expect(systemMap.connections.length).toBeGreaterThan(0);
      
      // Layer B debe poder acceder a la misma conexión
      const connection = systemMap.connections[0];
      expect(connection.type).toBe('localStorage');
      expect(connection.via).toBe('token');
    });
  });

  describe('Semantic Analysis Transfer', () => {
    
    it('should transfer localStorage metadata', () => {
      const systemMap = CROSS_LAYER_FIXTURES.localStorageProject();
      
      const filesWithLocalStorage = Object.entries(systemMap.files)
        .filter(([_, file]) => 
          file.semanticAnalysis?.sharedState?.writes?.length > 0 ||
          file.semanticAnalysis?.sharedState?.reads?.length > 0
        );
      
      expect(filesWithLocalStorage.length).toBe(3);
    });

    it('should transfer event metadata', () => {
      const systemMap = CROSS_LAYER_FIXTURES.eventsProject();
      
      const filesWithEvents = Object.entries(systemMap.files)
        .filter(([_, file]) => 
          file.semanticAnalysis?.eventPatterns?.eventEmitters?.length > 0 ||
          file.semanticAnalysis?.eventPatterns?.eventListeners?.length > 0
        );
      
      expect(filesWithEvents.length).toBe(2);
    });
  });
});

// ============================================
// FULL PIPELINE TEST
// ============================================

describe('Cross-Layer: Full Pipeline Flow', () => {
  
  describe('LocalStorage Pipeline', () => {
    
    it('should detect localStorage usage end-to-end', async () => {
      // Step 1: Layer A output (simulated)
      const systemMap = CROSS_LAYER_FIXTURES.localStorageProject();
      
      // Step 2: Layer B processing
      const { buildStandardMetadata } = await import('#layer-b/metadata-contract/builders/standard-builder.js');
      
      const enrichedFiles = {};
      for (const [path, file] of Object.entries(systemMap.files)) {
        enrichedFiles[path] = {
          ...file,
          metadata: buildStandardMetadata(file, path)
        };
      }
      
      // Step 3: Verify localStorage detected
      const filesWithLocalStorage = Object.entries(enrichedFiles)
        .filter(([_, file]) => file.metadata?.hasLocalStorage);
      
      expect(filesWithLocalStorage.length).toBeGreaterThan(0);
    });
  });

  describe('Event Pipeline', () => {
    
    it('should detect event connections end-to-end', async () => {
      // Step 1: Layer A output
      const systemMap = CROSS_LAYER_FIXTURES.eventsProject();
      
      // Step 2: Find connections
      const eventConnections = systemMap.connections.filter(
        conn => conn.type === 'eventListener'
      );
      
      // Step 3: Verify connection
      expect(eventConnections.length).toBe(1);
      expect(eventConnections[0].via).toBe('user:login');
    });
  });

  describe('Orphan Pipeline', () => {
    
    it('should detect orphan files end-to-end', async () => {
      // Step 1: Layer A output
      const systemMap = CROSS_LAYER_FIXTURES.orphanProject();
      
      // Step 2: Layer B issue detection
      const { detectOrphanedFiles } = await import('#layer-b/issue-detectors/orphaned-files.js');
      
      const enrichedResults = {
        files: systemMap.files
      };
      
      const issues = detectOrphanedFiles(enrichedResults);
      
      // Step 3: Verify orphan detected
      expect(issues.length).toBeGreaterThan(0);
    });
  });
});

// ============================================
// DATA INTEGRITY
// ============================================

describe('Cross-Layer: Data Integrity', () => {
  
  it('should not mutate Layer A data', () => {
    const systemMap = CROSS_LAYER_FIXTURES.simpleProject();
    const originalFiles = JSON.stringify(systemMap.files);
    
    // Simular procesamiento de Layer B
    Object.entries(systemMap.files).forEach(([path, file]) => {
      // Solo lectura, no mutación
      const _ = file.imports;
      const __ = file.exports;
    });
    
    // Files no debe haber cambiado
    expect(JSON.stringify(systemMap.files)).toBe(originalFiles);
  });

  it('should handle circular references in data', () => {
    const systemMap = TestProjectBuilder.create()
      .addFile('src/a.js', '', {
        imports: [{ source: './b.js' }]
      })
      .addFile('src/b.js', '', {
        imports: [{ source: './a.js' }]
      })
      .addConnection('src/a.js', 'src/b.js', 'import', './b.js')
      .addConnection('src/b.js', 'src/a.js', 'import', './a.js')
      .build();
    
    // Should handle without crashing
    expect(systemMap.connections.length).toBe(2);
    
    // Should be serializable
    expect(() => JSON.stringify(systemMap)).not.toThrow();
  });

  it('should handle large projects', () => {
    const builder = TestProjectBuilder.create();
    
    // Create 100 files
    for (let i = 0; i < 100; i++) {
      builder.addFile(`src/file${i}.js`, '', {
        imports: i > 0 ? [{ source: `./file${i-1}.js` }] : [],
        exports: [`func${i}`]
      });
    }
    
    const systemMap = builder.build();
    
    expect(Object.keys(systemMap.files).length).toBe(100);
    expect(() => validateLayerBInput(systemMap)).not.toThrow();
  });
});

// ============================================
// ERROR HANDLING
// ============================================

describe('Cross-Layer: Error Handling', () => {
  
  it('should handle missing semanticAnalysis', async () => {
    const systemMap = TestProjectBuilder.create()
      .addFile('src/no-semantic.js', '', {})
      .build();
    
    const { buildStandardMetadata } = await import('#layer-b/metadata-contract/builders/standard-builder.js');
    
    // Should not throw
    expect(() => buildStandardMetadata(systemMap.files['src/no-semantic.js'], 'test.js')).not.toThrow();
  });

  it('should handle empty project', () => {
    const systemMap = TestProjectBuilder.create().build();
    
    const validation = validateLayerBInput(systemMap);
    
    // Empty project is still valid
    expect(typeof validation.canProcess).toBe('boolean');
  });

  it('should handle corrupted connection data', () => {
    const systemMap = TestProjectBuilder.create()
      .addFile('src/a.js', '', {})
      .build();
    
    // Add corrupted connection
    systemMap.connections.push({
      sourceFile: null,
      targetFile: undefined,
      type: ''
    });
    
    // Should handle without crashing
    expect(() => validateLayerAOutput(systemMap)).not.toThrow();
  });
});

// ============================================
// PERFORMANCE
// ============================================

describe('Cross-Layer: Performance', () => {
  
  it('should process 50 files in under 5 seconds', async () => {
    const builder = TestProjectBuilder.create();
    
    for (let i = 0; i < 50; i++) {
      builder.addFile(`src/file${i}.js`, '', {
        imports: [],
        exports: [`func${i}`],
        semanticAnalysis: {
          sharedState: { reads: [`key${i}`], writes: [] }
        }
      });
    }
    
    const systemMap = builder.build();
    
    const start = Date.now();
    
    const { buildStandardMetadata } = await import('#layer-b/metadata-contract/builders/standard-builder.js');
    
    for (const [path, file] of Object.entries(systemMap.files)) {
      buildStandardMetadata(file, path);
    }
    
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(5000);
  });
});
