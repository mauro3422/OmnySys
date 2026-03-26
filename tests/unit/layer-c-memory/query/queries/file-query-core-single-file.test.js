/**
 * @fileoverview Unit tests for file-query/core/single-file.js
 * @module tests/unit/layer-c-memory/query/queries/file-query-core-single-file
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';

import { getFileAnalysis } from '#layer-c/query/queries/file-query/core/single-file.js';

// Hoisted mock - must come BEFORE importing from the mocked module
vi.mock('#layer-c/storage/repository/index.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getRepository: vi.fn()
  };
});

vi.mock('#layer-c/query/queries/file-query/system-map.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getSystemFileSnapshot: vi.fn()
  };
});

vi.mock('#shared/compiler/index.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getSystemMapPersistenceCoverage: vi.fn(),
    repairSystemMapPersistenceCoverage: vi.fn()
  };
});

import { getRepository } from '#layer-c/storage/repository/index.js';
import { getSystemFileSnapshot } from '#layer-c/query/queries/file-query/system-map.js';
import { getSystemMapPersistenceCoverage, repairSystemMapPersistenceCoverage } from '#shared/compiler/index.js';

describe('getFileAnalysis', () => {
  let repo;
  let db;
  const rootPath = 'C:/Dev/OmnySystem';

  beforeEach(() => {
    db = new Database(':memory:');
    // Create minimal schema needed for tests
    db.exec(`
      CREATE TABLE IF NOT EXISTS atoms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        atom_type TEXT NOT NULL DEFAULT 'function',
        type TEXT,
        file_path TEXT NOT NULL,
        line_start INTEGER NOT NULL,
        line_end INTEGER NOT NULL,
        complexity INTEGER,
        lines_of_code INTEGER,
        is_exported BOOLEAN DEFAULT 0,
        is_async BOOLEAN DEFAULT 0,
        archetype_type TEXT,
        archetype TEXT,
        purpose_type TEXT,
        purpose TEXT,
        calls_json TEXT,
        called_by_json TEXT,
        is_removed BOOLEAN DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS files (
        path TEXT PRIMARY KEY,
        last_analyzed TEXT NOT NULL,
        atom_count INTEGER DEFAULT 0,
        total_complexity INTEGER DEFAULT 0,
        total_lines INTEGER DEFAULT 0,
        module_name TEXT,
        imports_json TEXT,
        exports_json TEXT
      );
      CREATE TABLE IF NOT EXISTS system_map_persistence (
        snapshot_id TEXT PRIMARY KEY,
        coverage_percentage REAL,
        is_healthy BOOLEAN DEFAULT 0,
        last_snapshot TEXT
      );
      CREATE TABLE IF NOT EXISTS system_files (
        file_path TEXT PRIMARY KEY,
        semantic_analysis_json TEXT,
        semantic_connections_json TEXT,
        imports_json TEXT,
        last_analyzed TEXT
      );
      CREATE TABLE IF NOT EXISTS file_dependencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_path TEXT NOT NULL,
        target_path TEXT NOT NULL,
        dependency_type TEXT DEFAULT 'import',
        last_analyzed TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_atoms_file_path ON atoms(file_path);
    `);

    repo = {
      db,
      projectPath: rootPath,
      getFile: vi.fn(),
      getByFile: vi.fn()
    };

    getRepository.mockReturnValue(repo);
  });

  describe('path normalization', () => {
    it('normalizes absolute paths to relative', async () => {
      const absolutePath = 'C:/Dev/OmnySystem/src/test.js';

      repo.getFile.mockResolvedValue({
        file_path: 'src/test.js',
        last_analyzed: new Date().toISOString(),
        total_complexity: 20,
        total_lines: 100,
        module_name: 'test',
        imports_json: '[]',
        exports_json: '[]'
      });
      repo.getByFile.mockResolvedValue([]);

      const result = await getFileAnalysis(rootPath, absolutePath);

      expect(result.path).toBe('src/test.js');
      expect(result.file).toBe('src/test.js');
    });

    it('handles paths with backslashes', async () => {
      const backslashPath = 'src\\test.js';

      repo.getFile.mockResolvedValue({
        file_path: 'src/test.js',
        last_analyzed: new Date().toISOString(),
        total_complexity: 20,
        total_lines: 100,
        module_name: 'test',
        imports_json: '[]',
        exports_json: '[]'
      });
      repo.getByFile.mockResolvedValue([]);

      const result = await getFileAnalysis(rootPath, backslashPath);

      expect(result.path).toBe('src/test.js');
    });

    it('removes leading ./ from paths', async () => {
      const relativePath = './src/test.js';

      repo.getFile.mockResolvedValue({
        file_path: 'src/test.js',
        last_analyzed: new Date().toISOString(),
        total_complexity: 20,
        total_lines: 100,
        module_name: 'test',
        imports_json: '[]',
        exports_json: '[]'
      });
      repo.getByFile.mockResolvedValue([]);

      const result = await getFileAnalysis(rootPath, relativePath);

      expect(result.path).toBe('src/test.js');
    });

    it('returns null for empty file path', async () => {
      const result = await getFileAnalysis(rootPath, '');
      expect(result).toBeNull();
    });

    it('returns null for null file path', async () => {
      const result = await getFileAnalysis(rootPath, null);
      expect(result).toBeNull();
    });

    it('returns null for whitespace-only file path', async () => {
      const result = await getFileAnalysis(rootPath, '   ');
      expect(result).toBeNull();
    });
  });

  describe('SQLite data retrieval', () => {
    beforeEach(() => {
      db.prepare(`
        INSERT INTO files (path, last_analyzed, total_complexity, total_lines, module_name, imports_json, exports_json)
        VALUES
          ('src/example.js', datetime('now'), 45, 250, 'example', '["lodash", "axios"]', '["funcA", "funcB"]')
      `).run();

      db.prepare(`
        INSERT INTO atoms (id, name, atom_type, file_path, line_start, line_end, complexity, is_exported, is_async, calls_json, called_by_json, archetype_type, purpose_type, lines_of_code, is_removed)
        VALUES
          ('src_example_js::funcA', 'funcA', 'function', 'src/example.js', 1, 30, 8, 1, 0, '["funcB"]', '["funcC"]', 'core-function', 'business-logic', 30, 0),
          ('src_example_js::funcB', 'funcB', 'arrow', 'src/example.js', 31, 60, 12, 1, 1, '[]', '["funcA"]', 'helper', 'utility', 30, 0),
          ('src_example_js::internalFunc', 'internalFunc', 'function', 'src/example.js', 61, 90, 5, 0, 0, '[]', '["funcA"]', 'dead-function', 'unused', 30, 0)
      `).run();

      repo.getFile = vi.fn().mockResolvedValue({
        file_path: 'src/example.js',
        last_analyzed: new Date().toISOString(),
        total_complexity: 45,
        total_lines: 250,
        module_name: 'example',
        imports_json: '["lodash", "axios"]',
        exports_json: '["funcA", "funcB"]'
      });

      repo.getByFile = vi.fn().mockResolvedValue([
        {
          id: 'src_example_js::funcA',
          name: 'funcA',
          type: 'function',
          filePath: 'src/example.js',
          line: 1,
          lineStart: 1,
          endLine: 30,
          lineEnd: 30,
          complexity: 8,
          isExported: true,
          isAsync: false,
          calls: ['funcB'],
          calledBy: ['funcC'],
          archetype: { type: 'core-function' },
          purpose: 'business-logic',
          linesOfCode: 30,
          parameterCount: 0
        },
        {
          id: 'src_example_js::funcB',
          name: 'funcB',
          type: 'arrow',
          filePath: 'src/example.js',
          line: 31,
          lineStart: 31,
          endLine: 60,
          lineEnd: 60,
          complexity: 12,
          isExported: true,
          isAsync: true,
          calls: [],
          calledBy: ['funcA'],
          archetype: { type: 'helper' },
          purpose: 'utility',
          linesOfCode: 30,
          parameterCount: 0
        },
        {
          id: 'src_example_js::internalFunc',
          name: 'internalFunc',
          type: 'function',
          filePath: 'src/example.js',
          line: 61,
          lineStart: 61,
          endLine: 90,
          lineEnd: 90,
          complexity: 5,
          isExported: false,
          isAsync: false,
          calls: [],
          calledBy: ['funcA'],
          archetype: { type: 'dead-function' },
          purpose: 'unused',
          linesOfCode: 30,
          parameterCount: 0
        }
      ]);
    });

    it('returns complete file analysis', async () => {
      const result = await getFileAnalysis(rootPath, 'src/example.js');

      expect(result).toHaveProperty('file', 'src/example.js');
      expect(result).toHaveProperty('path', 'src/example.js');
      expect(result).toHaveProperty('atomCount');
      expect(result).toHaveProperty('totalComplexity');
      expect(result).toHaveProperty('totalLines');
      expect(result).toHaveProperty('moduleName');
      expect(result).toHaveProperty('imports');
      expect(result).toHaveProperty('exports');
      expect(result).toHaveProperty('atoms');
      expect(result).toHaveProperty('compilerSignals');
      expect(result).toHaveProperty('definitions');
    });

    it('retrieves file metadata from SQLite', async () => {
      const result = await getFileAnalysis(rootPath, 'src/example.js');

      expect(result.totalComplexity).toBe(45);
      expect(result.totalLines).toBe(250);
      expect(result.moduleName).toBe('example');
    });

    it('parses imports from JSON', async () => {
      const result = await getFileAnalysis(rootPath, 'src/example.js');

      expect(Array.isArray(result.imports)).toBe(true);
      expect(result.imports).toContain('lodash');
      expect(result.imports).toContain('axios');
    });

    it('retrieves atoms from database', async () => {
      const result = await getFileAnalysis(rootPath, 'src/example.js');

      expect(result.atomCount).toBe(3);
      expect(Array.isArray(result.atoms)).toBe(true);
    });

    it('maps atom properties correctly', async () => {
      const result = await getFileAnalysis(rootPath, 'src/example.js');

      const funcA = result.atoms.find(a => a.name === 'funcA');
      expect(funcA).toBeDefined();
      expect(funcA.type).toBe('function');
      expect(funcA.complexity).toBe(8);
      expect(funcA.isExported).toBe(true);
      expect(funcA.isAsync).toBe(false);
      expect(funcA.calls).toEqual(['funcB']);
      expect(funcA.calledBy).toEqual(['funcC']);
      expect(funcA.archetype).toEqual({ type: 'core-function' });
      expect(funcA.purpose).toBe('business-logic');
    });

    it('includes compiler evaluation for each atom', async () => {
      const result = await getFileAnalysis(rootPath, 'src/example.js');

      const funcA = result.atoms.find(a => a.name === 'funcA');
      expect(funcA.compilerEvaluation).toBeDefined();
    });

    it('builds definitions list from atoms', async () => {
      const result = await getFileAnalysis(rootPath, 'src/example.js');

      expect(Array.isArray(result.definitions)).toBe(true);
      expect(result.definitions.length).toBe(3);

      const funcADef = result.definitions.find(d => d.name === 'funcA');
      expect(funcADef).toHaveProperty('type', 'function');
      expect(funcADef).toHaveProperty('line');
    });

    it('includes compiler signals summary', async () => {
      const result = await getFileAnalysis(rootPath, 'src/example.js');

      expect(result.compilerSignals).toHaveProperty('testability');
      expect(result.compilerSignals).toHaveProperty('semanticPurity');
    });
  });

  describe('export collection', () => {
    beforeEach(() => {
      db.prepare(`
        INSERT INTO files (path, last_analyzed, total_complexity, total_lines, module_name, imports_json, exports_json)
        VALUES
          ('src/exports.js', datetime('now'), 30, 150, 'exports', '[]', '["dbExport1", "dbExport2"]')
      `).run();

      db.prepare(`
        INSERT INTO atoms (id, name, atom_type, file_path, line_start, line_end, complexity, is_exported, is_removed)
        VALUES
          ('src_exports_js::atomExport', 'atomExport', 'function', 'src/exports.js', 1, 30, 8, 1, 0),
          ('src_exports_js::internalFunc', 'internalFunc', 'function', 'src/exports.js', 31, 60, 5, 0, 0)
      `).run();

      repo.getFile = vi.fn().mockResolvedValue({
        file_path: 'src/exports.js',
        last_analyzed: new Date().toISOString(),
        total_complexity: 30,
        total_lines: 150,
        module_name: 'exports',
        imports_json: '[]',
        exports_json: '["dbExport1", "dbExport2"]'
      });

      repo.getByFile = vi.fn().mockResolvedValue([
        {
          id: 'src_exports_js::atomExport',
          name: 'atomExport',
          type: 'function',
          filePath: 'src/exports.js',
          line: 1,
          lineStart: 1,
          endLine: 30,
          lineEnd: 30,
          complexity: 8,
          isExported: true,
          calls: [],
          calledBy: [],
          linesOfCode: 30,
          parameterCount: 0
        },
        {
          id: 'src_exports_js::internalFunc',
          name: 'internalFunc',
          type: 'function',
          filePath: 'src/exports.js',
          line: 31,
          lineStart: 31,
          endLine: 60,
          lineEnd: 60,
          complexity: 5,
          isExported: false,
          calls: [],
          calledBy: [],
          linesOfCode: 30,
          parameterCount: 0
        }
      ]);
    });

    it('prefers atom exports over database exports when available', async () => {
      const result = await getFileAnalysis(rootPath, 'src/exports.js');

      expect(result.exports).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'atomExport', kind: 'function' })
        ])
      );
    });

    it('falls back to database exports when no atom exports exist', async () => {
      db.prepare(`
        UPDATE atoms SET is_exported = 0 WHERE file_path = 'src/exports.js'
      `).run();

      repo.getByFile = vi.fn().mockResolvedValue([
        {
          id: 'src_exports_js::atomExport',
          name: 'atomExport',
          type: 'function',
          filePath: 'src/exports.js',
          line: 1,
          lineStart: 1,
          endLine: 30,
          lineEnd: 30,
          complexity: 8,
          isExported: false,
          calls: [],
          calledBy: [],
          linesOfCode: 30,
          parameterCount: 0
        },
        {
          id: 'src_exports_js::internalFunc',
          name: 'internalFunc',
          type: 'function',
          filePath: 'src/exports.js',
          line: 31,
          lineStart: 31,
          endLine: 60,
          lineEnd: 60,
          complexity: 5,
          isExported: false,
          calls: [],
          calledBy: [],
          linesOfCode: 30,
          parameterCount: 0
        }
      ]);

      const result = await getFileAnalysis(rootPath, 'src/exports.js');

      expect(result.exports).toEqual(['dbExport1', 'dbExport2']);
    });
  });

  describe('system map enrichment', () => {
    beforeEach(() => {
      db.prepare(`
        INSERT INTO files (path, last_analyzed, total_complexity, total_lines, module_name, imports_json, exports_json)
        VALUES
          ('src/enriched.js', datetime('now'), 40, 200, 'enriched', '["src/other.js"]', '[]'),
          ('src/other.js', datetime('now'), 20, 100, 'other', '[]', '[]')
      `).run();

      db.prepare(`
        INSERT INTO atoms (id, name, atom_type, file_path, line_start, line_end, complexity, is_removed)
        VALUES
          ('src_enriched_js::func', 'func', 'function', 'src/enriched.js', 1, 30, 10, 0)
      `).run();

      db.prepare(`
        INSERT INTO system_map_persistence (snapshot_id, coverage_percentage, is_healthy, last_snapshot)
        VALUES
          ('snapshot-1', 85, 1, datetime('now'))
      `).run();

      db.prepare(`
        INSERT INTO system_files (file_path, semantic_analysis_json, semantic_connections_json, imports_json, last_analyzed)
        VALUES
          ('src/enriched.js', '{"purity": 0.8}', '[{"target": "src/other.js", "type": "shares_state"}]', '["src/other.js"]', datetime('now')),
          ('src/other.js', '{}', '[]', '[]', datetime('now'))
      `).run();

      db.prepare(`
        INSERT INTO file_dependencies (source_path, target_path, dependency_type, last_analyzed)
        VALUES
          ('src/enriched.js', 'src/other.js', 'import', datetime('now'))
      `).run();

      repo.getFile = vi.fn().mockResolvedValue({
        file_path: 'src/enriched.js',
        last_analyzed: new Date().toISOString(),
        total_complexity: 40,
        total_lines: 200,
        module_name: 'enriched',
        imports_json: '[]',
        exports_json: '[]'
      });

      repo.getByFile = vi.fn().mockResolvedValue([
        {
          id: 'src_enriched_js::func',
          name: 'func',
          type: 'function',
          filePath: 'src/enriched.js',
          line: 1,
          lineStart: 1,
          endLine: 30,
          lineEnd: 30,
          complexity: 10,
          isExported: false,
          calls: [],
          calledBy: [],
          linesOfCode: 30,
          parameterCount: 0
        }
      ]);

      getSystemFileSnapshot.mockResolvedValue({
        semanticAnalysis: { purity: 0.8 },
        semanticConnections: [{ target: 'src/other.js', type: 'shares_state' }]
      });

      getSystemMapPersistenceCoverage.mockReturnValue({
        filesTotal: 2,
        activeFiles: 2,
        primaryFilesWithImports: 1,
        liveAtomFiles: 1,
        phase2PendingAtoms: 0,
        systemFilesTotal: 2,
        systemFilesWithImports: 1,
        fileDependenciesTotal: 1,
        dependencySourceFiles: 1,
        importBackedFileRatio: 0.5,
        mirroredImportCoverageRatio: 1,
        dependencySourceCoverageRatio: 1,
        healthy: true,
        issues: []
      });

      repairSystemMapPersistenceCoverage.mockReturnValue({
        repaired: false,
        inserted: 0,
        sources: 0,
        dependencies: 0,
        semanticConnections: 0
      });
    });

    it('includes system map coverage when healthy', async () => {
      getSystemFileSnapshot.mockResolvedValue({
        semanticAnalysis: { purity: 0.8 },
        semanticConnections: [{ target: 'src/other.js', type: 'shares_state' }]
      });

      const result = await getFileAnalysis(rootPath, 'src/enriched.js');

      expect(result).toHaveProperty('systemMapCoverage');
      expect(result.systemMapCoverage).toHaveProperty('healthy', true);
    });

    it('includes semantic analysis from system_files', async () => {
      getSystemFileSnapshot.mockResolvedValue({
        semanticAnalysis: { purity: 0.8 },
        semanticConnections: [{ target: 'src/other.js', type: 'shares_state' }]
      });

      const result = await getFileAnalysis(rootPath, 'src/enriched.js');

      expect(result).toHaveProperty('semanticAnalysis');
      expect(result.semanticAnalysis).toEqual({ purity: 0.8 });
    });

    it('includes semantic connections from system_files', async () => {
      getSystemFileSnapshot.mockResolvedValue({
        semanticAnalysis: { purity: 0.8 },
        semanticConnections: [{ target: 'src/other.js', type: 'shares_state' }]
      });

      const result = await getFileAnalysis(rootPath, 'src/enriched.js');

      expect(result).toHaveProperty('semanticConnections');
      expect(Array.isArray(result.semanticConnections)).toBe(true);
      expect(result.semanticConnections[0]).toHaveProperty('target', 'src/other.js');
    });

    it('sets systemMapTrustworthy to true when coverage is healthy', async () => {
      getSystemFileSnapshot.mockResolvedValue({
        semanticAnalysis: { purity: 0.8 },
        semanticConnections: [{ target: 'src/other.js', type: 'shares_state' }]
      });

      const result = await getFileAnalysis(rootPath, 'src/enriched.js');

      expect(result.systemMapTrustworthy).toBe(true);
    });

    it('handles missing system_files gracefully', async () => {
      db.prepare(`DELETE FROM system_files WHERE file_path = 'src/enriched.js'`).run();
      getSystemFileSnapshot.mockResolvedValue(null);
      getSystemMapPersistenceCoverage.mockReturnValue({
        filesTotal: 1,
        activeFiles: 1,
        primaryFilesWithImports: 0,
        liveAtomFiles: 1,
        phase2PendingAtoms: 0,
        systemFilesTotal: 1,
        systemFilesWithImports: 0,
        fileDependenciesTotal: 0,
        dependencySourceFiles: 0,
        importBackedFileRatio: 0,
        mirroredImportCoverageRatio: 0,
        dependencySourceCoverageRatio: 0,
        healthy: true,
        issues: []
      });

      const result = await getFileAnalysis(rootPath, 'src/enriched.js');

      expect(result.semanticAnalysis).toEqual({});
      expect(result.semanticConnections).toEqual([]);
    });

    it('repairs system map coverage when unhealthy', async () => {
      db.prepare(`
        UPDATE system_map_persistence SET coverage_percentage = 30, is_healthy = 0
      `).run();
      getSystemFileSnapshot.mockResolvedValue({
        semanticAnalysis: { purity: 0.8 },
        semanticConnections: []
      });

      const result = await getFileAnalysis(rootPath, 'src/enriched.js');

      expect(result).toHaveProperty('systemMapCoverage');
    });

    it('sets systemMapTrustworthy to false when coverage is unhealthy', async () => {
      db.prepare(`
        UPDATE system_map_persistence SET coverage_percentage = 30, is_healthy = 0
      `).run();
      db.prepare(`DELETE FROM system_files`).run();
      getSystemFileSnapshot.mockResolvedValue(null);
      getSystemMapPersistenceCoverage.mockReturnValue({
        filesTotal: 1,
        activeFiles: 1,
        primaryFilesWithImports: 0,
        liveAtomFiles: 1,
        phase2PendingAtoms: 0,
        systemFilesTotal: 0,
        systemFilesWithImports: 0,
        fileDependenciesTotal: 0,
        dependencySourceFiles: 0,
        importBackedFileRatio: 0,
        mirroredImportCoverageRatio: 0,
        dependencySourceCoverageRatio: 0,
        healthy: false,
        issues: ['system_files is empty while files metadata exists']
      });

      const result = await getFileAnalysis(rootPath, 'src/enriched.js');

      expect(result.systemMapTrustworthy).toBe(false);
    });
  });

  describe('error handling', () => {
    it('returns null when file not found in database', async () => {
      const result = await getFileAnalysis(rootPath, 'src/nonexistent.js');
      expect(result).toBeNull();
    });

    it('throws error when SQLite is not available', async () => {
      getRepository.mockReturnValue(null);

      await expect(getFileAnalysis(rootPath, 'src/test.js')).rejects.toThrow('SQLite not available');
    });

    it('throws error with SQLite error message on failure', async () => {
      repo.getFile.mockRejectedValue(new Error('Database corrupted'));

      await expect(getFileAnalysis(rootPath, 'src/test.js')).rejects.toThrow('[getFileAnalysis] SQLite error: Database corrupted');
    });
  });

  describe('backward compatibility', () => {
    beforeEach(() => {
      db.prepare(`
        INSERT INTO files (path, last_analyzed, total_complexity, total_lines, module_name, imports_json, exports_json)
        VALUES
          ('src/legacy.js', datetime('now'), 25, 120, 'legacy', '[]', '[]')
      `).run();

      // Legacy atom format with alternative field names
      db.prepare(`
        INSERT INTO atoms (id, name, atom_type, type, file_path, line_start, line_end, complexity, is_exported, calls_json, called_by_json, archetype_type, archetype, purpose_type, purpose, lines_of_code, is_removed)
        VALUES
          ('src_legacy_js::legacyFunc', 'legacyFunc', 'function', 'arrow', 'src/legacy.js', 1, 30, 8, 1, '["other"]', '["caller"]', 'core', 'helper', 'business', 'utility', 30, 0)
      `).run();

      repo.getFile = vi.fn().mockResolvedValue({
        file_path: 'src/legacy.js',
        last_analyzed: new Date().toISOString(),
        total_complexity: 25,
        total_lines: 120,
        module_name: 'legacy',
        imports_json: '[]',
        exports_json: '[]'
      });

      repo.getByFile = vi.fn().mockResolvedValue([
        {
          id: 'src_legacy_js::legacyFunc',
          name: 'legacyFunc',
          type: 'arrow',
          filePath: 'src/legacy.js',
          line: 1,
          lineStart: 1,
          endLine: 30,
          lineEnd: 30,
          complexity: 8,
          isExported: true,
          calls: ['other'],
          calledBy: ['caller'],
          archetype: { type: 'core' },
          purpose: 'business',
          linesOfCode: 30,
          parameterCount: 0
        }
      ]);
    });

    it('handles atoms with type field instead of atom_type', async () => {
      const result = await getFileAnalysis(rootPath, 'src/legacy.js');

      const legacyFunc = result.atoms.find(a => a.name === 'legacyFunc');
      expect(legacyFunc.type).toBeDefined();
    });

    it('handles atoms with archetype field instead of archetype_type', async () => {
      const result = await getFileAnalysis(rootPath, 'src/legacy.js');

      const legacyFunc = result.atoms.find(a => a.name === 'legacyFunc');
      expect(legacyFunc.archetype).toBeDefined();
    });

    it('handles atoms with purpose field instead of purpose_type', async () => {
      const result = await getFileAnalysis(rootPath, 'src/legacy.js');

      const legacyFunc = result.atoms.find(a => a.name === 'legacyFunc');
      expect(legacyFunc.purpose).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('handles file with no atoms', async () => {
      db.prepare(`
        INSERT INTO files (path, last_analyzed, total_complexity, total_lines, module_name, imports_json, exports_json)
        VALUES
          ('src/empty.js', datetime('now'), 0, 50, 'empty', '[]', '[]')
      `).run();

      repo.getFile = vi.fn().mockResolvedValue({
        file_path: 'src/empty.js',
        last_analyzed: new Date().toISOString(),
        total_complexity: 0,
        total_lines: 50,
        module_name: 'empty',
        imports_json: '[]',
        exports_json: '[]'
      });

      repo.getByFile = vi.fn().mockResolvedValue([]);

      const result = await getFileAnalysis(rootPath, 'src/empty.js');

      expect(result.atomCount).toBe(0);
      expect(result.atoms).toEqual([]);
    });

    it('handles null values in atom data', async () => {
      db.prepare(`
        INSERT INTO files (path, last_analyzed, total_complexity, total_lines, module_name, imports_json, exports_json)
        VALUES
          ('src/nulls.js', datetime('now'), 10, 50, 'nulls', '[]', '[]')
      `).run();

      db.prepare(`
        INSERT INTO atoms (id, name, atom_type, file_path, line_start, line_end, complexity, is_exported, calls_json, called_by_json, is_removed)
        VALUES
          ('src_nulls_js::nullFunc', 'nullFunc', 'function', 'src/nulls.js', 1, 30, null, null, null, null, 0)
      `).run();

      repo.getFile = vi.fn().mockResolvedValue({
        file_path: 'src/nulls.js',
        last_analyzed: new Date().toISOString(),
        total_complexity: 10,
        total_lines: 50,
        module_name: 'nulls',
        imports_json: '[]',
        exports_json: '[]'
      });

      repo.getByFile = vi.fn().mockResolvedValue([
        {
          id: 'src_nulls_js::nullFunc',
          name: 'nullFunc',
          type: 'function',
          filePath: 'src/nulls.js',
          line: 1,
          lineStart: 1,
          endLine: 30,
          lineEnd: 30,
          complexity: null,
          isExported: null,
          calls: null,
          calledBy: null,
          linesOfCode: 30,
          parameterCount: 0
        }
      ]);

      const result = await getFileAnalysis(rootPath, 'src/nulls.js');

      const nullFunc = result.atoms.find(a => a.name === 'nullFunc');
      expect(nullFunc).toBeDefined();
      expect(nullFunc.complexity).toBe(0);
      expect(nullFunc.isExported).toBe(false);
    });

    it('handles malformed JSON in atom fields', async () => {
      db.prepare(`
        INSERT INTO files (path, last_analyzed, total_complexity, total_lines, module_name, imports_json, exports_json)
        VALUES
          ('src/malformed.js', datetime('now'), 10, 50, 'malformed', '[]', '[]')
      `).run();

      db.prepare(`
        INSERT INTO atoms (id, name, atom_type, file_path, line_start, line_end, complexity, is_exported, calls_json, called_by_json, is_removed)
        VALUES
          ('src_malformed_js::badJson', 'badJson', 'function', 'src/malformed.js', 1, 30, 5, 0, 'not valid json', 'also invalid', 0)
      `).run();

      repo.getFile = vi.fn().mockResolvedValue({
        file_path: 'src/malformed.js',
        last_analyzed: new Date().toISOString(),
        total_complexity: 10,
        total_lines: 50,
        module_name: 'malformed',
        imports_json: '[]',
        exports_json: '[]'
      });

      repo.getByFile = vi.fn().mockResolvedValue([
        {
          id: 'src_malformed_js::badJson',
          name: 'badJson',
          type: 'function',
          filePath: 'src/malformed.js',
          line: 1,
          lineStart: 1,
          endLine: 30,
          lineEnd: 30,
          complexity: 5,
          isExported: false,
          calls: 'not valid json',
          calledBy: 'also invalid',
          linesOfCode: 30,
          parameterCount: 0
        }
      ]);

      const result = await getFileAnalysis(rootPath, 'src/malformed.js');

      const badFunc = result.atoms.find(a => a.name === 'badJson');
      expect(badFunc.calls).toEqual([]);
      expect(badFunc.calledBy).toEqual([]);
    });
  });
});
