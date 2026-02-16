/**
 * @fileoverview State Management Contract Tests
 * 
 * Contract tests for all state management extractors
 * Ensures consistent interfaces and result structures across all extractors
 * 
 * @module tests/unit/layer-a-analysis/extractors/state-management/contract
 */

import { describe, it, expect } from 'vitest';
import {
  ReduxType,
  ContextType,
  ConnectionType,
  DEFAULT_CONFIDENCE
} from '#layer-a/extractors/state-management/constants.js';
import {
  extractRedux,
  extractContext,
  extractReduxContextFromFile,
  analyzeFiles,
  detectAllReduxContextConnections
} from '#layer-a/extractors/state-management/index.js';
import {
  StateManagementScenarios,
  StateManagementValidators,
  ReduxBuilder,
  ContextBuilder,
  StateConnectionBuilder
} from '../../../../factories/state-management-test.factory.js';

describe('State Management Contract', () => {
  const FILE_PATH = 'test/file.js';

  // ============================================================================
  // Redux Extractor Contract
  // ============================================================================
  describe('Redux Extractor Contract', () => {
    it('should always return object with required fields', () => {
      const scenario = StateManagementScenarios.emptyFile();
      const result = extractRedux(scenario.code || '');

      expect(result).toHaveProperty('selectors');
      expect(result).toHaveProperty('actions');
      expect(result).toHaveProperty('reducers');
      expect(result).toHaveProperty('stores');
      expect(result).toHaveProperty('thunks');
      expect(result).toHaveProperty('all');
    });

    it('should return arrays for all collection fields', () => {
      const result = extractRedux('');

      expect(Array.isArray(result.selectors)).toBe(true);
      expect(Array.isArray(result.actions)).toBe(true);
      expect(Array.isArray(result.reducers)).toBe(true);
      expect(Array.isArray(result.stores)).toBe(true);
      expect(Array.isArray(result.thunks)).toBe(true);
      expect(Array.isArray(result.all)).toBe(true);
    });

    it('should return empty arrays for empty code', () => {
      const result = extractRedux('');

      expect(result.selectors).toHaveLength(0);
      expect(result.actions).toHaveLength(0);
      expect(result.reducers).toHaveLength(0);
      expect(result.stores).toHaveLength(0);
      expect(result.thunks).toHaveLength(0);
    });

    it('should extract valid slice objects', () => {
      const scenario = StateManagementScenarios.simpleSlice();
      const result = extractRedux(scenario.code);

      expect(result.reducers.length).toBeGreaterThan(0);
      result.reducers.forEach(reducer => {
        expect(StateManagementValidators.isValidSlice(reducer)).toBe(true);
      });
    });

    it('should extract valid selector objects', () => {
      const scenario = StateManagementScenarios.simpleUseSelector();
      const result = extractRedux(scenario.code);

      expect(result.selectors.length).toBeGreaterThan(0);
      result.selectors.forEach(selector => {
        expect(StateManagementValidators.isValidSelector(selector)).toBe(true);
      });
    });

    it('should include line numbers for all extracted items', () => {
      const scenario = StateManagementScenarios.complexRedux();
      const result = extractRedux(scenario.code);

      [...result.reducers, ...result.stores, ...result.thunks].forEach(item => {
        expect(typeof item.line).toBe('number');
        expect(item.line).toBeGreaterThanOrEqual(1);
      });
    });

    it('should include type field for all extracted items', () => {
      const scenario = StateManagementScenarios.complexRedux();
      const result = extractRedux(scenario.code);

      result.all.forEach(item => {
        expect(typeof item.type).toBe('string');
        expect(Object.values(ReduxType)).toContain(item.type);
      });
    });
  });

  // ============================================================================
  // Context Extractor Contract
  // ============================================================================
  describe('Context Extractor Contract', () => {
    it('should always return object with required fields', () => {
      const result = extractContext('');

      expect(result).toHaveProperty('contexts');
      expect(result).toHaveProperty('providers');
      expect(result).toHaveProperty('consumers');
      expect(result).toHaveProperty('all');
    });

    it('should return arrays for all collection fields', () => {
      const result = extractContext('');

      expect(Array.isArray(result.contexts)).toBe(true);
      expect(Array.isArray(result.providers)).toBe(true);
      expect(Array.isArray(result.consumers)).toBe(true);
      expect(Array.isArray(result.all)).toBe(true);
    });

    it('should return empty arrays for empty code', () => {
      const result = extractContext('');

      expect(result.contexts).toHaveLength(0);
      expect(result.providers).toHaveLength(0);
      expect(result.consumers).toHaveLength(0);
    });

    it('should extract valid context objects', () => {
      const scenario = StateManagementScenarios.simpleContext();
      const result = extractContext(scenario.code);

      expect(result.contexts.length).toBeGreaterThan(0);
      result.contexts.forEach(ctx => {
        expect(StateManagementValidators.isValidContext(ctx)).toBe(true);
      });
    });

    it('should extract valid provider objects', () => {
      const scenario = StateManagementScenarios.complexContext();
      const result = extractContext(scenario.code);

      if (result.providers.length > 0) {
        result.providers.forEach(provider => {
          expect(typeof provider.contextName).toBe('string');
          expect(typeof provider.line).toBe('number');
        });
      }
    });

    it('should extract valid consumer objects', () => {
      const scenario = StateManagementScenarios.simpleContext();
      const result = extractContext(scenario.code);

      expect(result.consumers.length).toBeGreaterThan(0);
      result.consumers.forEach(consumer => {
        expect(typeof consumer.contextName).toBe('string');
        expect(typeof consumer.line).toBe('number');
      });
    });

    it('should include type field for all extracted items', () => {
      const scenario = StateManagementScenarios.complexContext();
      const result = extractContext(scenario.code);

      result.all.forEach(item => {
        expect(typeof item.type).toBe('string');
        expect(Object.values(ContextType)).toContain(item.type);
      });
    });
  });

  // ============================================================================
  // File Analysis Contract
  // ============================================================================
  describe('File Analysis Contract', () => {
    it('should return complete file analysis structure', () => {
      const result = extractReduxContextFromFile(FILE_PATH, '');

      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('redux');
      expect(result).toHaveProperty('context');
      expect(result).toHaveProperty('timestamp');
    });

    it('should include file path in result', () => {
      const result = extractReduxContextFromFile(FILE_PATH, '');

      expect(result.filePath).toBe(FILE_PATH);
    });

    it('should include ISO timestamp', () => {
      const result = extractReduxContextFromFile(FILE_PATH, '');

      expect(typeof result.timestamp).toBe('string');
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('should include both redux and context analysis', () => {
      const scenario = StateManagementScenarios.mixedPattern();
      const result = extractReduxContextFromFile(FILE_PATH, scenario.code);

      expect(StateManagementValidators.hasReduxFields(result.redux)).toBe(true);
      expect(StateManagementValidators.hasContextFields(result.context)).toBe(true);
    });
  });

  // ============================================================================
  // Multi-file Analysis Contract
  // ============================================================================
  describe('Multi-file Analysis Contract', () => {
    it('should analyze multiple files', () => {
      const files = {
        'file1.js': '',
        'file2.js': ''
      };
      const result = analyzeFiles(files);

      expect(result).toHaveProperty('file1.js');
      expect(result).toHaveProperty('file2.js');
    });

    it('should return analysis for each file', () => {
      const files = {
        'test.js': ''
      };
      const result = analyzeFiles(files);

      expect(result['test.js']).toHaveProperty('filePath');
      expect(result['test.js']).toHaveProperty('redux');
      expect(result['test.js']).toHaveProperty('context');
    });

    it('should handle empty file map', () => {
      const result = analyzeFiles({});

      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  // ============================================================================
  // Connection Detection Contract
  // ============================================================================
  describe('Connection Detection Contract', () => {
    it('should detect connections across files', () => {
      const builder = new StateConnectionBuilder();
      builder.withSharedSelectorScenario();
      const files = builder.build();

      const codeMap = {};
      for (const [path, data] of Object.entries(files)) {
        codeMap[path] = data.code;
      }

      const result = detectAllReduxContextConnections(codeMap);

      expect(result).toHaveProperty('connections');
      expect(result).toHaveProperty('storeStructure');
      expect(result).toHaveProperty('fileResults');
      expect(result).toHaveProperty('byType');
    });

    it('should return valid connection objects', () => {
      const builder = new StateConnectionBuilder();
      builder.withSharedSelectorScenario();
      const files = builder.build();

      const codeMap = {};
      for (const [path, data] of Object.entries(files)) {
        codeMap[path] = data.code;
      }

      const result = detectAllReduxContextConnections(codeMap);

      result.connections.forEach(conn => {
        expect(StateManagementValidators.isValidConnection(conn)).toBe(true);
      });
    });

    it('should categorize connections by type', () => {
      const builder = new StateConnectionBuilder();
      builder.withReduxArchitecture().withContextArchitecture();
      const files = builder.build();

      const codeMap = {};
      for (const [path, data] of Object.entries(files)) {
        codeMap[path] = data.code;
      }

      const result = detectAllReduxContextConnections(codeMap);

      expect(result.byType).toHaveProperty('selector');
      expect(result.byType).toHaveProperty('context');
      expect(Array.isArray(result.byType.selector)).toBe(true);
      expect(Array.isArray(result.byType.context)).toBe(true);
    });
  });

  // ============================================================================
  // Error Handling Contract
  // ============================================================================
  describe('Error Handling Contract', () => {
    it('should handle null code gracefully', () => {
      expect(() => extractRedux(null)).not.toThrow();
      expect(() => extractContext(null)).not.toThrow();
    });

    it('should handle undefined code gracefully', () => {
      expect(() => extractRedux(undefined)).not.toThrow();
      expect(() => extractContext(undefined)).not.toThrow();
    });

    it('should return empty results for invalid code', () => {
      const reduxResult = extractRedux('not valid javascript {');
      const contextResult = extractContext('not valid javascript {');

      expect(Array.isArray(reduxResult.selectors)).toBe(true);
      expect(Array.isArray(contextResult.contexts)).toBe(true);
    });

    it('should handle whitespace-only code', () => {
      const result = extractRedux('   \n\t   ');

      expect(result.all).toHaveLength(0);
    });

    it('should handle code with only comments', () => {
      const code = `
        // This is a comment
        /* Multi-line
           comment */
      `;
      const result = extractRedux(code);

      expect(result.all).toHaveLength(0);
    });

    it('should handle very large files', () => {
      const code = 'const x = 1;\n'.repeat(10000);
      
      expect(() => extractRedux(code)).not.toThrow();
      expect(() => extractContext(code)).not.toThrow();
    });

    it('should handle special characters in code', () => {
      const code = `
        const emoji = '🎉';
        const unicode = '\u0041';
        const special = '\\x00\\x01\\x02';
      `;
      
      expect(() => extractRedux(code)).not.toThrow();
      expect(() => extractContext(code)).not.toThrow();
    });
  });

  // ============================================================================
  // Type Consistency Contract
  // ============================================================================
  describe('Type Consistency Contract', () => {
    it('should use consistent Redux types', () => {
      const scenario = StateManagementScenarios.complexRedux();
      const result = extractRedux(scenario.code);

      const types = new Set(result.all.map(item => item.type));
      types.forEach(type => {
        expect(Object.values(ReduxType)).toContain(type);
      });
    });

    it('should use consistent Context types', () => {
      const scenario = StateManagementScenarios.complexContext();
      const result = extractContext(scenario.code);

      const types = new Set(result.all.map(item => item.type));
      types.forEach(type => {
        expect(Object.values(ContextType)).toContain(type);
      });
    });

    it('should use valid connection types', () => {
      const builder = new StateConnectionBuilder();
      builder.withSharedSelectorScenario();
      const files = builder.build();

      const codeMap = {};
      for (const [path, data] of Object.entries(files)) {
        codeMap[path] = data.code;
      }

      const result = detectAllReduxContextConnections(codeMap);

      result.connections.forEach(conn => {
        expect(Object.values(ConnectionType)).toContain(conn.type);
      });
    });

    it('should use default confidence values', () => {
      const builder = new StateConnectionBuilder();
      builder.withSharedSelectorScenario();
      const files = builder.build();

      const codeMap = {};
      for (const [path, data] of Object.entries(files)) {
        codeMap[path] = data.code;
      }

      const result = detectAllReduxContextConnections(codeMap);

      result.connections.forEach(conn => {
        expect(typeof conn.confidence).toBe('number');
        expect(conn.confidence).toBeGreaterThanOrEqual(0);
        expect(conn.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  // ============================================================================
  // Performance Contract
  // ============================================================================
  describe('Performance Contract', () => {
    it('should analyze small files quickly', () => {
      const code = 'const x = 1;';
      const start = Date.now();
      
      extractRedux(code);
      extractContext(code);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('should scale linearly with file size', () => {
      const smallCode = 'const x = 1;\n'.repeat(100);
      const largeCode = 'const x = 1;\n'.repeat(1000);

      const start1 = Date.now();
      extractRedux(smallCode);
      const duration1 = Date.now() - start1;

      const start2 = Date.now();
      extractRedux(largeCode);
      const duration2 = Date.now() - start2;

      // Large file should take less than 10x the time (linear scaling)
      expect(duration2).toBeLessThan(duration1 * 15);
    });
  });
});
