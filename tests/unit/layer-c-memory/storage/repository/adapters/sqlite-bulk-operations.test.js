import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { SQLiteBulkOperations } from '#layer-c/storage/repository/adapters/sqlite-bulk-operations.js';
import { connectionManager } from '#layer-c/storage/database/connection.js';

vi.mock('#layer-c/storage/database/connection.js', () => ({
    connectionManager: {
        transaction: vi.fn((cb) => cb())
    }
}));

describe('SQLiteBulkOperations Orchestrator', () => {
    let db;
    let bulkOps;
    const mockLogger = {
        debug: vi.fn(),
        error: vi.fn()
    };

    beforeEach(() => {
        db = new Database(':memory:');

        // Initialize schema
        db.exec(`
      CREATE TABLE atoms (
        id TEXT PRIMARY KEY,
        name TEXT,
        atom_type TEXT,
        file_path TEXT,
        line_start INTEGER,
        line_end INTEGER,
        lines_of_code INTEGER,
        complexity INTEGER,
        parameter_count INTEGER,
        is_exported BOOLEAN,
        is_async BOOLEAN,
        is_test_callback BOOLEAN,
        test_callback_type TEXT,
        has_error_handling BOOLEAN,
        has_network_calls BOOLEAN,
        archetype_type TEXT,
        archetype_severity INTEGER,
        archetype_confidence REAL,
        purpose_type TEXT,
        purpose_confidence REAL,
        is_dead_code BOOLEAN,
        is_removed BOOLEAN,
        is_phase2_complete BOOLEAN,
        is_deprecated BOOLEAN,
        deprecated_reason TEXT,
        importance_score REAL,
        coupling_score REAL,
        cohesion_score REAL,
        stability_score REAL,
        propagation_score REAL,
        fragility_score REAL,
        testability_score REAL,
        in_degree INTEGER,
        out_degree INTEGER,
        centrality_score REAL,
        centrality_classification TEXT,
        risk_level TEXT,
        risk_prediction TEXT,
        callers_count INTEGER,
        callees_count INTEGER,
        dependency_depth INTEGER,
        external_call_count INTEGER,
        extracted_at TEXT,
        updated_at TEXT,
        change_frequency REAL,
        age_days INTEGER,
        generation INTEGER,
        signature_json TEXT,
        data_flow_json TEXT,
        calls_json TEXT,
        called_by_json TEXT,
        temporal_json TEXT,
        error_flow_json TEXT,
        performance_json TEXT,
        dna_json TEXT,
        derived_json TEXT,
        function_type TEXT,
        shared_state_json TEXT,
        event_emitters_json TEXT,
        event_listeners_json TEXT,
        scope_type TEXT,
        _meta_json TEXT
      );

      CREATE TABLE files (
          path TEXT PRIMARY KEY,
          last_analyzed TEXT NOT NULL,
          atom_count INTEGER NOT NULL DEFAULT 0,
          total_complexity INTEGER NOT NULL DEFAULT 0,
          total_lines INTEGER NOT NULL DEFAULT 0,
          module_name TEXT,
          imports_json TEXT,
          exports_json TEXT,
          hash TEXT
      );

      CREATE TABLE atom_relations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_id TEXT NOT NULL,
          target_id TEXT NOT NULL,
          relation_type TEXT NOT NULL,
          weight REAL NOT NULL DEFAULT 1,
          line_number INTEGER,
          context_json TEXT,
          created_at TEXT NOT NULL
      );

      CREATE TABLE atom_versions (
          atom_id TEXT PRIMARY KEY,
          hash TEXT NOT NULL,
          field_hashes_json TEXT NOT NULL,
          last_modified INTEGER NOT NULL,
          file_path TEXT NOT NULL,
          atom_name TEXT NOT NULL
      );

      CREATE TABLE atom_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          atom_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          changed_fields TEXT,
          before_state TEXT,
          after_state TEXT,
          impact_score REAL,
          timestamp TEXT NOT NULL,
          source TEXT NOT NULL
      );
    `);

        bulkOps = new SQLiteBulkOperations(db, mockLogger);
    });

    describe('saveMany Orchestration', () => {
        it('persists atoms, relations, and metadata in a single transaction', () => {
            const atoms = [
                {
                    name: 'funcA',
                    type: 'function',
                    filePath: 'src/file.js',
                    calls: [{ callee: 'funcB', line: 10 }]
                }
            ];

            bulkOps.saveMany(atoms, 'abc-hash');

            // Verify atoms
            const atom = db.prepare('SELECT * FROM atoms WHERE name = ?').get('funcA');
            expect(atom).toBeDefined();
            expect(atom.file_path).toBe('src/file.js');

            // Verify relations
            const relation = db.prepare('SELECT * FROM atom_relations WHERE source_id = ?').get(atom.id);
            expect(relation).toBeDefined();
            expect(relation.target_id).toContain('funcB');

            // Verify metadata
            const file = db.prepare('SELECT * FROM files WHERE path = ?').get('src/file.js');
            expect(file).toBeDefined();
            expect(file.hash).toBe('abc-hash');

            // Verify events & versions (Fase 4)
            const event = db.prepare('SELECT * FROM atom_events WHERE atom_id = ?').get(atom.id);
            expect(event).toBeDefined();
            expect(event.event_type).toBe('created');

            const version = db.prepare('SELECT * FROM atom_versions WHERE atom_id = ?').get(atom.id);
            expect(version).toBeDefined();
        });

        it('handles updates correctly (created vs updated events)', () => {
            const atomId = 'src/file.js::funcA';
            db.prepare('INSERT INTO atoms (id, name, file_path, atom_type, extracted_at, updated_at, complexity, line_start, line_end, lines_of_code) VALUES (?, ?, ?, ?, ?, ?, 1, 1, 1, 1)').run(
                atomId, 'funcA', 'src/file.js', 'function', '2023-01-01', '2023-01-01'
            );

            const atoms = [
                {
                    name: 'funcA',
                    type: 'function',
                    filePath: 'src/file.js'
                }
            ];

            bulkOps.saveMany(atoms);

            const events = db.prepare('SELECT * FROM atom_events WHERE atom_id = ?').all(atomId);
            expect(events.length).toBe(1);
            expect(events[0].event_type).toBe('updated');
        });
    });

    describe('Backward Compatibility', () => {
        it('saveManyBulk still works', () => {
            const atoms = [{ name: 'compat', type: 'function', filePath: 'test.js' }];
            bulkOps.saveManyBulk(atoms);

            const atom = db.prepare('SELECT * FROM atoms WHERE name = ?').get('compat');
            expect(atom).toBeDefined();
        });

        it('saveRelationsBulk still works', () => {
            const relations = [{ atomId: 'A', call: 'B' }];
            bulkOps.saveRelationsBulk(relations);

            const rel = db.prepare('SELECT * FROM atom_relations WHERE source_id = ?').get('A');
            expect(rel).toBeDefined();
        });
    });
});
