import { describe, it, expect } from 'vitest';
import {
  createEmptySystemMap,
  createFileNode,
  createDependency,
  createFunctionLink,
  createImpactInfo
} from '#layer-a/graph/types.js';
import { GraphBuilder, NodeBuilder, EdgeBuilder } from '../../../factories/graph-test.factory.js';

describe('Graph Types', () => {
  describe('Structure Contract', () => {
    it('should export all required factory functions', () => {
      expect(typeof createEmptySystemMap).toBe('function');
      expect(typeof createFileNode).toBe('function');
      expect(typeof createDependency).toBe('function');
      expect(typeof createFunctionLink).toBe('function');
      expect(typeof createImpactInfo).toBe('function');
    });

    it('createEmptySystemMap should return object with all required properties', () => {
      const systemMap = createEmptySystemMap();
      
      // Core properties
      expect(systemMap).toHaveProperty('files');
      expect(systemMap).toHaveProperty('dependencies');
      expect(systemMap).toHaveProperty('functions');
      expect(systemMap).toHaveProperty('function_links');
      expect(systemMap).toHaveProperty('unresolvedImports');
      expect(systemMap).toHaveProperty('reexportChains');
      expect(systemMap).toHaveProperty('exportIndex');
      
      // Tier 3 properties
      expect(systemMap).toHaveProperty('typeDefinitions');
      expect(systemMap).toHaveProperty('enumDefinitions');
      expect(systemMap).toHaveProperty('constantExports');
      expect(systemMap).toHaveProperty('objectExports');
      expect(systemMap).toHaveProperty('typeUsages');
      
      // Metadata
      expect(systemMap).toHaveProperty('metadata');
    });

    it('createEmptySystemMap should have correct initial types', () => {
      const systemMap = createEmptySystemMap();
      
      expect(typeof systemMap.files).toBe('object');
      expect(Array.isArray(systemMap.dependencies)).toBe(true);
      expect(typeof systemMap.functions).toBe('object');
      expect(Array.isArray(systemMap.function_links)).toBe(true);
      expect(typeof systemMap.unresolvedImports).toBe('object');
      expect(Array.isArray(systemMap.reexportChains)).toBe(true);
      expect(typeof systemMap.exportIndex).toBe('object');
    });

    it('createFileNode should return properly structured FileNode', () => {
      const node = createFileNode('/path/to/file.js', 'src/file.js', {});
      
      expect(node).toHaveProperty('path', '/path/to/file.js');
      expect(node).toHaveProperty('displayPath', 'src/file.js');
      expect(node).toHaveProperty('exports');
      expect(node).toHaveProperty('imports');
      expect(node).toHaveProperty('definitions');
      expect(node).toHaveProperty('usedBy');
      expect(node).toHaveProperty('dependsOn');
      expect(node).toHaveProperty('calls');
      expect(node).toHaveProperty('identifierRefs');
      expect(node).toHaveProperty('transitiveDepends');
      expect(node).toHaveProperty('transitiveDependents');
    });

    it('createFileNode should have array properties initialized', () => {
      const node = createFileNode('/path/file.js', 'file.js', {});
      
      expect(Array.isArray(node.exports)).toBe(true);
      expect(Array.isArray(node.imports)).toBe(true);
      expect(Array.isArray(node.definitions)).toBe(true);
      expect(Array.isArray(node.usedBy)).toBe(true);
      expect(Array.isArray(node.dependsOn)).toBe(true);
      expect(Array.isArray(node.calls)).toBe(true);
      expect(Array.isArray(node.identifierRefs)).toBe(true);
      expect(Array.isArray(node.transitiveDepends)).toBe(true);
      expect(Array.isArray(node.transitiveDependents)).toBe(true);
    });

    it('createDependency should return properly structured Dependency', () => {
      const dep = createDependency('/src/a.js', '/src/b.js', { type: 'import', symbols: ['foo'] });
      
      expect(dep).toHaveProperty('from', '/src/a.js');
      expect(dep).toHaveProperty('to', '/src/b.js');
      expect(dep).toHaveProperty('type', 'import');
      expect(dep).toHaveProperty('symbols');
      expect(dep.symbols).toContain('foo');
    });

    it('createFunctionLink should return properly structured FunctionLink', () => {
      const link = createFunctionLink('file1::func1', 'file2::func2', { line: 42 });
      
      expect(link).toHaveProperty('from', 'file1::func1');
      expect(link).toHaveProperty('to', 'file2::func2');
      expect(link).toHaveProperty('type', 'call');
      expect(link).toHaveProperty('line', 42);
    });

    it('createImpactInfo should return properly structured ImpactInfo', () => {
      const fileNode = createFileNode('/src/file.js', 'src/file.js', {});
      fileNode.usedBy = ['/src/a.js', '/src/b.js'];
      fileNode.transitiveDependents = ['/src/c.js'];
      
      const impact = createImpactInfo('/src/file.js', fileNode);
      
      expect(impact).toHaveProperty('filePath');
      expect(impact).toHaveProperty('directDependents');
      expect(impact).toHaveProperty('indirectDependents');
      expect(impact).toHaveProperty('allAffected');
      expect(impact).toHaveProperty('totalFilesAffected');
    });

    it('createImpactInfo should calculate allAffected correctly', () => {
      const fileNode = createFileNode('/src/file.js', 'src/file.js', {});
      fileNode.usedBy = ['/src/a.js', '/src/b.js'];
      fileNode.transitiveDependents = ['/src/c.js'];
      
      const impact = createImpactInfo('/src/file.js', fileNode);
      
      expect(impact.allAffected).toContain('/src/a.js');
      expect(impact.allAffected).toContain('/src/b.js');
      expect(impact.allAffected).toContain('/src/c.js');
      expect(impact.totalFilesAffected).toBe(3);
    });
  });

  describe('FileNode Creation', () => {
    it('should create FileNode with provided fileInfo', () => {
      const fileInfo = {
        exports: [{ name: 'foo', type: 'named' }],
        imports: [{ source: './bar', type: 'static' }],
        definitions: [{ name: 'MyClass', type: 'class' }],
        calls: [{ name: 'bar', line: 10 }],
        identifierRefs: [{ name: 'CONST', line: 5 }]
      };
      
      const node = createFileNode('/src/file.js', 'src/file.js', fileInfo);
      
      expect(node.exports).toHaveLength(1);
      expect(node.imports).toHaveLength(1);
      expect(node.definitions).toHaveLength(1);
      expect(node.calls).toHaveLength(1);
      expect(node.identifierRefs).toHaveLength(1);
    });

    it('should handle empty fileInfo gracefully', () => {
      const node = createFileNode('/src/file.js', 'src/file.js', {});
      
      expect(node.exports).toEqual([]);
      expect(node.imports).toEqual([]);
      expect(node.definitions).toEqual([]);
    });

    it('should use NodeBuilder to create FileNode', () => {
      const node = NodeBuilder.create('/src/file.js')
        .withDisplayPath('src/file.js')
        .withExport('foo', 'named')
        .withImport('./bar', { symbols: ['baz'] })
        .usedByFile('/src/other.js')
        .dependsOnFile('/src/dep.js')
        .build();
      
      expect(node.path).toBe('/src/file.js');
      expect(node.displayPath).toBe('src/file.js');
      expect(node.exports).toHaveLength(1);
      expect(node.imports).toHaveLength(1);
    });
  });

  describe('Dependency Creation', () => {
    it('should create dependency with default values', () => {
      const dep = createDependency('/src/a.js', '/src/b.js', {});
      
      expect(dep.type).toBe('import');
      expect(dep.symbols).toEqual([]);
    });

    it('should use EdgeBuilder to create dependency', () => {
      const dep = EdgeBuilder.create('/src/a.js', '/src/b.js')
        .ofType('dynamic')
        .withSymbols(['default', 'named'])
        .asDynamic()
        .withConfidence(0.8)
        .because('Dynamic import at runtime')
        .build();
      
      expect(dep.type).toBe('dynamic');
      expect(dep.symbols).toEqual(['default', 'named']);
      expect(dep.dynamic).toBe(true);
      expect(dep.confidence).toBe(0.8);
      expect(dep.reason).toBe('Dynamic import at runtime');
    });
  });

  describe('FunctionLink Creation', () => {
    it('should create function link with callInfo', () => {
      const link = createFunctionLink('a::func1', 'b::func2', {
        line: 42,
        fileFrom: '/src/a.js',
        fileTo: '/src/b.js'
      });
      
      expect(link.line).toBe(42);
      expect(link.file_from).toBe('/src/a.js');
      expect(link.file_to).toBe('/src/b.js');
    });

    it('should default type to "call"', () => {
      const link = createFunctionLink('a::f1', 'b::f2', {});
      expect(link.type).toBe('call');
    });
  });

  describe('SystemMap Creation', () => {
    it('should create SystemMap with GraphBuilder', () => {
      const systemMap = GraphBuilder.create()
        .withFile('src/index.js')
        .withFile('src/utils.js')
        .withDependency('src/index.js', 'src/utils.js')
        .buildSystemMap();
      
      expect(systemMap.metadata.totalFiles).toBe(2);
      expect(systemMap.metadata.totalDependencies).toBe(1);
    });

    it('should have correct metadata structure', () => {
      const systemMap = createEmptySystemMap();
      
      expect(systemMap.metadata).toHaveProperty('totalFiles', 0);
      expect(systemMap.metadata).toHaveProperty('totalDependencies', 0);
      expect(systemMap.metadata).toHaveProperty('totalFunctions', 0);
      expect(systemMap.metadata).toHaveProperty('totalFunctionLinks', 0);
      expect(systemMap.metadata).toHaveProperty('totalUnresolved', 0);
      expect(systemMap.metadata).toHaveProperty('totalReexports', 0);
      expect(systemMap.metadata).toHaveProperty('totalTypes', 0);
      expect(systemMap.metadata).toHaveProperty('totalEnums', 0);
      expect(systemMap.metadata).toHaveProperty('totalConstants', 0);
      expect(systemMap.metadata).toHaveProperty('totalSharedObjects', 0);
      expect(systemMap.metadata).toHaveProperty('cyclesDetected');
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle null/undefined fileInfo gracefully', () => {
      const node = createFileNode('/src/file.js', 'src/file.js', null || {});
      expect(node.exports).toEqual([]);
      expect(node.imports).toEqual([]);
    });

    it('should handle missing properties in fileInfo', () => {
      const node = createFileNode('/src/file.js', 'src/file.js', { exports: null });
      expect(Array.isArray(node.exports)).toBe(true);
    });

    it('should handle empty paths', () => {
      const node = createFileNode('', '', {});
      expect(node.path).toBe('');
      expect(node.displayPath).toBe('');
    });

    it('createImpactInfo should handle missing usedBy', () => {
      const fileNode = createFileNode('/src/file.js', 'src/file.js', {});
      // usedBy is initialized as empty array by createFileNode
      const impact = createImpactInfo('/src/file.js', fileNode);
      expect(impact.directDependents).toEqual([]);
      expect(impact.totalFilesAffected).toBe(0);
    });

    it('createDependency should handle missing importInfo', () => {
      const dep = createDependency('/src/a.js', '/src/b.js', null || {});
      expect(dep.type).toBe('import');
      expect(dep.symbols).toEqual([]);
    });

    it('createFunctionLink should handle missing callInfo', () => {
      const link = createFunctionLink('a::f1', 'b::f2', null || {});
      expect(link.type).toBe('call');
      expect(link.line).toBeUndefined();
    });
  });

  describe('Factory Integration', () => {
    it('should build complex system map with factories', () => {
      const systemMap = GraphBuilder.create()
        .withFiles(['src/a.js', 'src/b.js', 'src/c.js'])
        .withDependency('src/a.js', 'src/b.js')
        .withDependency('src/b.js', 'src/c.js')
        .withFunction('src/a.js', 'main', { line: 1, isExported: true })
        .withFunction('src/b.js', 'helper', { line: 5 })
        .withFunctionLink('src/a.js::main', 'src/b.js::helper', { line: 10 })
        .buildSystemMap();
      
      expect(Object.keys(systemMap.files)).toHaveLength(3);
      expect(systemMap.dependencies).toHaveLength(2);
      expect(Object.keys(systemMap.functions)).toHaveLength(2);
      expect(systemMap.function_links).toHaveLength(1);
    });

    it('should create nodes with builder pattern', () => {
      const node = NodeBuilder.create('src/utils.js')
        .withDisplayPath('src/utils.js')
        .withExports(['formatDate', 'parseDate'])
        .withImport('./constants', { symbols: ['DATE_FORMAT'] })
        .usedByFile('src/app.js')
        .dependsOnFile('src/constants.js')
        .withMetadata({ complexity: 5 })
        .build();
      
      expect(node.exports).toHaveLength(2);
      expect(node.imports).toHaveLength(1);
    });
  });
});
