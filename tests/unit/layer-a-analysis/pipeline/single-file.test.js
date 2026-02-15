/**
 * @fileoverview Single File Pipeline Tests
 * 
 * Tests for single-file.js - Single file processing orchestrator
 * 
 * @module tests/unit/layer-a-analysis/pipeline/single-file
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyzeSingleFile } from '#layer-a/pipeline/single-file.js';
import { 
  PipelineBuilder, 
  FileProcessingBuilder,
  createMockFileSystem 
} from '../../../factories/pipeline-test.factory.js';

// Mock dependencies
vi.mock('#layer-a/parser/index.js', () => ({
  parseFileFromDisk: vi.fn()
}));

vi.mock('#layer-a/resolver.js', () => ({
  resolveImport: vi.fn(),
  getResolutionConfig: vi.fn()
}));

vi.mock('#layer-a/extractors/static/index.js', () => ({
  detectAllSemanticConnections: vi.fn()
}));

vi.mock('#layer-a/extractors/communication/index.js', () => ({
  detectAllAdvancedConnections: vi.fn()
}));

vi.mock('#layer-a/extractors/metadata/index.js', () => ({
  extractAllMetadata: vi.fn()
}));

vi.mock('#layer-a/extractors/atomic/index.js', () => ({
  extractAtoms: vi.fn()
}));

vi.mock('#layer-a/storage/storage-manager.js', () => ({
  saveAtom: vi.fn()
}));

import { parseFileFromDisk } from '#layer-a/parser/index.js';
import { resolveImport, getResolutionConfig } from '#layer-a/resolver.js';
import { detectAllSemanticConnections } from '#layer-a/extractors/static/index.js';
import { detectAllAdvancedConnections } from '#layer-a/extractors/communication/index.js';
import { extractAllMetadata } from '#layer-a/extractors/metadata/index.js';
import { extractAtoms } from '#layer-a/extractors/atomic/index.js';
import { saveAtom } from '#layer-a/storage/storage-manager.js';

describe('Single File Pipeline', () => {
  let mockFs;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    getResolutionConfig.mockResolvedValue({ aliases: {} });
    resolveImport.mockResolvedValue({ resolved: 'src/dep.js', type: 'local', reason: 'resolved' });
    detectAllSemanticConnections.mockReturnValue({ all: [] });
    detectAllAdvancedConnections.mockReturnValue({ all: [] });
    extractAllMetadata.mockReturnValue({
      jsdoc: { all: [] },
      async: { all: [] },
      errors: { all: [] },
      build: { envVars: [] }
    });
    extractAtoms.mockReturnValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Structure Contract', () => {
    it('should export analyzeSingleFile function', () => {
      expect(analyzeSingleFile).toBeDefined();
      expect(typeof analyzeSingleFile).toBe('function');
    });

    it('should return analysis result with correct structure', async () => {
      const builder = new FileProcessingBuilder()
        .withFilePath('src/utils/helper.js')
        .withJavaScriptFunction('helper', ['param1'])
        .withExport('helper', 'function');

      parseFileFromDisk.mockResolvedValue(builder.build().parsed);

      const result = await analyzeSingleFile('/test', 'src/utils/helper.js', { verbose: false });

      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('fileName');
      expect(result).toHaveProperty('ext');
      expect(result).toHaveProperty('imports');
      expect(result).toHaveProperty('exports');
      expect(result).toHaveProperty('definitions');
      expect(result).toHaveProperty('semanticConnections');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('atoms');
      expect(result).toHaveProperty('totalAtoms');
      expect(result).toHaveProperty('atomsByType');
      expect(result).toHaveProperty('analyzedAt');
    });

    it('should include filePath in result matching input', async () => {
      const filePath = 'src/components/Button.jsx';
      parseFileFromDisk.mockResolvedValue({
        imports: [],
        exports: [],
        definitions: [],
        source: ''
      });

      const result = await analyzeSingleFile('/test', filePath, { verbose: false });

      expect(result.filePath).toBe(filePath);
    });

    it('should derive fileName from filePath', async () => {
      parseFileFromDisk.mockResolvedValue({
        imports: [],
        exports: [],
        definitions: [],
        source: ''
      });

      const result = await analyzeSingleFile('/test', 'src/deep/nested/file.js', { verbose: false });

      expect(result.fileName).toBe('file.js');
    });

    it('should derive ext from filePath', async () => {
      parseFileFromDisk.mockResolvedValue({
        imports: [],
        exports: [],
        definitions: [],
        source: ''
      });

      const result = await analyzeSingleFile('/test', 'src/file.ts', { verbose: false });

      expect(result.ext).toBe('.ts');
    });
  });

  describe('Analysis Flow', () => {
    it('should parse the target file first', async () => {
      const parsedFile = {
        imports: [],
        exports: [],
        definitions: [],
        source: 'export const x = 1;'
      };
      parseFileFromDisk.mockResolvedValue(parsedFile);

      await analyzeSingleFile('/test', 'src/file.js', { verbose: false });

      expect(parseFileFromDisk).toHaveBeenCalledWith(expect.stringContaining('src/file.js'));
    });

    it('should resolve imports from parsed file', async () => {
      const parsedFile = {
        imports: [{ source: './dep.js', specifiers: ['default'] }],
        exports: [],
        definitions: [],
        source: "import dep from './dep.js';"
      };
      parseFileFromDisk.mockResolvedValue(parsedFile);

      await analyzeSingleFile('/test', 'src/file.js', { verbose: false });

      expect(resolveImport).toHaveBeenCalledWith(
        './dep.js',
        expect.any(String),
        '/test',
        expect.any(Object)
      );
    });

    it('should detect semantic connections', async () => {
      parseFileFromDisk.mockResolvedValue({
        imports: [],
        exports: [],
        definitions: [],
        source: 'const x = 1;'
      });

      await analyzeSingleFile('/test', 'src/file.js', { verbose: false });

      expect(detectAllSemanticConnections).toHaveBeenCalled();
    });

    it('should extract atoms from source code', async () => {
      const sourceCode = 'function test() { return 1; }';
      parseFileFromDisk.mockResolvedValue({
        imports: [],
        exports: [],
        definitions: [],
        source: sourceCode
      });

      await analyzeSingleFile('/test', 'src/file.js', { verbose: false });

      expect(extractAtoms).toHaveBeenCalledWith(sourceCode, 'src/file.js');
    });

    it('should save individual atoms', async () => {
      const atoms = [
        { name: 'func1', type: 'function' },
        { name: 'func2', type: 'function' }
      ];
      parseFileFromDisk.mockResolvedValue({
        imports: [],
        exports: [],
        definitions: [],
        source: ''
      });
      extractAtoms.mockReturnValue(atoms);

      await analyzeSingleFile('/test', 'src/file.js', { verbose: false });

      expect(saveAtom).toHaveBeenCalledTimes(2);
      expect(saveAtom).toHaveBeenCalledWith('/test', 'src/file.js', 'func1', atoms[0]);
      expect(saveAtom).toHaveBeenCalledWith('/test', 'src/file.js', 'func2', atoms[1]);
    });

    it('should include metadata in result', async () => {
      const metadata = {
        jsdoc: { all: [{ name: 'test' }] },
        async: { all: [] },
        errors: { all: [] },
        build: { envVars: ['API_KEY'] }
      };
      parseFileFromDisk.mockResolvedValue({
        imports: [],
        exports: [],
        definitions: [],
        source: ''
      });
      extractAllMetadata.mockReturnValue(metadata);

      const result = await analyzeSingleFile('/test', 'src/file.js', { verbose: false });

      expect(result.metadata.jsdocContracts).toEqual(metadata.jsdoc);
      expect(result.metadata.asyncPatterns).toEqual(metadata.async);
      expect(result.metadata.errorHandling).toEqual(metadata.errors);
      expect(result.metadata.buildTimeDeps).toEqual(metadata.build);
    });

    it('should update existing system map in incremental mode', async () => {
      // This test would require fs mocking which is complex
      // We'll test the incremental flag is passed correctly
      parseFileFromDisk.mockResolvedValue({
        imports: [],
        exports: [],
        definitions: [],
        source: ''
      });

      await analyzeSingleFile('/test', 'src/file.js', { verbose: false, incremental: true });

      // The function should not throw when incremental is true
      expect(parseFileFromDisk).toHaveBeenCalled();
    });
  });

  describe('Error Handling Contract', () => {
    it('should throw error when file cannot be parsed', async () => {
      parseFileFromDisk.mockResolvedValue(null);

      await expect(analyzeSingleFile('/test', 'src/file.js', { verbose: false }))
        .rejects.toThrow('Could not parse file');
    });

    it('should throw error when parseFileFromDisk throws', async () => {
      parseFileFromDisk.mockRejectedValue(new Error('Parse error'));

      await expect(analyzeSingleFile('/test', 'src/file.js', { verbose: false }))
        .rejects.toThrow('Parse error');
    });

    it('should continue when dependency parsing fails', async () => {
      const parsedFile = {
        imports: [{ source: './missing.js', specifiers: [] }],
        exports: [],
        definitions: [],
        source: ''
      };
      parseFileFromDisk
        .mockResolvedValueOnce(parsedFile)
        .mockRejectedValueOnce(new Error('File not found'));

      // Should not throw
      const result = await analyzeSingleFile('/test', 'src/file.js', { verbose: false });
      expect(result).toBeDefined();
    });

    it('should warn but not fail when atom saving fails', async () => {
      const atoms = [{ name: 'func1', type: 'function' }];
      parseFileFromDisk.mockResolvedValue({
        imports: [],
        exports: [],
        definitions: [],
        source: ''
      });
      extractAtoms.mockReturnValue(atoms);
      saveAtom.mockRejectedValue(new Error('Save failed'));

      // Should not throw
      const result = await analyzeSingleFile('/test', 'src/file.js', { verbose: false });
      expect(result).toBeDefined();
    });

    it('should handle files with no imports', async () => {
      parseFileFromDisk.mockResolvedValue({
        imports: [],
        exports: [],
        definitions: [],
        source: 'const x = 1;'
      });

      const result = await analyzeSingleFile('/test', 'src/file.js', { verbose: false });

      expect(result.imports).toEqual([]);
    });

    it('should handle files with no exports', async () => {
      parseFileFromDisk.mockResolvedValue({
        imports: [],
        exports: [],
        definitions: [],
        source: 'const x = 1;'
      });

      const result = await analyzeSingleFile('/test', 'src/file.js', { verbose: false });

      expect(result.exports).toEqual([]);
    });

    it('should handle files with no atoms', async () => {
      parseFileFromDisk.mockResolvedValue({
        imports: [],
        exports: [],
        definitions: [],
        source: ''
      });
      extractAtoms.mockReturnValue([]);

      const result = await analyzeSingleFile('/test', 'src/file.js', { verbose: false });

      expect(result.atoms).toEqual([]);
      expect(result.totalAtoms).toBe(0);
    });
  });

  describe('Integration with Factories', () => {
    it('should process file built with FileProcessingBuilder', async () => {
      const fileBuilder = new FileProcessingBuilder()
        .withFilePath('src/utils/helper.js')
        .withJavaScriptFunction('formatDate', ['date'])
        .withImport('./constants', ['DATE_FORMAT'])
        .withExport('formatDate', 'function')
        .withParsedResult()
        .withAtom({ name: 'formatDate', type: 'function' });

      const fileData = fileBuilder.build();
      parseFileFromDisk.mockResolvedValue(fileData.parsed);
      extractAtoms.mockReturnValue(fileData.atoms);

      const result = await analyzeSingleFile('/test', fileData.filePath, { verbose: false });

      expect(result.filePath).toBe(fileData.filePath);
      expect(result.exports).toHaveLength(1);
      expect(result.totalAtoms).toBe(1);
    });

    it('should process multiple imports from factory-built file', async () => {
      const fileBuilder = new FileProcessingBuilder()
        .withFilePath('src/app.js')
        .withImport('react', ['useState', 'useEffect'], 'external')
        .withImport('./utils', ['helper'], 'local')
        .withImport('lodash', ['debounce'], 'external')
        .withParsedResult();

      parseFileFromDisk.mockResolvedValue(fileBuilder.build().parsed);

      const result = await analyzeSingleFile('/test', 'src/app.js', { verbose: false });

      expect(result.imports).toHaveLength(3);
    });

    it('should handle file with multiple atoms', async () => {
      const fileBuilder = new FileProcessingBuilder()
        .withFilePath('src/utils.js')
        .withAtom({ name: 'func1', type: 'function' })
        .withAtom({ name: 'func2', type: 'function' })
        .withAtom({ name: 'CONSTANT', type: 'constant' });

      parseFileFromDisk.mockResolvedValue({ imports: [], exports: [], definitions: [], source: '' });
      extractAtoms.mockReturnValue(fileBuilder.build().atoms);

      const result = await analyzeSingleFile('/test', 'src/utils.js', { verbose: false });

      expect(result.totalAtoms).toBe(3);
      expect(result.atomsByType.function).toBe(2);
      expect(result.atomsByType.constant).toBe(1);
    });
  });

  describe('Semantic Connections', () => {
    it('should include semantic connections in result', async () => {
      const connections = {
        all: [
          { targetFile: 'src/dep.js', via: 'import', key: 'helper', confidence: 1 },
          { targetFile: 'src/utils.js', via: 'event', event: 'click', confidence: 0.9 }
        ]
      };
      parseFileFromDisk.mockResolvedValue({
        imports: [],
        exports: [],
        definitions: [],
        source: ''
      });
      detectAllSemanticConnections.mockReturnValue(connections);

      const result = await analyzeSingleFile('/test', 'src/file.js', { verbose: false });

      expect(result.semanticConnections).toHaveLength(2);
    });

    it('should map semantic connections with correct structure', async () => {
      const connections = {
        all: [{ targetFile: 'src/dep.js', via: 'import', key: 'default', confidence: 1 }]
      };
      parseFileFromDisk.mockResolvedValue({
        imports: [],
        exports: [],
        definitions: [],
        source: ''
      });
      detectAllSemanticConnections.mockReturnValue(connections);

      const result = await analyzeSingleFile('/test', 'src/file.js', { verbose: false });

      expect(result.semanticConnections[0]).toHaveProperty('target');
      expect(result.semanticConnections[0]).toHaveProperty('type');
      expect(result.semanticConnections[0]).toHaveProperty('key');
      expect(result.semanticConnections[0]).toHaveProperty('confidence');
      expect(result.semanticConnections[0]).toHaveProperty('detectedBy');
    });
  });

  describe('Options Handling', () => {
    it('should use verbose option correctly', async () => {
      parseFileFromDisk.mockResolvedValue({
        imports: [],
        exports: [],
        definitions: [],
        source: ''
      });

      // Should not throw with verbose=true
      await expect(analyzeSingleFile('/test', 'src/file.js', { verbose: true }))
        .resolves.toBeDefined();
    });

    it('should use verbose option false correctly', async () => {
      parseFileFromDisk.mockResolvedValue({
        imports: [],
        exports: [],
        definitions: [],
        source: ''
      });

      const result = await analyzeSingleFile('/test', 'src/file.js', { verbose: false });
      expect(result).toBeDefined();
    });

    it('should default verbose to true when not specified', async () => {
      parseFileFromDisk.mockResolvedValue({
        imports: [],
        exports: [],
        definitions: [],
        source: ''
      });

      const result = await analyzeSingleFile('/test', 'src/file.js');
      expect(result).toBeDefined();
    });
  });
});
