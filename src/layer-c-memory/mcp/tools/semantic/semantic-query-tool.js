/**
 * @fileoverview Herramienta base para consultas semánticas en el grafo.
 * Extiende GraphQueryTool con utilidades para race conditions, eventos y shared state.
 *
 * REFACTORED: Queries SQL extraídas a `semantic-queries.js` (C reducido de 41 a ~15).
 *
 * @module mcp/tools/semantic/semantic-query-tool
 */

import { GraphQueryTool } from '../../core/shared/base-tools/graph-query-tool.js';
import {
    queryRaceConditions,
    queryEventPatterns,
    queryAsyncAtoms,
    querySocieties,
    queryDuplicates,
    queryDnaCoverage
} from './semantic-queries.js';

/**
 * Clase base para herramientas de análisis semántico.
 * Proporciona métodos reutilizables para consultar datos semánticos de SQLite.
 * Las queries SQL están encapsuladas en `semantic-queries.js`.
 */
export class SemanticQueryTool extends GraphQueryTool {
    constructor(toolName) {
        super(toolName);
    }

    // ─── Métodos de consulta ────────────────────────────────────────────────────

    /**
     * Obtiene átomos con acceso a shared state (race conditions potenciales)
     */
    async getRaceConditions(options = {}) {
        if (!this.repo) throw new Error('Repository not initialized');

        const { rows, total } = queryRaceConditions(this.repo.db, options);
        const { offset = 0, limit = 20 } = options;

        const races = rows.map(atom => ({
            id: atom.id,
            name: atom.name,
            file: atom.file_path,
            line: atom.line_start,
            isAsync: atom.is_async,
            scopeType: atom.scope_type,
            sharedStateAccess: JSON.parse(atom.shared_state_json || '[]'),
            complexity: atom.complexity,
            importanceScore: atom.importance_score,
            riskLevel: atom.risk_level,
            archetype: atom.archetype_type,
            purpose: atom.purpose_type,
            severity: this._calculateRaceSeverity(atom)
        }));

        return { total, offset, limit, hasMore: offset + limit < total, races };
    }

    /**
     * Obtiene átomos con patrones de eventos (emitters/listeners)
     */
    async getEventPatterns(options = {}) {
        if (!this.repo) throw new Error('Repository not initialized');

        const { rows, total } = queryEventPatterns(this.repo.db, options);
        const { offset = 0, limit = 20 } = options;

        const patterns = rows.map(atom => ({
            id: atom.id,
            name: atom.name,
            file: atom.file_path,
            line: atom.line_start,
            eventEmitters: JSON.parse(atom.event_emitters_json || '[]'),
            eventListeners: JSON.parse(atom.event_listeners_json || '[]'),
            isAsync: atom.is_async,
            scopeType: atom.scope_type,
            complexity: atom.complexity,
            importanceScore: atom.importance_score,
            riskLevel: atom.risk_level,
            hasEmitters: !!(atom.event_emitters_json && atom.event_emitters_json !== '[]'),
            hasListeners: !!(atom.event_listeners_json && atom.event_listeners_json !== '[]')
        }));

        return { total, offset, limit, hasMore: offset + limit < total, patterns };
    }

    /**
     * Obtiene análisis de funciones asíncronas
     */
    async getAsyncAnalysis(options = {}) {
        if (!this.repo) throw new Error('Repository not initialized');

        const { rows, total } = queryAsyncAtoms(this.repo.db, options);
        const { offset = 0, limit = 20 } = options;

        const asyncAtoms = rows.map(atom => ({
            id: atom.id,
            name: atom.name,
            file: atom.file_path,
            line: atom.line_start,
            isAsync: atom.is_async,
            hasNetworkCalls: atom.has_network_calls,
            hasErrorHandling: atom.has_error_handling,
            externalCallCount: atom.external_call_count,
            complexity: atom.complexity,
            importanceScore: atom.importance_score,
            riskLevel: atom.risk_level,
            archetype: atom.archetype_type
        }));

        return { total, offset, limit, hasMore: offset + limit < total, asyncAtoms };
    }

    /**
     * Obtiene Sociedades (Pueblos) formales
     */
    async getSocieties(options = {}) {
        if (!this.repo) throw new Error('Repository not initialized');

        const { rows, total } = querySocieties(this.repo.db, options);
        const { offset = 0, limit = 20 } = options;

        const societies = rows.map(r => ({
            id: r.id,
            name: r.name,
            type: r.type,
            cohesion: r.cohesion_score,
            entropy: r.entropy_score,
            moleculeCount: r.molecule_count,
            metadata: JSON.parse(r.metadata_json || '{}'),
            createdAt: r.created_at,
            updatedAt: r.updated_at
        }));

        return { total, offset, limit, hasMore: offset + limit < total, societies };
    }

