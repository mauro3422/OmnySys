import { describe, it, expect } from 'vitest';
import { ImportDetector } from '../../../../../src/layer-a-static/analyses/tier3/detectors/ImportDetector.js';
import { DetectorScenarios, SystemMapBuilder } from '../../../../factories/detector-test.factory.js';

describe('Tier 3 - ImportDetector', () => {
  describe('Structure Contract', () => {
    it('should return object with total, byFile, and all properties', () => {
      const detector = new ImportDetector();
      const systemMap = DetectorScenarios.empty();
      
      const result = detector.detect(systemMap);
      
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('byFile');
      expect(result).toHaveProperty('all');
    });

    it('should return numeric total', () => {
      const detector = new ImportDetector();
      const result = detector.detect({});
      
      expect(typeof result.total).toBe('number');
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should NOT throw on null/undefined input', () => {
      const detector = new ImportDetector();
      
      expect(() => detector.detect(null)).not.toThrow();
      expect(() => detector.detect(undefined)).not.toThrow();
      expect(() => detector.detect({})).not.toThrow();
    });
  });

  describe('Dynamic Import Detection', () => {
    it('should detect unresolved dynamic import', () => {
      const detector = new ImportDetector();
      const systemMap = DetectorScenarios.brokenDynamicImport();
      
      const result = detector.detect(systemMap);
      
      expect(result.total).toBe(1);
      expect(result.all[0].importPath).toBe('./modules/missing.js');
    });

    it('should not detect resolved dynamic imports', () => {
      const detector = new ImportDetector();
      const systemMap = DetectorScenarios.brokenDynamicImport();
      
      const result = detector.detect(systemMap);
      
      const resolvedImport = result.all.find(i => i.importPath === './modules/exists.js');
      expect(resolvedImport).toBeUndefined();
    });

    it('should detect multiple broken dynamic imports', () => {
      const detector = new ImportDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/main.js')
        .withUnresolvedImport('src/main.js', './a.js')
        .withUnresolvedImport('src/main.js', './b.js')
        .withUnresolvedImport('src/main.js', './c.js')
        .build();
      
      const result = detector.detect(systemMap);
      
      expect(result.total).toBe(3);
    });
  });

  describe('Import Pattern Detection', () => {
    it('should detect dynamic imports by type', () => {
      const detector = new ImportDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/main.js')
        .withUnresolvedImport('src/main.js', './dynamic-module.js', { line: 10 })
        .build();
      
      const result = detector.detect(systemMap);
      
      expect(result.total).toBe(1);
      expect(result.all[0].line).toBe(10);
    });

    it('should detect imports with template literals', () => {
      const detector = new ImportDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/main.js')
        .withImport('src/main.js', './module-${name}.js')
        .build();
      
      const result = detector.detect(systemMap);
      
      // Template literal imports should be detected but not flagged as broken
      // since we can't resolve them statically
      expect(result.total).toBe(0);
    });

    it('should detect imports with concatenation', () => {
      const detector = new ImportDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/main.js')
        .withImport('src/main.js', './module' + '-name.js')
        .build();
      
      const result = detector.detect(systemMap);
      
      // Concatenated imports should be detected but not flagged
      expect(result.total).toBe(0);
    });

    it('should ignore static imports', () => {
      const detector = new ImportDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/main.js')
        .withFile('src/utils.js')
        .withImport('src/main.js', './utils.js')
        .build();
      
      const result = detector.detect(systemMap);
      
      expect(result.total).toBe(0);
    });
  });

  describe('Issue Format', () => {
    it('should include all required fields', () => {
      const detector = new ImportDetector();
      const systemMap = DetectorScenarios.brokenDynamicImport();
      
      const result = detector.detect(systemMap);
      
      const issue = result.all[0];
      expect(issue).toHaveProperty('sourceFile');
      expect(issue).toHaveProperty('importPath');
      expect(issue).toHaveProperty('line');
      expect(issue).toHaveProperty('type');
      expect(issue).toHaveProperty('severity');
      expect(issue).toHaveProperty('reason');
      expect(issue).toHaveProperty('suggestion');
    });

    it('should have correct type', () => {
      const detector = new ImportDetector();
      const systemMap = DetectorScenarios.brokenDynamicImport();
      
      const result = detector.detect(systemMap);
      
      expect(result.all[0].type).toBe('DYNAMIC_IMPORT_UNRESOLVED');
    });

    it('should have MEDIUM severity', () => {
      const detector = new ImportDetector();
      const systemMap = DetectorScenarios.brokenDynamicImport();
      
      const result = detector.detect(systemMap);
      
      expect(result.all[0].severity).toBe('MEDIUM');
    });

    it('should include line number', () => {
      const detector = new ImportDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/main.js')
        .withUnresolvedImport('src/main.js', './missing.js', { line: 15 })
        .build();
      
      const result = detector.detect(systemMap);
      
      expect(result.all[0].line).toBe(15);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty system map', () => {
      const detector = new ImportDetector();
      const result = detector.detect({ files: {} });
      
      expect(result.total).toBe(0);
    });

    it('should handle missing files property', () => {
      const detector = new ImportDetector();
      const result = detector.detect({});
      
      expect(result.total).toBe(0);
    });

    it('should handle file without imports', () => {
      const detector = new ImportDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/main.js')
        .build();
      
      const result = detector.detect(systemMap);
      
      expect(result.total).toBe(0);
    });

    it('should handle missing resolutions', () => {
      const detector = new ImportDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/main.js')
        .withDynamicImport('src/main.js', './module.js')
        .build();
      
      const result = detector.detect(systemMap);
      
      // Without resolutions, can't determine if broken
      expect(result.total).toBe(0);
    });

    it('should group issues by source file', () => {
      const detector = new ImportDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/main.js')
        .withUnresolvedImport('src/main.js', './a.js')
        .withUnresolvedImport('src/main.js', './b.js')
        .build();
      
      const result = detector.detect(systemMap);
      
      expect(Object.keys(result.byFile)).toContain('src/main.js');
      expect(result.byFile['src/main.js']).toHaveLength(2);
    });
  });
});
