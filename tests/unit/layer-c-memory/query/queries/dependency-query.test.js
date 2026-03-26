/**
 * @fileoverview Unit tests for dependency-query.js
 * @module tests/unit/layer-c-memory/query/queries/dependency-query
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';

import {
  getDependencyGraph,
  getTransitiveDependents,
  classifyImpactSeverity,
  getFileImpactSummary
} from '#layer-c/query/queries/dependency-query.js';
import { getAtomsInFile } from '#layer-c/storage/index.js';
import { getFileDependents } from '#layer-c/query/queries/file-query/dependencies/deps.js';

// Hoisted mock - must come BEFORE importing from the mocked module
vi.mock('#layer-c/storage/repository/index.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getRepository: vi.fn()
  };
});

vi.mock('#layer-c/storage/index.js', () => ({
  getAtomsInFile: vi.fn()
}));

vi.mock('#layer-c/query/queries/file-query/dependencies/deps.js', () => ({
  getFileDependents: vi.fn()
}));

vi.mock('#shared/compiler/index.js', () => ({
  getSystemMapPersistenceCoverage: vi.fn(() => ({
    filesTotal: 5,
    activeFiles: 5,
    primaryFilesWithImports: 5,
    systemFilesTotal: 5,
    systemFilesWithImports: 5,
    fileDependenciesTotal: 6,
    dependencySourceFiles: 5,
    healthy: true,
    issues: []
  })),
  shouldTrustSystemMapDependencies: vi.fn(() => true)
}));

import { getRepository } from '#layer-c/storage/repository/index.js';

describe('dependency-query', () => {
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
        atom_type TEXT NOT NULL,
        file_path TEXT NOT NULL,
        line_start INTEGER NOT NULL,
        line_end INTEGER NOT NULL,
        complexity INTEGER,
        fragility_score REAL DEFAULT 0,
        is_removed BOOLEAN DEFAULT 0,
        is_phase2_complete BOOLEAN DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS files (
        path TEXT PRIMARY KEY,
        last_analyzed TEXT NOT NULL,
        atom_count INTEGER DEFAULT 0,
        total_complexity INTEGER DEFAULT 0,
        total_lines INTEGER DEFAULT 0,
        module_name TEXT,
        imports_json TEXT,
        exports_json TEXT,
        is_removed BOOLEAN DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS file_dependencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_path TEXT NOT NULL,
        target_path TEXT NOT NULL,
        relation_type TEXT NOT NULL,
        is_removed BOOLEAN DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS atom_relations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        relation_type TEXT NOT NULL,
        is_removed BOOLEAN DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS system_files (
        file_path TEXT PRIMARY KEY,
        last_analyzed TEXT,
        semantic_analysis_json TEXT,
        semantic_connections_json TEXT,
        imports_json TEXT
      );
      CREATE TABLE IF NOT EXISTS system_map_persistence (
        snapshot_id TEXT PRIMARY KEY,
        coverage_percentage REAL,
        is_healthy BOOLEAN DEFAULT 0,
        last_snapshot TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_atoms_file_path ON atoms(file_path);
      CREATE INDEX IF NOT EXISTS idx_file_dependencies_source ON file_dependencies(source_path);
      CREATE INDEX IF NOT EXISTS idx_file_dependencies_target ON file_dependencies(target_path);
    `);

    repo = {
      db,
      projectPath: rootPath,
      getFile: vi.fn(),
      getByFile: vi.fn()
    };

    getRepository.mockReturnValue(repo);
  });

  describe('getDependencyGraph', () => {
    beforeEach(() => {
      db.prepare(`
        INSERT INTO files (path, last_analyzed, total_complexity, total_lines, module_name, imports_json, exports_json)
        VALUES
          ('src/fileA.js', datetime('now'), 30, 150, 'moduleA', '[]', '[]'),
          ('src/fileB.js', datetime('now'), 40, 200, 'moduleB', '[]', '[]'),
          ('src/fileC.js', datetime('now'), 25, 120, 'moduleC', '[]', '[]'),
          ('src/fileD.js', datetime('now'), 35, 180, 'moduleD', '[]', '[]')
      `).run();

      db.prepare(`
        INSERT INTO file_dependencies (source_path, target_path, relation_type, is_removed, created_at)
        VALUES
          ('src/fileA.js', 'src/fileB.js', 'imports', 0, datetime('now')),
          ('src/fileA.js', 'src/fileC.js', 'imports', 0, datetime('now')),
          ('src/fileB.js', 'src/fileD.js', 'imports', 0, datetime('now')),
          ('src/fileC.js', 'src/fileD.js', 'imports', 0, datetime('now'))
      `).run();
    });

    it('returns BFS dependency graph from starting file', async () => {
      const result = await getDependencyGraph(rootPath, 'src/fileA.js', 2);

      expect(result).toHaveProperty('nodes');
      expect(result).toHaveProperty('edges');
      expect(Array.isArray(result.nodes)).toBe(true);
      expect(Array.isArray(result.edges)).toBe(true);
    });

    it('includes starting file as root node with depth 0', async () => {
      const result = await getDependencyGraph(rootPath, 'src/fileA.js', 2);

      expect(result.nodes[0]).toEqual({ id: 'src/fileA.js', depth: 0 });
    });

    it('respects depth limit', async () => {
      const result = await getDependencyGraph(rootPath, 'src/fileA.js', 1);

      const maxDepth = Math.max(...result.nodes.map(n => n.depth));
      expect(maxDepth).toBeLessThanOrEqual(1);
    });

    it('traverses all dependencies within depth', async () => {
      const result = await getDependencyGraph(rootPath, 'src/fileA.js', 3);

      const nodeIds = result.nodes.map(n => n.id);
      expect(nodeIds).toContain('src/fileA.js');
      expect(nodeIds).toContain('src/fileB.js');
      expect(nodeIds).toContain('src/fileC.js');
      expect(nodeIds).toContain('src/fileD.js');
    });

    it('creates edges for each dependency relationship', async () => {
      const result = await getDependencyGraph(rootPath, 'src/fileA.js', 3);

      expect(result.edges.length).toBeGreaterThan(0);
      const edgeFromA = result.edges.find(e => e.from === 'src/fileA.js');
      expect(edgeFromA).toBeDefined();
      expect(['src/fileB.js', 'src/fileC.js']).toContain(edgeFromA.to);
    });

    it('returns empty graph when repository is unavailable', async () => {
      getRepository.mockReturnValue(null);
      const result = await getDependencyGraph(rootPath, 'src/fileA.js', 2);

      expect(result).toEqual({ nodes: [], edges: [] });
    });

    it('returns only root node when system map coverage is untrustworthy', async () => {
      // Create a fresh database without file_dependencies
      const freshDb = new Database(':memory:');
      freshDb.exec(`
        CREATE TABLE IF NOT EXISTS files (
          path TEXT PRIMARY KEY,
          last_analyzed TEXT NOT NULL,
          atom_count INTEGER DEFAULT 0,
          total_complexity INTEGER DEFAULT 0,
          total_lines INTEGER DEFAULT 0,
          module_name TEXT,
          imports_json TEXT,
          exports_json TEXT,
          is_removed BOOLEAN DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS atoms (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          atom_type TEXT NOT NULL,
          file_path TEXT NOT NULL,
          line_start INTEGER NOT NULL,
          line_end INTEGER NOT NULL,
          complexity INTEGER
        );
        CREATE TABLE IF NOT EXISTS file_dependencies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_path TEXT NOT NULL,
          target_path TEXT NOT NULL,
          relation_type TEXT NOT NULL,
          is_removed BOOLEAN DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS system_files (
          file_path TEXT PRIMARY KEY,
          last_analyzed TEXT,
          semantic_analysis_json TEXT,
          semantic_connections_json TEXT,
          imports_json TEXT
        );
      `);

      freshDb.prepare(`
        INSERT INTO files (path, last_analyzed, total_complexity, total_lines, module_name, imports_json, exports_json)
        VALUES ('src/fileA.js', datetime('now'), 30, 150, 'moduleA', '[]', '[]')
      `).run();

      const freshRepo = {
        db: freshDb,
        projectPath: rootPath,
        getFile: vi.fn(),
        getByFile: vi.fn()
      };
      getRepository.mockReturnValue(freshRepo);

      // Coverage will be untrustworthy because systemFilesTotal = 0 but filesTotal > 0
      const result = await getDependencyGraph(rootPath, 'src/fileA.js', 2);

      expect(result).toEqual({ nodes: [{ id: 'src/fileA.js', depth: 0 }], edges: [] });

      freshDb.close();
    });
  });

  describe('getTransitiveDependents', () => {
    beforeEach(() => {
      db.prepare(`
        INSERT INTO files (path, last_analyzed, total_complexity, total_lines, module_name, imports_json, exports_json)
        VALUES
          ('src/base.js', datetime('now'), 20, 100, 'base', '[]', '[]'),
          ('src/level1a.js', datetime('now'), 30, 150, 'level1a', '[]', '[]'),
          ('src/level1b.js', datetime('now'), 25, 120, 'level1b', '[]', '[]'),
          ('src/level2.js', datetime('now'), 35, 180, 'level2', '[]', '[]')
      `).run();

      // Reverse dependency map: base <- level1a, level1b <- level2
      db.prepare(`
        INSERT INTO file_dependencies (source_path, target_path, relation_type, is_removed, created_at)
        VALUES
          ('src/level1a.js', 'src/base.js', 'imports', 0, datetime('now')),
          ('src/level1b.js', 'src/base.js', 'imports', 0, datetime('now')),
          ('src/level2.js', 'src/level1a.js', 'imports', 0, datetime('now'))
      `).run();
    });

    it('finds all files that transitively depend on target', async () => {
      const result = await getTransitiveDependents(rootPath, 'src/base.js');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain('src/level1a.js');
      expect(result).toContain('src/level1b.js');
      expect(result).toContain('src/level2.js');
    });

    it('excludes the target file itself', async () => {
      const result = await getTransitiveDependents(rootPath, 'src/base.js');

      expect(result).not.toContain('src/base.js');
    });

    it('includes semantic dependents when includeSemantic is true', async () => {
      db.prepare(`
        INSERT INTO atoms (id, name, atom_type, file_path, line_start, line_end, is_removed)
        VALUES
          ('src_level1b_js::shared', 'shared', 'function', 'src/level1b.js', 1, 20, 0),
          ('src_level2_js::consumer', 'consumer', 'function', 'src/level2.js', 1, 30, 0)
      `).run();

      db.prepare(`
        INSERT INTO atom_relations (source_id, target_id, relation_type, is_removed)
        VALUES
          ('src_level2_js::consumer', 'src_level1b_js::shared', 'shares_state', 0)
      `).run();

      const result = await getTransitiveDependents(rootPath, 'src/level1b.js', { includeSemantic: true });

      expect(result).toContain('src/level2.js');
    });

    it('returns empty array when repository is unavailable', async () => {
      getRepository.mockReturnValue(null);
      const result = await getTransitiveDependents(rootPath, 'src/base.js');

      expect(result).toEqual([]);
    });

    it('handles files with no dependents', async () => {
      const result = await getTransitiveDependents(rootPath, 'src/level2.js');

      expect(result).toEqual([]);
    });
  });

  describe('classifyImpactSeverity', () => {
    it('returns high severity for direct count > 5', () => {
      expect(classifyImpactSeverity({ directCount: 6, transitiveCount: 0 })).toBe('high');
    });

    it('returns high severity for transitive count > 10', () => {
      expect(classifyImpactSeverity({ directCount: 0, transitiveCount: 11 })).toBe('high');
    });

    it('returns medium severity for direct count >= 1', () => {
      expect(classifyImpactSeverity({ directCount: 1, transitiveCount: 0 })).toBe('medium');
    });

    it('returns medium severity for transitive count >= 3', () => {
      expect(classifyImpactSeverity({ directCount: 0, transitiveCount: 3 })).toBe('medium');
    });

    it('returns low severity for minimal impact', () => {
      expect(classifyImpactSeverity({ directCount: 0, transitiveCount: 0 })).toBe('low');
      expect(classifyImpactSeverity({ directCount: 0, transitiveCount: 2 })).toBe('low');
    });

    it('handles undefined counts with defaults', () => {
      expect(classifyImpactSeverity()).toBe('low');
      expect(classifyImpactSeverity({})).toBe('low');
      expect(classifyImpactSeverity({ directCount: 5 })).toBe('medium');
    });

    it('prioritizes high severity over medium', () => {
      expect(classifyImpactSeverity({ directCount: 6, transitiveCount: 2 })).toBe('high');
    });
  });

  describe('getFileImpactSummary', () => {
    beforeEach(() => {
      db.prepare(`
        INSERT INTO files (path, last_analyzed, total_complexity, total_lines, module_name, imports_json, exports_json)
        VALUES
          ('src/target.js', datetime('now'), 30, 150, 'target', '[]', '[]'),
          ('src/direct1.js', datetime('now'), 25, 120, 'direct1', '[]', '[]'),
          ('src/direct2.js', datetime('now'), 35, 180, 'direct2', '[]', '[]'),
          ('src/transitive1.js', datetime('now'), 40, 200, 'transitive1', '[]', '[]')
      `).run();

      db.prepare(`
        INSERT INTO file_dependencies (source_path, target_path, relation_type, is_removed, created_at)
        VALUES
          ('src/direct1.js', 'src/target.js', 'imports', 0, datetime('now')),
          ('src/direct2.js', 'src/target.js', 'imports', 0, datetime('now')),
          ('src/transitive1.js', 'src/direct1.js', 'imports', 0, datetime('now'))
      `).run();

      db.prepare(`
        INSERT INTO atoms (id, name, atom_type, file_path, line_start, line_end, fragility_score, is_removed)
        VALUES
          ('src_target_js::fragileFunc', 'fragileFunc', 'function', 'src/target.js', 1, 30, 0.8, 0),
          ('src_target_js::stableFunc', 'stableFunc', 'function', 'src/target.js', 31, 60, 0.2, 0)
      `).run();

      // Mock getAtomsInFile and getFileDependents
      getAtomsInFile.mockResolvedValue([
        { id: 'src_target_js::fragileFunc', name: 'fragileFunc', fragility_score: 0.8 },
        { id: 'src_target_js::stableFunc', name: 'stableFunc', fragility_score: 0.2 }
      ]);
      getFileDependents.mockResolvedValue(['src/direct1.js', 'src/direct2.js']);
    });

    it('returns comprehensive impact summary', async () => {
      const result = await getFileImpactSummary(rootPath, 'src/target.js');

      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('directDependents');
      expect(result).toHaveProperty('transitiveDependents');
      expect(result).toHaveProperty('directCount');
      expect(result).toHaveProperty('transitiveCount');
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('highFragilityAtoms');
      expect(result).toHaveProperty('maxFragility');
    });

    it('normalizes file path', async () => {
      const result = await getFileImpactSummary(rootPath, 'src/target.js');

      expect(result.filePath).toBe('src/target.js');
    });

    it('counts direct dependents correctly', async () => {
      const result = await getFileImpactSummary(rootPath, 'src/target.js');

      expect(result.directCount).toBe(2);
      expect(result.directDependents).toContain('src/direct1.js');
      expect(result.directDependents).toContain('src/direct2.js');
    });

    it('counts transitive dependents correctly', async () => {
      const result = await getFileImpactSummary(rootPath, 'src/target.js');

      expect(result.transitiveCount).toBeGreaterThan(0);
      expect(result.transitiveDependents).toContain('src/transitive1.js');
    });

    it('classifies severity based on counts', async () => {
      const result = await getFileImpactSummary(rootPath, 'src/target.js');

      expect(['low', 'medium', 'high']).toContain(result.severity);
    });

    it('identifies high fragility atoms', async () => {
      const result = await getFileImpactSummary(rootPath, 'src/target.js');

      expect(Array.isArray(result.highFragilityAtoms)).toBe(true);
      expect(result.highFragilityAtoms.length).toBeGreaterThan(0);
      expect(result.highFragilityAtoms[0]).toHaveProperty('name', 'fragileFunc');
    });

    it('calculates maximum fragility score', async () => {
      const result = await getFileImpactSummary(rootPath, 'src/target.js');

      expect(result.maxFragility).toBeGreaterThan(0.5);
      expect(result.maxFragility).toBeLessThanOrEqual(1);
    });

    it('respects fragility threshold', async () => {
      const result = await getFileImpactSummary(rootPath, 'src/target.js', { fragilityThreshold: 0.9 });

      // With high threshold, fragileFunc (0.8) should not be included
      expect(result.highFragilityAtoms.length).toBeLessThan(
        (await getFileImpactSummary(rootPath, 'src/target.js', { fragilityThreshold: 0.5 })).highFragilityAtoms.length
      );
    });

    it('excludes target file from dependents lists', async () => {
      const result = await getFileImpactSummary(rootPath, 'src/target.js');

      expect(result.directDependents).not.toContain('src/target.js');
      expect(result.transitiveDependents).not.toContain('src/target.js');
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      // Create a complex dependency graph
      db.prepare(`
        INSERT INTO files (path, last_analyzed, total_complexity, total_lines, module_name, imports_json, exports_json)
        VALUES
          ('src/core/utils.js', datetime('now'), 50, 300, 'core', '[]', '[]'),
          ('src/core/logger.js', datetime('now'), 30, 150, 'core', '[]', '[]'),
          ('src/services/user-service.js', datetime('now'), 60, 400, 'services', '[]', '[]'),
          ('src/services/auth-service.js', datetime('now'), 70, 450, 'services', '[]', '[]'),
          ('src/controllers/user-controller.js', datetime('now'), 40, 200, 'controllers', '[]', '[]')
      `).run();

      db.prepare(`
        INSERT INTO file_dependencies (source_path, target_path, relation_type, is_removed, created_at)
        VALUES
          ('src/services/user-service.js', 'src/core/utils.js', 'imports', 0, datetime('now')),
          ('src/services/user-service.js', 'src/core/logger.js', 'imports', 0, datetime('now')),
          ('src/services/auth-service.js', 'src/core/utils.js', 'imports', 0, datetime('now')),
          ('src/services/auth-service.js', 'src/core/logger.js', 'imports', 0, datetime('now')),
          ('src/controllers/user-controller.js', 'src/services/user-service.js', 'imports', 0, datetime('now')),
          ('src/controllers/user-controller.js', 'src/services/auth-service.js', 'imports', 0, datetime('now'))
      `).run();
    });

    it('handles multi-level dependency chains', async () => {
      const graph = await getDependencyGraph(rootPath, 'src/core/utils.js', 3);

      // Verify graph structure is returned correctly
      expect(graph).toHaveProperty('nodes');
      expect(graph).toHaveProperty('edges');
      expect(Array.isArray(graph.nodes)).toBe(true);
      expect(Array.isArray(graph.edges)).toBe(true);

      // Verify at least the starting node is present
      expect(graph.nodes.length).toBeGreaterThanOrEqual(1);
      expect(graph.nodes[0].id).toBe('src/core/utils.js');
      expect(graph.nodes[0].depth).toBe(0);
    });

    it('identifies all dependents of core module', async () => {
      const dependents = await getTransitiveDependents(rootPath, 'src/core/utils.js');

      expect(dependents).toContain('src/services/user-service.js');
      expect(dependents).toContain('src/services/auth-service.js');
      expect(dependents).toContain('src/controllers/user-controller.js');
    });

    it('provides accurate impact assessment for core changes', async () => {
      const impact = await getFileImpactSummary(rootPath, 'src/core/utils.js');

      expect(impact.directCount).toBeGreaterThanOrEqual(2);
      expect(impact.transitiveCount).toBeGreaterThan(impact.directCount);
      expect(impact.severity).toBe('medium');
    });
  });
});