    /**
     * Obtiene duplicados potenciales basados en DNA.
     * Incluye stats globales de cobertura, metadata de urgencia y ranking.
     * Reemplaza la necesidad de scripts externos para auditar duplicados.
     */
    async getDuplicates(options = {}) {
        if (!this.repo) throw new Error('Repository not initialized');

        const { rows, stats } = queryDuplicates(this.repo.db, options);
        const coverage = queryDnaCoverage(this.repo.db);

        const groups = {};
        rows.forEach(row => {
            if (!groups[row.dna_json]) {
                groups[row.dna_json] = {
                    dna: null,           // omitir el JSON crudo del output (es muy largo)
                    groupSize: row.group_size,
                    instances: [],
                    // Urgency: cuánto importa arreglar este duplicado
                    urgencyScore: Math.round(
                        row.group_size *
                        (row.importance_score || 0.1) *
                        (1 + (row.change_frequency || 0))
                    )
                };
            }
            groups[row.dna_json].instances.push({
                id: row.id,
                name: row.name,
                file: row.file_path,
                line: row.line_start,
                linesOfCode: row.lines_of_code,
                atomType: row.atom_type,
                archetype: row.archetype_type,
                purpose: row.purpose_type,
                changeFrequency: row.change_frequency,
                importanceScore: row.importance_score,
                callerCount: row.caller_count || 0
            });
        });

        const duplicates = Object.values(groups)
            .sort((a, b) => b.urgencyScore - a.urgencyScore);

        return {
            // Stats globales — lo que antes requería scripts externos
            coverage: {
                totalAtoms: coverage.totalAtoms,
                withDna: coverage.withDna,
                coveragePct: coverage.coveragePct,
                srcOnlyAtoms: coverage.srcOnlyAtoms,
                srcWithDna: coverage.srcWithDna
            },
            summary: {
                duplicateGroups: stats.groups || 0,
                totalDuplicateInstances: stats.total_instances || 0,
                status: (stats.groups || 0) === 0 ? '✅ No logic duplicates found' : `⚠️ ${stats.groups} duplicate group(s) detected`
            },
            total: duplicates.length,
            duplicates
        };
    }

    /**
     * @deprecated Use getSocieties para una visión formal de Pueblos
     */
    async getAtomSociety(options = {}) {
        if (!this.repo) throw new Error('Repository not initialized');

        const { offset = 0, limit = 20, connectionType, filePath } = options;
        let whereClause = 'WHERE 1=1';
        const params = [];

        if (connectionType && connectionType !== 'all') {
            whereClause += ' AND connection_type = ?'; params.push(connectionType);
        }
        if (filePath) {
            whereClause += ' AND (source_path = ? OR target_path = ?)'; params.push(filePath, filePath);
        }

        const connections = this.repo.db.prepare(`
            SELECT COUNT(*) OVER() as total_count,
                   id, connection_type, source_path, target_path,
                   connection_key, context_json, weight, created_at
            FROM semantic_connections
            ${whereClause}
            ORDER BY weight DESC, created_at DESC
            LIMIT ? OFFSET ?
        `).all(...params, limit, offset);

        const total = connections[0]?.total_count || 0;
        const society = connections.map(conn => ({
            id: conn.id, type: conn.connection_type, source: conn.source_path,
            target: conn.target_path, key: conn.connection_key,
            context: JSON.parse(conn.context_json || '{}'), weight: conn.weight, createdAt: conn.created_at
        }));

        return { total, offset, limit, hasMore: offset + limit < total, connections: society };
    }

    // ─── Helpers privados ───────────────────────────────────────────────────────

    /**
     * Calcula severidad de race condition basado en múltiples factores
     */
    _calculateRaceSeverity(atom) {
        let severity = 0;
        if (atom.is_async) severity += 2;

        const sharedState = JSON.parse(atom.shared_state_json || '[]');
        severity += Math.min(sharedState.length * 2, 4);

        if (atom.scope_type === 'global') severity += 2;
        else if (atom.scope_type === 'closure') severity += 1;

        if (atom.complexity > 10) severity += 1;
        if (atom.complexity > 20) severity += 1;
        if (atom.importance_score > 0.8) severity += 1;

        return Math.min(severity, 10);
    }

    formatSemanticResult(type, data, pagination) {
        return {
            [type]: data,
            pagination: { offset: pagination.offset, limit: pagination.limit, total: pagination.total, hasMore: pagination.hasMore },
            source: 'sqlite',
            timestamp: new Date().toISOString()
        };
    }
}
