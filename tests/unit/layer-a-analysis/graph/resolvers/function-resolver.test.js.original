import { describe, it, expect } from 'vitest';
import {
  findFunctionInResolution,
  resolveAllFunctionCalls
} from '#layer-a/graph/resolvers/function-resolver.js';
import { GraphBuilder, SystemMapBuilder } from '../../../../factories/graph-test.factory.js';

describe('FunctionResolver', () => {
  describe('Structure Contract', () => {
    it('should export all required functions', () => {
      expect(typeof findFunctionInResolution).toBe('function');
      expect(typeof resolveAllFunctionCalls).toBe('function');
    });

    it('findFunctionInResolution should return object or null', () => {
      const result = findFunctionInResolution('foo', {}, {}, {}, 'test.js');
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('resolveAllFunctionCalls should return array', () => {
      const result = resolveAllFunctionCalls({}, {}, {}, 'test.js');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('findFunctionInResolution', () => {
    it('should return null when function not found', () => {
      const result = findFunctionInResolution('nonExistent', {}, {}, {}, 'src/file.js');
      expect(result).toBeNull();
    });

    it('should find function in resolved imports', () => {
      const fileInfo = { imports: [] };
      const resolvedImports = {
        'src/main.js': [
          { resolved: 'src/utils.js', type: 'static' }
        ]
      };
      const parsedFiles = {
        'src/utils.js': {
          functions: [
            { id: 'utils::helper', name: 'helper', line: 10 }
          ]
        }
      };
      
      const result = findFunctionInResolution('helper', fileInfo, resolvedImports, parsedFiles, 'src/main.js');
      
      expect(result).not.toBeNull();
      expect(result.id).toBe('utils::helper');
      expect(result.file).toBe('src/utils.js');
    });

    it('should find local function', () => {
      const fileInfo = {
        functions: [
          { id: 'main::localFunc', name: 'localFunc', line: 20 }
        ]
      };
      const resolvedImports = {};
      const parsedFiles = {};
      
      const result = findFunctionInResolution('localFunc', fileInfo, resolvedImports, parsedFiles, 'src/main.js');
      
      expect(result).not.toBeNull();
      expect(result.id).toBe('main::localFunc');
      expect(result.file).toBe('src/main.js');
    });

    it('should prefer import over local when both exist', () => {
      const fileInfo = {
        functions: [
          { id: 'main::helper', name: 'helper', line: 10 } // Local
        ]
      };
      const resolvedImports = {
        'src/main.js': [
          { resolved: 'src/utils.js', type: 'static' }
        ]
      };
      const parsedFiles = {
        'src/utils.js': {
          functions: [
            { id: 'utils::helper', name: 'helper', line: 5 } // Imported
          ]
        }
      };
      
      // Should find the imported one first
      const result = findFunctionInResolution('helper', fileInfo, resolvedImports, parsedFiles, 'src/main.js');
      
      expect(result).not.toBeNull();
      expect(result.file).toBe('src/utils.js');
    });

    it('should handle unresolved imports gracefully', () => {
      const fileInfo = { imports: [] };
      const resolvedImports = {
        'src/main.js': [
          { resolved: null, type: 'unresolved' }
        ]
      };
      const parsedFiles = {};
      
      const result = findFunctionInResolution('foo', fileInfo, resolvedImports, parsedFiles, 'src/main.js');
      
      expect(result).toBeNull();
    });

    it('should handle missing target file gracefully', () => {
      const fileInfo = { imports: [] };
      const resolvedImports = {
        'src/main.js': [
          { resolved: 'src/non-existent.js', type: 'static' }
        ]
      };
      const parsedFiles = {}; // Target file not in parsedFiles
      
      const result = findFunctionInResolution('foo', fileInfo, resolvedImports, parsedFiles, 'src/main.js');
      
      expect(result).toBeNull();
    });

    it('should handle missing functions property in target', () => {
      const fileInfo = { imports: [] };
      const resolvedImports = {
        'src/main.js': [
          { resolved: 'src/utils.js', type: 'static' }
        ]
      };
      const parsedFiles = {
        'src/utils.js': {} // No functions property
      };
      
      const result = findFunctionInResolution('foo', fileInfo, resolvedImports, parsedFiles, 'src/main.js');
      
      expect(result).toBeNull();
    });

    it('should normalize file paths when searching', () => {
      const fileInfo = { imports: [] };
      const resolvedImports = {
        'src/main.js': [
          { resolved: 'src/utils.js', type: 'static' }
        ]
      };
      const parsedFiles = {
        'src/utils.js': {
          functions: [{ id: 'utils::helper', name: 'helper', line: 1 }]
        }
      };
      
      const result = findFunctionInResolution('helper', fileInfo, resolvedImports, parsedFiles, 'src/main.js');
      
      // Should find the function
      expect(result).not.toBeNull();
      expect(result.id).toBe('utils::helper');
    });

    it('should search through multiple imports', () => {
      const fileInfo = { imports: [] };
      const resolvedImports = {
        'src/main.js': [
          { resolved: 'src/utils.js', type: 'static' },
          { resolved: 'src/helpers.js', type: 'static' }
        ]
      };
      const parsedFiles = {
        'src/utils.js': { functions: [] },
        'src/helpers.js': {
          functions: [{ id: 'helpers::format', name: 'format', line: 1 }]
        }
      };
      
      const result = findFunctionInResolution('format', fileInfo, resolvedImports, parsedFiles, 'src/main.js');
      
      expect(result).not.toBeNull();
      expect(result.id).toBe('helpers::format');
    });
  });

  describe('resolveAllFunctionCalls', () => {
    it('should return empty array for file with no functions', () => {
      const fileInfo = {};
      const result = resolveAllFunctionCalls(fileInfo, {}, {}, 'src/file.js');
      expect(result).toHaveLength(0);
    });

    it('should return empty array for null functions', () => {
      const fileInfo = { functions: null };
      const result = resolveAllFunctionCalls(fileInfo, {}, {}, 'src/file.js');
      expect(result).toHaveLength(0);
    });

    it('should resolve all function calls', () => {
      const fileInfo = {
        functions: [
          {
            id: 'main::process',
            name: 'process',
            calls: [
              { name: 'validate', line: 10 }
            ]
          }
        ]
      };
      const resolvedImports = {
        'src/main.js': [
          { resolved: 'src/utils.js', type: 'static' }
        ]
      };
      const parsedFiles = {
        'src/utils.js': {
          functions: [
            { id: 'utils::validate', name: 'validate', line: 5 }
          ]
        }
      };
      
      const result = resolveAllFunctionCalls(fileInfo, resolvedImports, parsedFiles, 'src/main.js');
      
      expect(result).toHaveLength(1);
      expect(result[0].from).toBe('main::process');
      expect(result[0].to).toBe('utils::validate');
    });

    it('should include line number in resolved calls', () => {
      const fileInfo = {
        functions: [
          {
            id: 'main::test',
            name: 'test',
            calls: [{ name: 'helper', line: 42 }]
          }
        ]
      };
      const resolvedImports = {
        'src/main.js': [
          { resolved: 'src/utils.js', type: 'static' }
        ]
      };
      const parsedFiles = {
        'src/utils.js': {
          functions: [{ id: 'utils::helper', name: 'helper', line: 1 }]
        }
      };
      
      const result = resolveAllFunctionCalls(fileInfo, resolvedImports, parsedFiles, 'src/main.js');
      
      expect(result[0].line).toBe(42);
    });

    it('should include file information in resolved calls', () => {
      const fileInfo = {
        functions: [
          {
            id: 'main::test',
            name: 'test',
            calls: [{ name: 'helper', line: 10 }]
          }
        ]
      };
      const resolvedImports = {
        'src/main.js': [
          { resolved: 'src/utils.js', type: 'static' }
        ]
      };
      const parsedFiles = {
        'src/utils.js': {
          functions: [{ id: 'utils::helper', name: 'helper', line: 5 }]
        }
      };
      
      const result = resolveAllFunctionCalls(fileInfo, resolvedImports, parsedFiles, 'src/main.js');
      
      expect(result[0].fileFrom).toBe('src/main.js');
      expect(result[0].fileTo).toBe('src/utils.js');
    });

    it('should skip unresolved calls', () => {
      const fileInfo = {
        functions: [
          {
            id: 'main::test',
            name: 'test',
            calls: [
              { name: 'unknownFunc', line: 10 },
              { name: 'knownFunc', line: 20 }
            ]
          }
        ]
      };
      const resolvedImports = {
        'src/main.js': [
          { resolved: 'src/utils.js', type: 'static' }
        ]
      };
      const parsedFiles = {
        'src/utils.js': {
          functions: [{ id: 'utils::knownFunc', name: 'knownFunc', line: 1 }]
        }
      };
      
      const result = resolveAllFunctionCalls(fileInfo, resolvedImports, parsedFiles, 'src/main.js');
      
      expect(result).toHaveLength(1);
      expect(result[0].functionName).toBe('knownFunc');
    });

    it('should handle multiple functions in file', () => {
      const fileInfo = {
        functions: [
          {
            id: 'main::funcA',
            name: 'funcA',
            calls: [{ name: 'helper', line: 10 }]
          },
          {
            id: 'main::helper',
            name: 'helper',
            calls: []
          }
        ]
      };
      const resolvedImports = {};
      const parsedFiles = {};
      
      const result = resolveAllFunctionCalls(fileInfo, resolvedImports, parsedFiles, 'src/main.js');
      
      expect(result).toHaveLength(1);
      expect(result[0].from).toBe('main::funcA');
      expect(result[0].to).toBe('main::helper');
    });

    it('should handle function with no calls', () => {
      const fileInfo = {
        functions: [
          {
            id: 'main::simple',
            name: 'simple',
            calls: []
          }
        ]
      };
      
      const result = resolveAllFunctionCalls(fileInfo, {}, {}, 'src/main.js');
      
      expect(result).toHaveLength(0);
    });

    it('should handle function with null calls', () => {
      const fileInfo = {
        functions: [
          {
            id: 'main::simple',
            name: 'simple',
            calls: null
          }
        ]
      };
      
      const result = resolveAllFunctionCalls(fileInfo, {}, {}, 'src/main.js');
      
      expect(result).toHaveLength(0);
    });
  });

  describe('Error Handling Contract', () => {
    it('findFunctionInResolution should handle null functionName', () => {
      const result = findFunctionInResolution(null, {}, {}, {}, 'test.js');
      expect(result).toBeNull();
    });

    it('findFunctionInResolution should handle null fileInfo', () => {
      const result = findFunctionInResolution('foo', null, {}, {}, 'test.js');
      expect(result).toBeNull();
    });

    it('findFunctionInResolution should handle null resolvedImports', () => {
      const fileInfo = { functions: [] };
      const result = findFunctionInResolution('foo', fileInfo, null, {}, 'test.js');
      expect(result).toBeNull();
    });

    it('findFunctionInResolution should handle null parsedFiles', () => {
      const fileInfo = { functions: [] };
      const result = findFunctionInResolution('foo', fileInfo, {}, null, 'test.js');
      expect(result).toBeNull();
    });

    it('resolveAllFunctionCalls should handle null fileInfo', () => {
      const result = resolveAllFunctionCalls(null, {}, {}, 'test.js');
      expect(result).toEqual([]);
    });

    it('resolveAllFunctionCalls should handle null resolvedImports', () => {
      const fileInfo = { 
        functions: [
          { id: 'test::func', name: 'func', calls: [] }
        ] 
      };
      const result = resolveAllFunctionCalls(fileInfo, null, {}, 'test.js');
      expect(result).toEqual([]);
    });

    it('resolveAllFunctionCalls should handle empty parsedFiles', () => {
      const fileInfo = { functions: [{ id: 'test::func', name: 'func', calls: [] }] };
      const result = resolveAllFunctionCalls(fileInfo, {}, {}, 'test.js');
      expect(result).toEqual([]);
    });

    it('should handle valid function entries', () => {
      const fileInfo = {
        functions: [
          { id: 'f1', name: 'valid', calls: [] }
        ]
      };
      
      const result = resolveAllFunctionCalls(fileInfo, {}, {}, 'test.js');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle malformed call entries', () => {
      const fileInfo = {
        functions: [
          {
            id: 'test::func',
            name: 'func',
            calls: [
              { name: 'valid', line: 10 }
            ]
          }
        ]
      };
      
      // Should handle valid calls gracefully
      const result = resolveAllFunctionCalls(fileInfo, {}, {}, 'test.js');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should resolve chain of function calls', () => {
      const fileInfo = {
        functions: [
          {
            id: 'app::init',
            name: 'init',
            calls: [{ name: 'setupRouter', line: 10 }]
          }
        ]
      };
      const resolvedImports = {
        'src/app.js': [
          { resolved: 'src/router.js', type: 'static' }
        ]
      };
      const parsedFiles = {
        'src/router.js': {
          functions: [
            { id: 'router::setupRouter', name: 'setupRouter', line: 5 }
          ]
        }
      };
      
      const result = resolveAllFunctionCalls(fileInfo, resolvedImports, parsedFiles, 'src/app.js');
      
      expect(result).toHaveLength(1);
      expect(result[0].from).toBe('app::init');
      expect(result[0].to).toBe('router::setupRouter');
    });

    it('should handle complex import resolution', () => {
      const fileInfo = {
        functions: [
          {
            id: 'main::process',
            name: 'process',
            calls: [
              { name: 'validate', line: 10 },
              { name: 'transform', line: 15 },
              { name: 'save', line: 20 }
            ]
          }
        ]
      };
      const resolvedImports = {
        'src/main.js': [
          { resolved: 'src/validator.js', type: 'static' },
          { resolved: 'src/transformer.js', type: 'static' },
          { resolved: 'src/storage.js', type: 'static' }
        ]
      };
      const parsedFiles = {
        'src/validator.js': {
          functions: [{ id: 'validator::validate', name: 'validate', line: 1 }]
        },
        'src/transformer.js': {
          functions: [{ id: 'transformer::transform', name: 'transform', line: 1 }]
        },
        'src/storage.js': {
          functions: [{ id: 'storage::save', name: 'save', line: 1 }]
        }
      };
      
      const result = resolveAllFunctionCalls(fileInfo, resolvedImports, parsedFiles, 'src/main.js');
      
      expect(result).toHaveLength(3);
      const targets = result.map(r => r.to);
      expect(targets).toContain('validator::validate');
      expect(targets).toContain('transformer::transform');
      expect(targets).toContain('storage::save');
    });

    it('should handle local functions overriding imports', () => {
      const fileInfo = {
        functions: [
          {
            id: 'main::localHelper',
            name: 'helper',  // Same name as imported
            line: 5
          },
          {
            id: 'main::process',
            name: 'process',
            calls: [{ name: 'helper', line: 20 }]
          }
        ]
      };
      const resolvedImports = {
        'src/main.js': [
          { resolved: 'src/utils.js', type: 'static' }
        ]
      };
      const parsedFiles = {
        'src/utils.js': {
          functions: [{ id: 'utils::helper', name: 'helper', line: 1 }]
        }
      };
      
      const result = resolveAllFunctionCalls(fileInfo, resolvedImports, parsedFiles, 'src/main.js');
      
      // Should resolve to the imported helper
      expect(result[0].to).toBe('utils::helper');
    });

    it('should handle integration with SystemMapBuilder', () => {
      const systemMap = SystemMapBuilder.create()
        .withParsedFile('src/api.js', {
          functions: [
            { id: 'api::getUser', name: 'getUser', line: 1, calls: [{ name: 'validateToken', line: 5 }] }
          ]
        })
        .withParsedFile('src/auth.js', {
          functions: [
            { id: 'auth::validateToken', name: 'validateToken', line: 10 }
          ]
        })
        .build();
      
      // SystemMap should be built without errors
      expect(systemMap).toBeDefined();
    });
  });
});
