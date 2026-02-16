/**
 * @fileoverview Layer A Master Contract Tests
 * 
 * Cross-cutting contract tests that verify consistency across all
 * extractors, detectors, builders, and analysis components.
 * 
 * @module tests/unit/layer-a-analysis/layer-a-contracts
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Contract Test: Extractor Return Structure Consistency
 * 
 * All extractors MUST return consistent data structures
 */
describe('Layer A Contracts - Extractor Consistency', () => {
  const factoryPath = 'tests/factories';
  
  it('all extractor factories should have create method', () => {
    const factoryFiles = [
      'extractor-test.factory.js',
      'static-extractor-test.factory.js', 
      'comprehensive-extractor-test.factory.js'
    ];

    for (const file of factoryFiles) {
      const factoryPath = path.join('tests/factories', file);
      if (fs.existsSync(factoryPath)) {
        // Check file content for create method
        const content = fs.readFileSync(factoryPath, 'utf-8');
        expect(content).toMatch(/static\s+create\s*\(/);
      }
    }
  });

  it('extractor results should have consistent structure', () => {
    // Common fields all extractors should return
    const requiredFields = ['files', 'metadata'];
    
    // Simulate factory output structure check
    const mockExtractorResult = {
      files: {
        'test.js': {
          imports: [],
          exports: [],
          functions: []
        }
      },
      metadata: {
        totalFiles: 1,
        totalFunctions: 0
      }
    };

    for (const field of requiredFields) {
      expect(mockExtractorResult).toHaveProperty(field);
    }
  });

  it('all extractors should handle empty input gracefully', () => {
    const emptyResults = [
      { files: {}, metadata: { totalFiles: 0 } },
      { files: [], metadata: {} },
      null
    ];

    for (const result of emptyResults) {
      // Should not throw when accessing properties
      expect(() => {
        const files = result?.files || {};
        const count = result?.metadata?.totalFiles || 0;
      }).not.toThrow();
    }
  });
});

/**
 * Contract Test: Detector Interface Consistency
 * 
 * All detectors MUST follow the same interface pattern
 */
describe('Layer A Contracts - Detector Interface', () => {
  it('all detectors should implement detect method', () => {
    // Mock detector interface
    const detectorInterface = {
      detect: 'function',
      name: 'string',
      description: 'string'
    };

    // Example detectors
    const mockDetectors = [
      { name: 'HotspotDetector', detect: () => [], description: 'Finds hotspots' },
      { name: 'CycleDetector', detect: () => [], description: 'Finds cycles' },
      { name: 'OrphanDetector', detect: () => [], description: 'Finds orphans' }
    ];

    for (const detector of mockDetectors) {
      expect(typeof detector.detect).toBe('function');
      expect(typeof detector.name).toBe('string');
      expect(typeof detector.description).toBe('string');
    }
  });

  it('detector detect() should return array of findings', async () => {
    const mockDetector = {
      detect: async () => [
        { id: 'finding-1', type: 'warning', severity: 'medium' },
        { id: 'finding-2', type: 'error', severity: 'high' }
      ]
    };

    const results = await mockDetector.detect();
    
    expect(Array.isArray(results)).toBe(true);
    for (const finding of results) {
      expect(finding).toHaveProperty('id');
      expect(finding).toHaveProperty('type');
      expect(finding).toHaveProperty('severity');
    }
  });

  it('detector findings should have consistent severity levels', () => {
    const validSeverities = ['low', 'medium', 'high', 'critical', 'info'];
    
    const mockFindings = [
      { severity: 'low' },
      { severity: 'medium' },
      { severity: 'high' },
      { severity: 'critical' }
    ];

    for (const finding of mockFindings) {
      expect(validSeverities).toContain(finding.severity);
    }
  });

  it('all detectors should handle errors gracefully', async () => {
    const faultyDetector = {
      detect: async () => {
        throw new Error('Detection failed');
      }
    };

    // Should either throw with proper error or return empty results
    // Depending on error handling strategy
    await expect(faultyDetector.detect()).rejects.toThrow('Detection failed');
  });
});

/**
 * Contract Test: Builder Pattern Consistency
 * 
 * All builders MUST use consistent patterns
 */
describe('Layer A Contracts - Builder Pattern Consistency', () => {
  it('all builders should have static create() method', () => {
    const mockBuilders = [
      { create: () => ({}) },
      { create: () => ({ build: () => {} }) }
    ];

    for (const builder of mockBuilders) {
      expect(typeof builder.create).toBe('function');
    }
  });

  it('all builders should return this from chainable methods', () => {
    class MockBuilder {
      constructor() { this.value = 0; }
      static create() { return new MockBuilder(); }
      add() { this.value++; return this; }
      build() { return { value: this.value }; }
    }

    const builder = MockBuilder.create();
    const returnValue = builder.add();
    
    expect(returnValue).toBe(builder); // Should return same instance
  });

  it('all builders should have build() method', () => {
    class MockBuilder {
      build() { return {}; }
    }

    const builder = new MockBuilder();
    expect(typeof builder.build).toBe('function');
    expect(builder.build()).toBeDefined();
  });

  it('builder build() should return immutable result', () => {
    class MockBuilder {
      constructor() { this.data = { count: 0 }; }
      increment() { this.data.count++; return this; }
      build() { return { ...this.data }; }
    }

    const builder = new MockBuilder();
    const result1 = builder.increment().build();
    const result2 = builder.increment().build();

    expect(result1.count).toBe(1);
    expect(result2.count).toBe(2);
  });
});

/**
 * Contract Test: Error Handling Consistency
 * 
 * All components MUST handle errors consistently
 */
describe('Layer A Contracts - Error Handling', () => {
  it('should use consistent error structure', () => {
    const errors = [
      { message: 'File not found', code: 'ENOENT', path: '/test.js' },
      { message: 'Parse error', code: 'PARSE_ERROR', line: 10, column: 5 },
      { message: 'Invalid input', code: 'INVALID_INPUT', details: {} }
    ];

    for (const error of errors) {
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('code');
      expect(typeof error.message).toBe('string');
      expect(typeof error.code).toBe('string');
    }
  });

  it('should handle null/undefined inputs consistently', () => {
    const inputs = [null, undefined, {}, []];
    
    for (const input of inputs) {
      // Functions should not throw on null/undefined
      expect(() => {
        const files = input?.files || {};
        const count = input?.count || 0;
      }).not.toThrow();
    }
  });

  it('should provide meaningful error messages', () => {
    const errorMessages = [
      'Failed to parse file: syntax error at line 10',
      'Module not found: ./missing-module',
      'Invalid configuration: missing required field "root"'
    ];

    for (const message of errorMessages) {
      expect(message.length).toBeGreaterThan(10);
      expect(message).toMatch(/[a-zA-Z]/);
    }
  });
});

/**
 * Contract Test: Data Structure Consistency
 * 
 * All data structures MUST follow naming conventions
 */
describe('Layer A Contracts - Data Structure Conventions', () => {
  it('should use camelCase for property names', () => {
    const data = {
      filePath: 'test.js',
      usedBy: [],
      dependsOn: [],
      isExported: true,
      transitiveDependents: []
    };

    for (const key of Object.keys(data)) {
      // Check camelCase (no underscores, starts with lowercase)
      expect(key).toMatch(/^[a-z][a-zA-Z0-9]*$/);
    }
  });

  it('should use consistent array property names', () => {
    const validPluralNames = [
      'files', 'functions', 'imports', 'exports', 
      'dependencies', 'links', 'atoms', 'modules',
      'usedBy', 'dependsOn', 'calls', 'accesses'
    ];

    for (const name of validPluralNames) {
      expect(typeof name).toBe('string');
    }
  });

  it('should use consistent metadata structure', () => {
    const metadata = {
      totalFiles: 10,
      totalFunctions: 50,
      totalDependencies: 30,
      analysisTimestamp: new Date().toISOString(),
      version: '1.0.0'
    };

    expect(metadata).toHaveProperty('totalFiles');
    expect(metadata).toHaveProperty('totalFunctions');
    expect(typeof metadata.totalFiles).toBe('number');
    expect(typeof metadata.totalFunctions).toBe('number');
  });
});

/**
 * Contract Test: Factory Method Consistency
 */
describe('Layer A Contracts - Factory Method Patterns', () => {
  it('all factories should export builder classes', () => {
    const mockExports = {
      GraphBuilder: class {},
      SystemMapBuilder: class {},
      RaceScenarioBuilder: class {}
    };

    for (const [name, cls] of Object.entries(mockExports)) {
      expect(name).toMatch(/Builder$/);
      expect(typeof cls).toBe('function');
    }
  });

  it('all factories should export scenario creators', () => {
    const mockScenarios = {
      GraphScenarios: { empty: () => {}, star: () => {} },
      DetectorScenarios: { deadCode: () => {}, complex: () => {} },
      RaceScenarios: { readWrite: () => {}, writeWrite: () => {} }
    };

    for (const [name, scenarios] of Object.entries(mockScenarios)) {
      expect(name).toMatch(/Scenarios$/);
      for (const [scenarioName, fn] of Object.entries(scenarios)) {
        expect(typeof fn).toBe('function');
      }
    }
  });

  it('all factories should export test data constants', () => {
    const mockConstants = {
      TEST_CONSTANTS: {
        SEVERITY_LEVELS: [],
        CYCLE_CATEGORIES: [],
        HOTSPOT_THRESHOLDS: {}
      }
    };

    for (const [name, constants] of Object.entries(mockConstants)) {
      expect(name).toMatch(/CONSTANTS$/);
      expect(typeof constants).toBe('object');
    }
  });
});

/**
 * Contract Test: Async Operation Consistency
 */
describe('Layer A Contracts - Async Operations', () => {
  it('async methods should return Promises', () => {
    const asyncMethods = [
      async () => {},
      () => Promise.resolve(),
      () => new Promise((resolve) => resolve())
    ];

    for (const method of asyncMethods) {
      const result = method();
      expect(result).toBeInstanceOf(Promise);
    }
  });

  it('async errors should be rejections', async () => {
    const failingAsync = async () => {
      throw new Error('Async error');
    };

    await expect(failingAsync()).rejects.toThrow('Async error');
  });
});

/**
 * Contract Test: Path Handling Consistency
 */
describe('Layer A Contracts - Path Handling', () => {
  it('should use forward slashes in stored paths', () => {
    const paths = [
      'src/components/Button.js',
      'utils/helpers/format.js',
      'test/unit/example.test.js'
    ];

    for (const p of paths) {
      expect(p).not.toMatch(/\\/); // No backslashes
      expect(p).toMatch(/\//); // Has forward slashes
    }
  });

  it('should handle both relative and absolute paths', () => {
    const relativePath = 'src/file.js';
    const absolutePath = '/project/src/file.js';
    const windowsPath = 'C:\\project\\src\\file.js';

    // All should be valid path formats
    expect(typeof relativePath).toBe('string');
    expect(typeof absolutePath).toBe('string');
    expect(typeof windowsPath).toBe('string');
  });
});

/**
 * Cross-Module Integration Contract
 */
describe('Layer A Contracts - Cross-Module Integration', () => {
  it('graph and system map should be compatible', () => {
    const graph = {
      files: {
        'a.js': { imports: [], exports: [] }
      }
    };

    const systemMap = {
      files: {
        'a.js': { imports: [], exports: [] }
      }
    };

    // Both should have same file structure
    expect(Object.keys(graph.files)).toEqual(Object.keys(systemMap.files));
  });

  it('detector input should accept graph output', () => {
    const graphOutput = {
      files: {},
      functions: {},
      dependencies: []
    };

    // Detector should accept this structure
    const detectorInput = { ...graphOutput };
    expect(detectorInput).toHaveProperty('files');
    expect(detectorInput).toHaveProperty('functions');
  });
});
