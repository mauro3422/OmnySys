/**
 * @fileoverview Expanded Tests for indexer.js - Main Entry Point
 * 
 * Comprehensive tests for the indexProject function and pipeline orchestration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SystemMapBuilder, ProjectStructureBuilder } from '../../factories/root-infrastructure-test.factory.js';

// Mock all dependencies
vi.mock('../../../src/layer-a-static/pipeline/scan.js', () => ({
  loadProjectInfo: vi.fn().mockResolvedValue({}),
  scanProjectFiles: vi.fn().mockResolvedValue({
    relativeFiles: ['src/index.js'],
    files: ['/test/src/index.js']
  })
}));

vi.mock('../../../src/layer-a-static/pipeline/parse.js', () => ({
  parseFiles: vi.fn().mockResolvedValue({
    '/test/src/index.js': {
      source: 'export const main = () => {};',
      imports: [],
      exports: [{ name: 'main' }],
      metadata: {}
    }
  })
}));

vi.mock('../../../src/layer-a-static/pipeline/resolve.js', () => ({
  resolveImports: vi.fn().mockResolvedValue({
    resolvedImports: {}
  })
}));

vi.mock('../../../src/layer-a-static/pipeline/normalize.js', () => ({
  normalizeParsedFiles: vi.fn((files) => files),
  normalizeResolvedImports: vi.fn((imports) => imports)
}));

vi.mock('../../../src/layer-a-static/pipeline/graph.js', () => ({
  buildSystemGraph: vi.fn().mockReturnValue({
    files: {},
    functions: {},
    function_links: [],
    metadata: { totalFiles: 1 }
  })
}));

vi.mock('../../../src/layer-a-static/pipeline/save.js', () => ({
  ensureDataDir: vi.fn().mockResolvedValue('/test/.omnysysdata'),
  saveSystemMap: vi.fn().mockResolvedValue(undefined),
  saveAnalysisReport: vi.fn().mockResolvedValue(undefined),
  saveEnhancedSystemMap: vi.fn().mockResolvedValue('/test/.omnysysdata/enhanced-system-map.json'),
  savePartitionedData: vi.fn().mockResolvedValue({}),
  printSummary: vi.fn()
}));

vi.mock('../../../src/layer-a-static/pipeline/enhancers/index.js', () => ({
  enhanceSystemMap: vi.fn().mockResolvedValue({
    files: {},
    functions: {},
    metadata: { totalFiles: 1, totalAtoms: 0 }
  })
}));

vi.mock('../../../src/layer-a-static/pipeline/single-file.js', () => ({
  analyzeSingleFile: vi.fn().mockResolvedValue({
    files: {},
    singleFileMode: true
  })
}));

vi.mock('../../../src/layer-a-static/pipeline/phases/atom-extraction-phase.js', () => ({
  AtomExtractionPhase: vi.fn().mockImplementation(() => ({
    execute: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('../../../src/layer-a-static/storage/storage-manager.js', () => ({
  saveAtom: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../../src/layer-a-static/analyzer.js', () => ({
  generateAnalysisReport: vi.fn().mockResolvedValue({
    metadata: {},
    patternDetection: {},
    qualityMetrics: {},
    recommendations: []
  })
}));

vi.mock('../../../core/unified-cache-manager.js', () => ({
  UnifiedCacheManager: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    cleanupDeletedFiles: vi.fn().mockResolvedValue(undefined)
  }))
}));

describe('indexer.js - Expanded Tests', () => {
  let indexProject;

  beforeEach(async () => {
    vi.clearAllMocks();
    const indexer = await import('../../../src/layer-a-static/indexer.js');
    indexProject = indexer.indexProject;
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('indexProject - Basic Functionality', () => {
    it('should return a system map', async () => {
      const result = await indexProject('/test', { verbose: false });
      
      expect(result).toBeDefined();
    });

    it('should accept absolute paths', async () => {
      const { scanProjectFiles } = await import('../../../src/layer-a-static/pipeline/scan.js');
      
      await indexProject('/absolute/path/to/project', { verbose: false });
      
      expect(scanProjectFiles).toHaveBeenCalled();
    });

    it('should accept relative paths and convert to absolute', async () => {
      const { scanProjectFiles } = await import('../../../src/layer-a-static/pipeline/scan.js');
      
      await indexProject('./relative/path', { verbose: false });
      
      expect(scanProjectFiles).toHaveBeenCalled();
    });

    it('should handle verbose option', async () => {
      const result = await indexProject('/test', { verbose: true });
      
      expect(result).toBeDefined();
    });

    it('should handle skipLLM option', async () => {
      const { enhanceSystemMap } = await import('../../../src/layer-a-static/pipeline/enhancers/index.js');
      
      await indexProject('/test', { verbose: false, skipLLM: true });
      
      expect(enhanceSystemMap).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.any(Object),
        expect.any(Boolean),
        true
      );
    });
  });

  describe('indexProject - Pipeline Stages', () => {
    it('should call scanProjectFiles', async () => {
      const { scanProjectFiles } = await import('../../../src/layer-a-static/pipeline/scan.js');
      
      await indexProject('/test', { verbose: false });
      
      expect(scanProjectFiles).toHaveBeenCalledTimes(1);
    });

    it('should call parseFiles with scanned files', async () => {
      const { parseFiles } = await import('../../../src/layer-a-static/pipeline/parse.js');
      
      await indexProject('/test', { verbose: false });
      
      expect(parseFiles).toHaveBeenCalledTimes(1);
    });

    it('should call resolveImports', async () => {
      const { resolveImports } = await import('../../../src/layer-a-static/pipeline/resolve.js');
      
      await indexProject('/test', { verbose: false });
      
      expect(resolveImports).toHaveBeenCalledTimes(1);
    });

    it('should call buildSystemGraph', async () => {
      const { buildSystemGraph } = await import('../../../src/layer-a-static/pipeline/graph.js');
      
      await indexProject('/test', { verbose: false });
      
      expect(buildSystemGraph).toHaveBeenCalledTimes(1);
    });

    it('should save system map to disk', async () => {
      const { saveSystemMap } = await import('../../../src/layer-a-static/pipeline/save.js');
      
      await indexProject('/test', { verbose: false });
      
      expect(saveSystemMap).toHaveBeenCalledTimes(1);
    });
  });

  describe('indexProject - Single File Mode', () => {
    it('should enter single-file mode when singleFile option provided', async () => {
      const { analyzeSingleFile } = await import('../../../src/layer-a-static/pipeline/single-file.js');
      
      await indexProject('/test', { 
        verbose: false, 
        singleFile: 'src/index.js' 
      });
      
      expect(analyzeSingleFile).toHaveBeenCalledWith(
        expect.any(String),
        'src/index.js',
        expect.objectContaining({ verbose: false })
      );
    });

    it('should skip full pipeline in single-file mode', async () => {
      const { scanProjectFiles } = await import('../../../src/layer-a-static/pipeline/scan.js');
      
      await indexProject('/test', { 
        verbose: false, 
        singleFile: 'src/index.js' 
      });
      
      expect(scanProjectFiles).not.toHaveBeenCalled();
    });
  });

  describe('indexProject - Error Handling', () => {
    it('should handle errors in scan stage', async () => {
      const { scanProjectFiles } = await import('../../../src/layer-a-static/pipeline/scan.js');
      scanProjectFiles.mockRejectedValue(new Error('Scan failed'));
      
      await expect(indexProject('/test', { verbose: false }))
        .rejects.toThrow('Scan failed');
    });

    it('should handle errors in parse stage', async () => {
      const { parseFiles } = await import('../../../src/layer-a-static/pipeline/parse.js');
      parseFiles.mockRejectedValue(new Error('Parse failed'));
      
      await expect(indexProject('/test', { verbose: false }))
        .rejects.toThrow('Parse failed');
    });
  });

  describe('indexProject - Cache Management', () => {
    it('should initialize cache manager', async () => {
      const { UnifiedCacheManager } = await import('../../../core/unified-cache-manager.js');
      
      await indexProject('/test', { verbose: false });
      
      expect(UnifiedCacheManager).toHaveBeenCalledWith(expect.any(String));
    });

    it('should cleanup deleted files from cache', async () => {
      const { UnifiedCacheManager } = await import('../../../core/unified-cache-manager.js');
      
      await indexProject('/test', { verbose: false });
      
      const mockInstance = UnifiedCacheManager.mock.results[0].value;
      expect(mockInstance.cleanupDeletedFiles).toHaveBeenCalled();
    });
  });
});
