import { describe, it, expect } from 'vitest';
import {
  buildFunctionLinks,
  getOutgoingLinks,
  getIncomingLinks,
  findReachableFunctions
} from '#layer-a/graph/builders/function-links.js';
import { GraphBuilder, SystemMapBuilder } from '../../../../factories/graph-test.factory.js';

describe('FunctionLinks', () => {
  describe('Structure Contract', () => {
    it('should export all required functions', () => {
      expect(typeof buildFunctionLinks).toBe('function');
      expect(typeof getOutgoingLinks).toBe('function');
      expect(typeof getIncomingLinks).toBe('function');
      expect(typeof findReachableFunctions).toBe('function');
    });

    it('buildFunctionLinks should return object with functions and function_links', () => {
      const result = buildFunctionLinks({}, {});
      
      expect(result).toHaveProperty('functions');
      expect(result).toHaveProperty('function_links');
      expect(typeof result.functions).toBe('object');
      expect(Array.isArray(result.function_links)).toBe(true);
    });

    it('getOutgoingLinks should return array', () => {
      const result = getOutgoingLinks('func1', []);
      expect(Array.isArray(result)).toBe(true);
    });

    it('getIncomingLinks should return array', () => {
      const result = getIncomingLinks('func1', []);
      expect(Array.isArray(result)).toBe(true);
    });

    it('findReachableFunctions should return a Set', () => {
      const result = findReachableFunctions('func1', []);
      expect(result instanceof Set).toBe(true);
    });
  });

  describe('buildFunctionLinks', () => {
    it('should return empty results for empty input', () => {
      const result = buildFunctionLinks({}, {});
      
      expect(Object.keys(result.functions)).toHaveLength(0);
      expect(result.function_links).toHaveLength(0);
    });

    it('should collect functions from parsed files', () => {
      const parsedFiles = {
        'src/utils.js': {
          functions: [
            { id: 'utils::helper', name: 'helper', line: 10 },
            { id: 'utils::format', name: 'format', line: 20 }
          ]
        }
      };
      
      const result = buildFunctionLinks(parsedFiles, {});
      
      expect(result.functions['src/utils.js']).toHaveLength(2);
      expect(result.functions['src/utils.js'][0].name).toBe('helper');
    });

    it('should handle files without functions', () => {
      const parsedFiles = {
        'src/config.js': { exports: [] },
        'src/utils.js': {
          functions: [{ id: 'utils::helper', name: 'helper' }]
        }
      };
      
      const result = buildFunctionLinks(parsedFiles, {});
      
      expect(Object.keys(result.functions)).toHaveLength(1);
      expect(result.functions['src/utils.js']).toHaveLength(1);
    });

    it('should handle null functions array', () => {
      const parsedFiles = {
        'src/utils.js': { functions: null }
      };
      
      expect(() => buildFunctionLinks(parsedFiles, {})).not.toThrow();
    });

    it('should create function links for resolved calls', () => {
      const parsedFiles = {
        'src/a.js': {
          functions: [
            {
              id: 'a::main',
              name: 'main',
              line: 1,
              calls: [{ name: 'helper', line: 10 }]
            }
          ]
        },
        'src/b.js': {
          functions: [
            { id: 'b::helper', name: 'helper', line: 5 }
          ]
        }
      };
      
      const resolvedImports = {
        'src/a.js': [
          { source: './b', resolved: 'src/b.js', type: 'static' }
        ]
      };
      
      const result = buildFunctionLinks(parsedFiles, resolvedImports);
      
      expect(result.function_links).toHaveLength(1);
      expect(result.function_links[0].from).toBe('a::main');
      expect(result.function_links[0].to).toBe('b::helper');
      expect(result.function_links[0].line).toBe(10);
    });

    it('should create links for local function calls', () => {
      const parsedFiles = {
        'src/utils.js': {
          functions: [
            {
              id: 'utils::public',
              name: 'public',
              line: 1,
              calls: [{ name: 'private', line: 5 }]
            },
            {
              id: 'utils::private',
              name: 'private',
              line: 10
            }
          ]
        }
      };
      
      const result = buildFunctionLinks(parsedFiles, {});
      
      expect(result.function_links).toHaveLength(1);
      expect(result.function_links[0].from).toBe('utils::public');
      expect(result.function_links[0].to).toBe('utils::private');
    });

    it('should not create links for unresolved calls', () => {
      const parsedFiles = {
        'src/a.js': {
          functions: [
            {
              id: 'a::main',
              name: 'main',
              calls: [{ name: 'unknownFunc', line: 5 }]
            }
          ]
        }
      };
      
      const result = buildFunctionLinks(parsedFiles, {});
      
      expect(result.function_links).toHaveLength(0);
    });

    it('should include file information in links', () => {
      const parsedFiles = {
        'src/a.js': {
          functions: [
            {
              id: 'a::main',
              name: 'main',
              line: 1,
              calls: [{ name: 'helper', line: 10 }]
            }
          ]
        },
        'src/b.js': {
          functions: [{ id: 'b::helper', name: 'helper', line: 5 }]
        }
      };
      
      const resolvedImports = {
        'src/a.js': [
          { source: './b', resolved: 'src/b.js', type: 'static' }
        ]
      };
      
      const result = buildFunctionLinks(parsedFiles, resolvedImports);
      
      expect(result.function_links[0].file_from).toBe('src/a.js');
      expect(result.function_links[0].file_to).toBe('src/b.js');
    });
  });

  describe('getOutgoingLinks', () => {
    it('should return empty array for no links', () => {
      const links = [];
      const result = getOutgoingLinks('func1', links);
      expect(result).toHaveLength(0);
    });

    it('should return only outgoing links', () => {
      const links = [
        { from: 'func1', to: 'func2' },
        { from: 'func1', to: 'func3' },
        { from: 'func2', to: 'func1' }
      ];
      
      const result = getOutgoingLinks('func1', links);
      
      expect(result).toHaveLength(2);
      expect(result.every(l => l.from === 'func1')).toBe(true);
    });

    it('should return correct targets', () => {
      const links = [
        { from: 'func1', to: 'func2' },
        { from: 'func1', to: 'func3' }
      ];
      
      const result = getOutgoingLinks('func1', links);
      
      const targets = result.map(l => l.to);
      expect(targets).toContain('func2');
      expect(targets).toContain('func3');
    });
  });

  describe('getIncomingLinks', () => {
    it('should return empty array for no links', () => {
      const links = [];
      const result = getIncomingLinks('func1', links);
      expect(result).toHaveLength(0);
    });

    it('should return only incoming links', () => {
      const links = [
        { from: 'func2', to: 'func1' },
        { from: 'func3', to: 'func1' },
        { from: 'func1', to: 'func2' }
      ];
      
      const result = getIncomingLinks('func1', links);
      
      expect(result).toHaveLength(2);
      expect(result.every(l => l.to === 'func1')).toBe(true);
    });

    it('should return correct sources', () => {
      const links = [
        { from: 'func2', to: 'func1' },
        { from: 'func3', to: 'func1' }
      ];
      
      const result = getIncomingLinks('func1', links);
      
      const sources = result.map(l => l.from);
      expect(sources).toContain('func2');
      expect(sources).toContain('func3');
    });
  });

  describe('findReachableFunctions', () => {
    it('should return set with only starting function for no outgoing links', () => {
      const links = [];
      const result = findReachableFunctions('func1', links);
      
      expect(result.has('func1')).toBe(true);
      expect(result.size).toBe(1);
    });

    it('should find directly reachable functions', () => {
      const links = [
        { from: 'func1', to: 'func2' },
        { from: 'func1', to: 'func3' }
      ];
      
      const result = findReachableFunctions('func1', links);
      
      expect(result.has('func1')).toBe(true);
      expect(result.has('func2')).toBe(true);
      expect(result.has('func3')).toBe(true);
      expect(result.size).toBe(3);
    });

    it('should find transitively reachable functions', () => {
      const links = [
        { from: 'func1', to: 'func2' },
        { from: 'func2', to: 'func3' },
        { from: 'func3', to: 'func4' }
      ];
      
      const result = findReachableFunctions('func1', links);
      
      expect(result.has('func1')).toBe(true);
      expect(result.has('func2')).toBe(true);
      expect(result.has('func3')).toBe(true);
      expect(result.has('func4')).toBe(true);
    });

    it('should handle cycles without infinite loop', () => {
      const links = [
        { from: 'func1', to: 'func2' },
        { from: 'func2', to: 'func3' },
        { from: 'func3', to: 'func1' }
      ];
      
      const result = findReachableFunctions('func1', links);
      
      expect(result.has('func1')).toBe(true);
      expect(result.has('func2')).toBe(true);
      expect(result.has('func3')).toBe(true);
      expect(result.size).toBe(3);
    });

    it('should handle branching paths', () => {
      const links = [
        { from: 'func1', to: 'func2' },
        { from: 'func1', to: 'func3' },
        { from: 'func2', to: 'func4' },
        { from: 'func3', to: 'func4' }
      ];
      
      const result = findReachableFunctions('func1', links);
      
      expect(result.size).toBe(4);
      expect(result.has('func4')).toBe(true);
    });
  });

  describe('Error Handling Contract', () => {
    it('buildFunctionLinks should handle null parsedFiles', () => {
      expect(() => buildFunctionLinks(null, {})).not.toThrow();
    });

    it('buildFunctionLinks should handle null resolvedImports', () => {
      expect(() => buildFunctionLinks({}, null)).not.toThrow();
    });

    it('getOutgoingLinks should handle null links', () => {
      const result = getOutgoingLinks('func1', null);
      expect(Array.isArray(result)).toBe(true);
    });

    it('getIncomingLinks should handle null links', () => {
      const result = getIncomingLinks('func1', null);
      expect(Array.isArray(result)).toBe(true);
    });

    it('findReachableFunctions should handle null links', () => {
      const result = findReachableFunctions('func1', null);
      expect(result instanceof Set).toBe(true);
    });

    it('should handle valid function entries', () => {
      const parsedFiles = {
        'src/file.js': {
          functions: [
            { id: 'f1', name: 'valid', calls: [] }
          ]
        }
      };
      
      const result = buildFunctionLinks(parsedFiles, {});
      expect(result.functions['src/file.js']).toHaveLength(1);
    });

    it('should handle malformed calls array', () => {
      const parsedFiles = {
        'src/file.js': {
          functions: [
            { id: 'f1', name: 'func1', calls: null },
            { id: 'f2', name: 'func2', calls: 'not-an-array' }
          ]
        }
      };
      
      expect(() => buildFunctionLinks(parsedFiles, {})).not.toThrow();
    });
  });

  describe('Integration with SystemMapBuilder', () => {
    it('should build function links with SystemMapBuilder', () => {
      const systemMap = SystemMapBuilder.create()
        .withParsedFile('src/a.js', {
          functions: [
            {
              id: 'a::main',
              name: 'main',
              line: 1,
              calls: [{ name: 'helper', line: 10 }]
            }
          ]
        })
        .withParsedFile('src/b.js', {
          functions: [
            { id: 'b::helper', name: 'helper', line: 5 }
          ]
        })
        .build();
      
      // SystemMap stores functions and function_links
      expect(systemMap.functions).toBeDefined();
      expect(systemMap.function_links).toBeDefined();
    });

    it('should analyze call graph correctly', () => {
      const links = [
        { from: 'main', to: 'init' },
        { from: 'main', to: 'process' },
        { from: 'process', to: 'validate' },
        { from: 'process', to: 'save' }
      ];
      
      const outgoing = getOutgoingLinks('main', links);
      expect(outgoing).toHaveLength(2);
      
      const incoming = getIncomingLinks('process', links);
      expect(incoming).toHaveLength(1);
      
      const reachable = findReachableFunctions('main', links);
      expect(reachable.size).toBe(5); // main + init + process + validate + save
    });

    it('should handle complex function call patterns', () => {
      const parsedFiles = {
        'src/api.js': {
          functions: [
            { id: 'api::getUser', name: 'getUser', line: 1, calls: [{ name: 'validateToken', line: 5 }] },
            { id: 'api::validateToken', name: 'validateToken', line: 10, calls: [{ name: 'logAccess', line: 15 }] },
            { id: 'api::logAccess', name: 'logAccess', line: 20 }
          ]
        }
      };
      
      const result = buildFunctionLinks(parsedFiles, {});
      
      expect(result.function_links).toHaveLength(2);
      
      const reachable = findReachableFunctions('api::getUser', result.function_links);
      expect(reachable.size).toBe(3);
    });
  });
});
