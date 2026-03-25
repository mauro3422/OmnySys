/**
 * @fileoverview Unit tests for risk-query.js
 * @module tests/unit/layer-c-memory/query/queries/risk-query
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';

import { getRiskAssessment } from '#layer-c/query/queries/risk-query.js';
import { getRepository } from '#layer-c/storage/repository/index.js';

describe('getRiskAssessment', () => {
  let db;
  let repo;
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
        lines_of_code INTEGER NOT NULL,
        complexity INTEGER NOT NULL,
        is_exported BOOLEAN DEFAULT 0,
        is_async BOOLEAN DEFAULT 0,
        has_error_handling BOOLEAN DEFAULT 0,
        has_network_calls BOOLEAN DEFAULT 0,
        archetype_type TEXT,
        purpose_type TEXT,
        is_dead_code BOOLEAN DEFAULT 0,
        is_removed BOOLEAN DEFAULT 0,
        importance_score REAL DEFAULT 0,
        coupling_score REAL DEFAULT 0,
        cohesion_score REAL DEFAULT 0,
        stability_score REAL DEFAULT 1,
        propagation_score REAL DEFAULT 0,
        fragility_score REAL DEFAULT 0,
        testability_score REAL DEFAULT 0,
        in_degree INTEGER DEFAULT 0,
        out_degree INTEGER DEFAULT 0,
        centrality_score REAL DEFAULT 0,
        centrality_classification TEXT,
        risk_level TEXT,
        risk_prediction TEXT,
        callers_count INTEGER DEFAULT 0,
        callees_count INTEGER DEFAULT 0,
        dependency_depth INTEGER DEFAULT 0,
        external_call_count INTEGER DEFAULT 0,
        extracted_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        change_frequency REAL DEFAULT 0,
        age_days INTEGER DEFAULT 0,
        generation INTEGER DEFAULT 1,
        signature_json TEXT,
        data_flow_json TEXT,
        calls_json TEXT,
        temporal_json TEXT,
        error_flow_json TEXT,
        performance_json TEXT,
        dna_json TEXT,
        derived_json TEXT,
        shared_state_json TEXT,
        event_emitters_json TEXT,
        event_listeners_json TEXT,
        scope_type TEXT,
        _meta_json TEXT
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
      CREATE TABLE IF NOT EXISTS risk_assessments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT NOT NULL,
        risk_score REAL,
        risk_level TEXT,
        factors_json TEXT,
        shared_state_count INTEGER,
        external_deps_count INTEGER,
        complexity_score REAL,
        propagation_score REAL,
        assessed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_atoms_file_path ON atoms(file_path);
    `);

    repo = {
      db,
      projectPath: rootPath,
      getFile: vi.fn(),
      getByFile: vi.fn()
    };

    vi.mock('#layer-c/storage/repository/index.js', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        getRepository: vi.fn(() => repo)
      };
    });
  });

  describe('when risk_assessments table has data', () => {
    beforeEach(() => {
      db.prepare(`
        INSERT INTO files (path, last_analyzed, total_complexity, total_lines, module_name, imports_json, exports_json)
        VALUES
          ('src/high-risk.js', datetime('now'), 85, 500, 'high-risk', '[]', '[]'),
          ('src/medium-risk.js', datetime('now'), 45, 200, 'medium-risk', '[]', '[]'),
          ('src/low-risk.js', datetime('now'), 15, 100, 'low-risk', '[]', '[]')
      `).run();

      db.prepare(`
        INSERT INTO risk_assessments (file_path, risk_score, risk_level, factors_json, shared_state_count, external_deps_count, complexity_score, propagation_score, assessed_at)
        VALUES
          ('src/high-risk.js', 0.85, 'high', '[{"type": "high_complexity", "score": 0.9}, {"type": "high_coupling", "score": 0.8}]', 5, 3, 0.9, 0.8, datetime('now')),
          ('src/medium-risk.js', 0.55, 'medium', '[{"type": "moderate_complexity", "score": 0.6}]', 2, 1, 0.6, 0.5, datetime('now')),
          ('src/low-risk.js', 0.25, 'low', '[{"type": "low_complexity", "score": 0.3}]', 0, 0, 0.3, 0.2, datetime('now'))
      `).run();

      db.prepare(`
        INSERT INTO atoms (id, name, atom_type, file_path, line_start, line_end, complexity, propagation_score, coupling_score, fragility_score, centrality_score, has_network_calls, is_async, has_error_handling, risk_level, is_removed)
        VALUES
          ('src_high-risk_js::riskyFunc', 'riskyFunc', 'function', 'src/high-risk.js', 1, 50, 12, 0.8, 0.7, 0.9, 75, 1, 1, 0, 'high', 0),
          ('src_medium-risk_js::moderateFunc', 'moderateFunc', 'function', 'src/medium-risk.js', 1, 30, 8, 0.5, 0.4, 0.6, 40, 0, 1, 1, 'medium', 0),
          ('src_low-risk_js::safeFunc', 'safeFunc', 'function', 'src/low-risk.js', 1, 20, 5, 0.2, 0.1, 0.3, 15, 0, 0, 1, 'low', 0)
      `).run();
    });

    it('returns risk assessment with categorized files', async () => {
      const result = await getRiskAssessment(rootPath);
      expect(result).toHaveProperty('report');
      expect(result).toHaveProperty('scores');
      expect(result.report).toHaveProperty('summary');
      expect(result.report).toHaveProperty('criticalRiskFiles');
      expect(result.report).toHaveProperty('highRiskFiles');
      expect(result.report).toHaveProperty('mediumRiskFiles');
      expect(result.report).toHaveProperty('lowRiskFiles');
    });

    it('categorizes high-risk files correctly', async () => {
      const result = await getRiskAssessment(rootPath);
      expect(result.report.summary.highCount).toBeGreaterThanOrEqual(1);
      expect(result.report.highRiskFiles).toHaveLength(1);
      expect(result.report.highRiskFiles[0]).toHaveProperty('file', 'src/high-risk.js');
      expect(result.report.highRiskFiles[0]).toHaveProperty('severity', 'HIGH');
      expect(result.report.highRiskFiles[0].score).toBeGreaterThan(0.7);
    });

    it('categorizes medium-risk files correctly', async () => {
      const result = await getRiskAssessment(rootPath);
      expect(result.report.summary.mediumCount).toBeGreaterThanOrEqual(1);
      expect(result.report.mediumRiskFiles).toHaveLength(1);
      expect(result.report.mediumRiskFiles[0]).toHaveProperty('file', 'src/medium-risk.js');
      expect(result.report.mediumRiskFiles[0]).toHaveProperty('severity', 'MEDIUM');
    });

    it('categorizes low-risk files correctly', async () => {
      const result = await getRiskAssessment(rootPath);
      expect(result.report.summary.lowCount).toBeGreaterThanOrEqual(1);
      expect(result.report.lowRiskFiles).toHaveLength(1);
      expect(result.report.lowRiskFiles[0]).toHaveProperty('file', 'src/low-risk.js');
      expect(result.report.lowRiskFiles[0]).toHaveProperty('severity', 'LOW');
    });

    it('includes risk factors in file risk objects', async () => {
      const result = await getRiskAssessment(rootPath);
      const highRiskFile = result.report.highRiskFiles[0];
      expect(highRiskFile).toHaveProperty('factors');
      expect(Array.isArray(highRiskFile.factors)).toBe(true);
      expect(highRiskFile.factors.length).toBeGreaterThan(0);
      expect(highRiskFile.factors[0]).toHaveProperty('type');
    });

    it('includes summary statistics', async () => {
      const result = await getRiskAssessment(rootPath);
      expect(result.report.summary).toHaveProperty('criticalCount');
      expect(result.report.summary).toHaveProperty('highCount');
      expect(result.report.summary).toHaveProperty('mediumCount');
      expect(result.report.summary).toHaveProperty('lowCount');
      expect(result.report.summary).toHaveProperty('totalFiles');
      expect(result.report.summary).toHaveProperty('source');
    });
  });

  describe('when risk_assessments table is empty', () => {
    beforeEach(() => {
      db.prepare(`
        INSERT INTO files (path, last_analyzed, total_complexity, total_lines, module_name, imports_json, exports_json)
        VALUES
          ('src/file1.js', datetime('now'), 50, 300, 'module1', '[]', '[]')
      `).run();

      db.prepare(`
        INSERT INTO atoms (id, name, atom_type, file_path, line_start, line_end, complexity, propagation_score, coupling_score, fragility_score, centrality_score, has_network_calls, is_async, has_error_handling, risk_level, is_removed)
        VALUES
          ('src_file1_js::func1', 'func1', 'function', 'src/file1.js', 1, 40, 10, 0.6, 0.5, 0.7, 50, 1, 1, 0, null, 0),
          ('src_file1_js::func2', 'func2', 'function', 'src/file1.js', 41, 80, 8, 0.4, 0.3, 0.5, 30, 0, 0, 1, null, 0)
      `).run();
    });

    it('derives risk from atom metrics when risk_assessments is empty', async () => {
      const result = await getRiskAssessment(rootPath);
      expect(result.report.summary.source).toBe('derived_from_atoms');
      expect(result.report.summary.totalFiles).toBeGreaterThan(0);
    });

    it('includes note about fallback derivation', async () => {
      const result = await getRiskAssessment(rootPath);
      expect(result.report.summary).toHaveProperty('note');
      expect(result.report.summary.note).toContain('derived from atoms');
    });

    it('calculates risk scores using weighted formula', async () => {
      const result = await getRiskAssessment(rootPath);
      expect(result.report.lowRiskFiles).toHaveLength(1);
      const fileRisk = result.report.lowRiskFiles[0];
      expect(fileRisk).toHaveProperty('score');
      expect(fileRisk.score).toBeGreaterThanOrEqual(0);
      expect(fileRisk.score).toBeLessThanOrEqual(1);
    });

    it('includes derived factors in factors_json', async () => {
      const result = await getRiskAssessment(rootPath);
      const fileRisk = result.report.lowRiskFiles[0];
      expect(fileRisk.factors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'derived_from_atoms' }),
          expect.objectContaining({ type: 'propagation_score' }),
          expect.objectContaining({ type: 'complexity_score' })
        ])
      );
    });
  });

  describe('when database is not available', () => {
    it('throws error when repository is null', async () => {
      vi.mocked(getRepository).mockReturnValue(null);
      await expect(getRiskAssessment(rootPath)).rejects.toThrow('SQLite not available');
    });

    it('throws error when repository has no db', async () => {
      vi.mocked(getRepository).mockReturnValue({ db: null });
      await expect(getRiskAssessment(rootPath)).rejects.toThrow('SQLite not available');
    });
  });

  describe('risk score calculation', () => {
    beforeEach(() => {
      db.prepare(`
        INSERT INTO files (path, last_analyzed, total_complexity, total_lines, module_name, imports_json, exports_json)
        VALUES
          ('src/critical.js', datetime('now'), 95, 600, 'critical', '[]', '[]')
      `).run();

      db.prepare(`
        INSERT INTO atoms (id, name, atom_type, file_path, line_start, line_end, complexity, propagation_score, coupling_score, fragility_score, centrality_score, has_network_calls, is_async, has_error_handling, risk_level, is_removed)
        VALUES
          ('src_critical_js::criticalFunc', 'criticalFunc', 'function', 'src/critical.js', 1, 100, 14, 0.95, 0.9, 0.95, 95, 5, 1, 0, 'critical', 0)
      `).run();
    });

    it('normalizes risk level to critical for very high scores', async () => {
      const result = await getRiskAssessment(rootPath);
      expect(result.report.summary.criticalCount).toBeGreaterThanOrEqual(1);
      expect(result.report.criticalRiskFiles).toHaveLength(1);
      expect(result.report.criticalRiskFiles[0].severity).toBe('CRITICAL');
    });

    it('includes network atoms in risk calculation', async () => {
      const result = await getRiskAssessment(rootPath);
      const criticalFile = result.report.criticalRiskFiles[0];
      const networkAtomsFactor = criticalFile.factors.find(f => f.type === 'network_atoms');
      expect(networkAtomsFactor).toBeDefined();
      expect(networkAtomsFactor.count).toBeGreaterThan(0);
    });

    it('includes high risk atoms count in factors', async () => {
      const result = await getRiskAssessment(rootPath);
      const criticalFile = result.report.criticalRiskFiles[0];
      const highRiskAtomsFactor = criticalFile.factors.find(f => f.type === 'high_risk_atoms');
      expect(highRiskAtomsFactor).toBeDefined();
    });
  });

  describe('live file set synchronization', () => {
    beforeEach(() => {
      db.prepare(`
        INSERT INTO files (path, last_analyzed, total_complexity, total_lines, module_name, imports_json, exports_json)
        VALUES
          ('src/existing.js', datetime('now'), 40, 200, 'existing', '[]', '[]'),
          ('src/deleted.js', datetime('now'), 30, 150, 'deleted', '[]', '[]')
      `).run();

      db.prepare(`
        INSERT INTO risk_assessments (file_path, risk_score, risk_level, factors_json, assessed_at)
        VALUES
          ('src/existing.js', 0.5, 'medium', '[]', datetime('now')),
          ('src/deleted.js', 0.4, 'low', '[]', datetime('now'))
      `).run();

      db.prepare(`
        INSERT INTO atoms (id, name, atom_type, file_path, line_start, line_end, complexity, is_removed)
        VALUES
          ('src_existing_js::func', 'func', 'function', 'src/existing.js', 1, 30, 8, 0)
      `).run();
    });

    it('syncs with live file set', async () => {
      const result = await getRiskAssessment(rootPath);
      expect(result.report.summary).toHaveProperty('liveFilesTotal');
      expect(result.report.summary).toHaveProperty('unassessedLiveFiles');
    });

    it('excludes removed atoms from risk calculation', async () => {
      db.prepare(`
        INSERT INTO atoms (id, name, atom_type, file_path, line_start, line_end, complexity, is_removed)
        VALUES
          ('src_existing_js::removedFunc', 'removedFunc', 'function', 'src/existing.js', 31, 50, 10, 1)
      `).run();

      const result = await getRiskAssessment(rootPath);
      expect(result.report.summary.totalFiles).toBeGreaterThanOrEqual(1);
    });
  });

  describe('edge cases', () => {
    it('handles empty database gracefully', async () => {
      const result = await getRiskAssessment(rootPath);
      expect(result.report.summary.totalFiles).toBe(0);
      expect(result.report.summary.criticalCount).toBe(0);
      expect(result.report.summary.highCount).toBe(0);
      expect(result.report.summary.mediumCount).toBe(0);
      expect(result.report.summary.lowCount).toBe(0);
    });

    it('handles malformed factors_json gracefully', async () => {
      db.prepare(`
        INSERT INTO files (path, last_analyzed, total_complexity, total_lines, module_name, imports_json, exports_json)
        VALUES
          ('src/malformed.js', datetime('now'), 30, 150, 'malformed', '[]', '[]')
      `).run();

      db.prepare(`
        INSERT INTO risk_assessments (file_path, risk_score, risk_level, factors_json, assessed_at)
        VALUES
          ('src/malformed.js', 0.5, 'medium', 'invalid json{', datetime('now'))
      `).run();

      const result = await getRiskAssessment(rootPath);
      expect(result.report.mediumRiskFiles).toHaveLength(1);
      expect(result.report.mediumRiskFiles[0].factors).toEqual([]);
    });

    it('handles null risk_level as low', async () => {
      db.prepare(`
        INSERT INTO files (path, last_analyzed, total_complexity, total_lines, module_name, imports_json, exports_json)
        VALUES
          ('src/null-level.js', datetime('now'), 20, 100, 'null-level', '[]', '[]')
      `).run();

      db.prepare(`
        INSERT INTO risk_assessments (file_path, risk_score, risk_level, factors_json, assessed_at)
        VALUES
          ('src/null-level.js', 0.3, null, '[]', datetime('now'))
      `).run();

      const result = await getRiskAssessment(rootPath);
      expect(result.report.summary.totalFiles).toBe(0);
    });
  });
});
