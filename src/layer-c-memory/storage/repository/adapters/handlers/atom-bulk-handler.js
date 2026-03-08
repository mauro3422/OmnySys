/**
 * @fileoverview atom-bulk-handler.js
 * 
 * Maneja la inserción masiva de átomos en la base de datos.
 * 
 * @module storage/repository/adapters/handlers/atom-bulk-handler
 */

import { atomToRow } from '../helpers/converters.js';

export class AtomBulkHandler {
    constructor(db, logger) {
        this.db = db;
        this.logger = logger;
    }

    /**
     * Inserta un lote de átomos
     * @param {Array} atoms - Átomos a insertar
     * @param {string} now - Timestamp actual
     * @param {Function} normalizeFn - Función para normalizar paths
     */
    handle(atoms, now, normalizeFn) {
        if (!atoms || atoms.length === 0) return 0;

        this._cleanupLegacyAtomIds(atoms, normalizeFn);

        const columns = this._getAtomColumns();
        const columnStr = columns.join(', ');
        const placeholders = columns.map(() => '?').join(', ');
        const sql = `INSERT OR REPLACE INTO atoms (${columnStr}) VALUES (${placeholders})`;

        const stmt = this.db.prepare(sql);
        let totalSaved = 0;

        for (const atom of atoms) {
            // Normalizar path
            atom.filePath = normalizeFn(atom.file || atom.filePath);
            atom.file = atom.filePath;

            // Asegurar ID
            if (!atom.id || !atom.id.includes('::')) {
                atom.id = `${atom.filePath}::${atom.name}`;
            }

            const row = atomToRow(atom);
            const values = this._buildAtomInsertValues(row, now);

            stmt.run(...values);
            totalSaved++;
        }

        return totalSaved;
    }

    _cleanupLegacyAtomIds(atoms, normalizeFn) {
        const filePaths = new Set();
        for (const atom of atoms) {
            const normalizedPath = normalizeFn(atom.file || atom.filePath);
            if (normalizedPath) {
                filePaths.add(normalizedPath);
            }
        }

        const deleteStmt = this.db.prepare(`
            DELETE FROM atoms
            WHERE file_path = ?
              AND id NOT LIKE ?
        `);

        for (const filePath of filePaths) {
            deleteStmt.run(filePath, `${filePath}::%`);
        }
    }

    /**
     * @private - Columnas para la tabla atoms
     */
    _getAtomColumns() {
        return [
            'id', 'name', 'atom_type', 'file_path', 'line_start', 'line_end',
            'lines_of_code', 'complexity', 'parameter_count', 'is_exported',
            'is_async', 'is_test_callback', 'test_callback_type', 'has_error_handling',
            'has_network_calls', 'archetype_type', 'archetype_severity', 'archetype_confidence',
            'purpose_type', 'purpose_confidence', 'is_dead_code', 'is_removed',
            'is_phase2_complete', 'is_deprecated', 'deprecated_reason', 'importance_score',
            'coupling_score', 'cohesion_score', 'stability_score', 'propagation_score',
            'fragility_score', 'testability_score', 'in_degree', 'out_degree',
            'centrality_score', 'centrality_classification', 'risk_level', 'risk_prediction',
            'callers_count', 'callees_count', 'dependency_depth', 'external_call_count',
            'extracted_at', 'updated_at', 'change_frequency', 'age_days',
            'generation', 'signature_json', 'data_flow_json', 'calls_json',
            'called_by_json', 'temporal_json', 'error_flow_json', 'performance_json',
            'dna_json', 'derived_json', 'function_type', 'shared_state_json',
            'event_emitters_json', 'event_listeners_json', 'scope_type', '_meta_json'
        ];
    }

    /**
     * @private - Construye array de valores para insert
     */
    _buildAtomInsertValues(row, now) {
        return [
            row.id, row.name, row.atom_type, row.file_path, row.line_start || 0, row.line_end || 0,
            row.lines_of_code || 0, row.complexity || 1, row.parameter_count || 0, row.is_exported ? 1 : 0,
            row.is_async ? 1 : 0, row.is_test_callback ? 1 : 0, row.test_callback_type, row.has_error_handling ? 1 : 0,
            row.has_network_calls ? 1 : 0, row.archetype_type, row.archetype_severity, row.archetype_confidence,
            row.purpose_type, row.purpose_confidence, row.is_dead_code ? 1 : 0, row.is_removed ? 1 : 0,
            row.is_phase2_complete ? 1 : 0, row.is_deprecated ? 1 : 0, row.deprecated_reason, row.importance_score || 0,
            row.coupling_score || 0, row.cohesion_score || 0, row.stability_score || 1, row.propagation_score || 0,
            row.fragility_score || 0, row.testability_score || 0, row.in_degree || 0, row.out_degree || 0,
            row.centrality_score || 0, row.centrality_classification, row.risk_level, row.risk_prediction,
            row.callers_count || 0, row.callees_count || 0, row.dependency_depth || 0, row.external_call_count || 0,
            row.extracted_at || now, row.updated_at || now, row.change_frequency || 0, row.age_days || 0,
            row.generation || 1, row.signature_json, row.data_flow_json, row.calls_json,
            row.called_by_json, row.temporal_json, row.error_flow_json, row.performance_json,
            row.dna_json, row.derived_json, row.function_type, row.shared_state_json,
            row.event_emitters_json, row.event_listeners_json, row.scope_type, row._meta_json
        ];
    }
}
