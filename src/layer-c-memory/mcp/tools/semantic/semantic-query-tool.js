/**
 * @fileoverview Herramienta base para consultas semánticas en el grafo.
 * Extiende GraphQueryTool con utilidades para race conditions, eventos y shared state.
 * 
 * @module mcp/tools/semantic/semantic-query-tool
 */

import { GraphQueryTool } from '../../core/shared/base-tools/graph-query-tool.js';

/**
 * Clase base para herramientas de análisis semántico
 * Proporciona métodos reutilizables para consultar datos semánticos de SQLite
 */
export class SemanticQueryTool extends GraphQueryTool {
    constructor(toolName) {
        super(toolName);
    }

    /**
     * Obtiene átomos con acceso a shared state
     * @param {Object} options - Opciones de consulta
     * @param {number} options.offset - Paginación: offset
     * @param {number} options.limit - Paginación: límite
     * @param {string} options.scopeType - Filtrar por scope (global, closure, module)
     * @param {boolean} options.asyncOnly - Solo átomos asíncronos
     * @returns {Object} Resultado paginado
     */
    async getRaceConditions(options = {}) {
        const {
            offset = 0,
            limit = 20,
            scopeType,
            asyncOnly = true,
            minSeverity = 0
        } = options;

        if (!this.repo) {
            throw new Error('Repository not initialized');
        }

        // Construir query dinámica
        let whereClause = 'WHERE shared_state_json IS NOT NULL AND shared_state_json != \'[]\'';
        const params = [];

        if (asyncOnly) {
            whereClause += ' AND is_async = 1';
        }

        if (scopeType) {
            whereClause += ' AND scope_type = ?';
            params.push(scopeType);
        }

        const dataQuery = this.repo.db.prepare(`
            SELECT 
                COUNT(*) OVER() as total_count,
                id, name, file_path, line_start, line_end,
                is_async, scope_type, shared_state_json,
                complexity, importance_score, risk_level,
                archetype_type, purpose_type
            FROM atoms
            ${whereClause}
            ORDER BY importance_score DESC, complexity DESC
            LIMIT ? OFFSET ?
        `);

        const atoms = dataQuery.all(...params, limit, offset);

        const total = atoms.length > 0 ? atoms[0].total_count : 0;

        // Procesar resultados
        const races = atoms.map(atom => ({
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

        return {
            total,
            offset,
            limit,
            hasMore: offset + limit < total,
            races
        };
    }

    /**
     * Obtiene átomos con patrones de eventos (emitters/listeners)
     * @param {Object} options - Opciones de consulta
     * @returns {Object} Resultado paginado
     */
    async getEventPatterns(options = {}) {
        const {
            offset = 0,
            limit = 20,
            type = 'all', // 'emitters', 'listeners', 'all'
            minSeverity = 0
        } = options;

        if (!this.repo) {
            throw new Error('Repository not initialized');
        }

        const conditions = [];
        if (type === 'emitters' || type === 'all') {
            conditions.push('(event_emitters_json IS NOT NULL AND event_emitters_json != \'[]\')');
        }
        if (type === 'listeners' || type === 'all') {
            conditions.push('(event_listeners_json IS NOT NULL AND event_listeners_json != \'[]\')');
        }

        const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' OR ')}` : '';

        const dataQuery = this.repo.db.prepare(`
            SELECT 
                COUNT(*) OVER() as total_count,
                id, name, file_path, line_start, line_end,
                event_emitters_json, event_listeners_json,
                is_async, scope_type,
                complexity, importance_score, risk_level
            FROM atoms
            ${whereSql}
            ORDER BY importance_score DESC
            LIMIT ? OFFSET ?
        `);

        const atoms = dataQuery.all(limit, offset);

        const total = atoms.length > 0 ? atoms[0].total_count : 0;

        // Procesar resultados
        const patterns = atoms.map(atom => ({
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
            hasEmitters: (atom.event_emitters_json && atom.event_emitters_json !== '[]'),
            hasListeners: (atom.event_listeners_json && atom.event_listeners_json !== '[]')
        }));

        return {
            total,
            offset,
            limit,
            hasMore: offset + limit < total,
            patterns
        };
    }

    /**
     * Obtiene análisis de funciones asíncronas
     * @param {Object} options - Opciones de consulta
     * @returns {Object} Resultado paginado
     */
    async getAsyncAnalysis(options = {}) {
        const {
            offset = 0,
            limit = 20,
            withNetworkCalls = false,
            withErrorHandling = false
        } = options;

        if (!this.repo) {
            throw new Error('Repository not initialized');
        }

        let whereClause = 'WHERE is_async = 1';

        if (withNetworkCalls) {
            whereClause += ' AND has_network_calls = 1';
        }

        if (withErrorHandling) {
            whereClause += ' AND has_error_handling = 1';
        }

        const dataQuery = this.repo.db.prepare(`
            SELECT 
                COUNT(*) OVER() as total_count,
                id, name, file_path, line_start, line_end,
                is_async, has_network_calls, has_error_handling,
                external_call_count, complexity, importance_score,
                risk_level, archetype_type
            FROM atoms
            ${whereClause}
            ORDER BY external_call_count DESC, complexity DESC
            LIMIT ? OFFSET ?
        `);

        const atoms = dataQuery.all(limit, offset);

        const total = atoms.length > 0 ? atoms[0].total_count : 0;

        // Procesar resultados
        const asyncAtoms = atoms.map(atom => ({
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

        return {
            total,
            offset,
            limit,
            hasMore: offset + limit < total,
            asyncAtoms
        };
    }

    /**
     * Obtiene conexiones semánticas (la visión de cables crudos)
     * @param {Object} options - Opciones de consulta
     * @returns {Object} Resultado paginado
     * @deprecated Use getSocieties para una visión formal de Pueblos
     */
    async getAtomSociety(options = {}) {
        const {
            offset = 0,
            limit = 20,
            connectionType, // 'shared_state', 'event', 'all'
            filePath
        } = options;

        if (!this.repo) {
            throw new Error('Repository not initialized');
        }

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (connectionType && connectionType !== 'all') {
            whereClause += ' AND connection_type = ?';
            params.push(connectionType);
        }

        if (filePath) {
            whereClause += ' AND (source_path = ? OR target_path = ?)';
            params.push(filePath, filePath);
        }

        const dataQuery = this.repo.db.prepare(`
            SELECT 
                COUNT(*) OVER() as total_count,
                id, connection_type, source_path, target_path,
                connection_key, context_json, weight, created_at
            FROM semantic_connections
            ${whereClause}
            ORDER BY weight DESC, created_at DESC
            LIMIT ? OFFSET ?
        `);

        const connections = dataQuery.all(...params, limit, offset);

        const total = connections.length > 0 ? connections[0].total_count : 0;

        // Procesar resultados
        const society = connections.map(conn => ({
            id: conn.id,
            type: conn.connection_type,
            source: conn.source_path,
            target: conn.target_path,
            key: conn.connection_key,
            context: JSON.parse(conn.context_json || '{}'),
            weight: conn.weight,
            createdAt: conn.created_at
        }));

        return {
            total,
            offset,
            limit,
            hasMore: offset + limit < total,
            connections: society
        };
    }

    /**
     * Obtiene Sociedades (Pueblos) formales
     * @param {Object} options - Opciones de consulta
     */
    async getSocieties(options = {}) {
        const {
            offset = 0,
            limit = 20,
            type // 'functional', 'structural', 'cultural'
        } = options;

        if (!this.repo) {
            throw new Error('Repository not initialized');
        }

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (type) {
            whereClause += ' AND type = ?';
            params.push(type);
        }

        const dataQuery = this.repo.db.prepare(`
            SELECT 
                COUNT(*) OVER() as total_count,
                id, name, type, cohesion_score, entropy_score, molecule_count,
                metadata_json, created_at, updated_at
            FROM societies
            ${whereClause}
            ORDER BY cohesion_score DESC
            LIMIT ? OFFSET ?
        `);

        const rows = dataQuery.all(...params, limit, offset);
        const total = rows.length > 0 ? rows[0].total_count : 0;

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

        return {
            total,
            offset,
            limit,
            hasMore: offset + limit < total,
            societies
        };
    }

    /**
     * Calcula severidad de race condition basado en múltiples factores
     * @param {Object} atom - Átomo de la base de datos
     * @returns {number} Severidad (0-10)
     * @private
     */
    _calculateRaceSeverity(atom) {
        let severity = 0;

        // Factor: es asíncrono
        if (atom.is_async) severity += 2;

        // Factor: tiene shared state access
        const sharedState = JSON.parse(atom.shared_state_json || '[]');
        if (sharedState.length > 0) {
            severity += Math.min(sharedState.length * 2, 4);
        }

        // Factor: scope global es más peligroso
        if (atom.scope_type === 'global') severity += 2;
        else if (atom.scope_type === 'closure') severity += 1;

        // Factor: complejidad alta
        if (atom.complexity > 10) severity += 1;
        if (atom.complexity > 20) severity += 1;

        // Factor: importancia/centralidad
        if (atom.importance_score > 0.8) severity += 1;

        return Math.min(severity, 10);
    }

    /**
     * Formatea resultado con metadatos de paginación
     * @param {string} type - Tipo de dato
     * @param {Array} data - Datos principales
     * @param {Object} pagination - Información de paginación
     * @returns {Object} Resultado formateado
     */
    formatSemanticResult(type, data, pagination) {
        return {
            [type]: data,
            pagination: {
                offset: pagination.offset,
                limit: pagination.limit,
                total: pagination.total,
                hasMore: pagination.hasMore
            },
            source: 'sqlite',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Obtiene duplicados potenciales basados en DNA
     * @param {Object} options - Opciones de consulta
     */
    async getDuplicates(options = {}) {
        const { limit = 20, offset = 0, minSimilarity = 0.9 } = options;

        // Esta query busca colisiones de structural_hash (ADN exacto)
        // En el futuro se puede usar similitud borrosa
        const dataQuery = this.repo.db.prepare(`
            WITH DuplicateGroups AS (
                SELECT dna_json, COUNT(*) as group_size
                FROM atoms
                WHERE dna_json IS NOT NULL AND dna_json != ''
                GROUP BY dna_json
                HAVING COUNT(*) > 1
            )
            SELECT 
                a.id, a.name, a.file_path, a.line_start, a.dna_json,
                dg.group_size
            FROM atoms a
            JOIN DuplicateGroups dg ON a.dna_json = dg.dna_json
            ORDER BY dg.group_size DESC, a.name ASC
            LIMIT ? OFFSET ?
        `);

        const rows = dataQuery.all(limit, offset);
        const groups = {};

        rows.forEach(row => {
            if (!groups[row.dna_json]) {
                groups[row.dna_json] = {
                    dna: JSON.parse(row.dna_json),
                    instances: []
                };
            }
            groups[row.dna_json].instances.push({
                id: row.id,
                name: row.name,
                file: row.file_path,
                line: row.line_start
            });
        });

        return {
            total: Object.keys(groups).length,
            duplicates: Object.values(groups)
        };
    }
}
