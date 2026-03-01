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

        // Query principal con paginación
        const countQuery = this.repo.db.prepare(`
            SELECT COUNT(*) as total
            FROM atoms
            ${whereClause}
        `);
        
        const count = countQuery.get(...params);
        
        const dataQuery = this.repo.db.prepare(`
            SELECT 
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
            total: count.total,
            offset,
            limit,
            hasMore: offset + limit < count.total,
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

        let whereClause = 'WHERE ';
        const conditions = [];

        if (type === 'emitters' || type === 'all') {
            conditions.push('(event_emitters_json IS NOT NULL AND event_emitters_json != \'[]\')');
        }
        if (type === 'listeners' || type === 'all') {
            conditions.push('(event_listeners_json IS NOT NULL AND event_listeners_json != \'[]\')');
        }

        whereClause += conditions.join(' OR ');

        const countQuery = this.repo.db.prepare(`
            SELECT COUNT(*) as total
            FROM atoms
            ${whereClause}
        `);
        
        const count = countQuery.get();
        
        const dataQuery = this.repo.db.prepare(`
            SELECT 
                id, name, file_path, line_start, line_end,
                event_emitters_json, event_listeners_json,
                is_async, scope_type,
                complexity, importance_score, risk_level
            FROM atoms
            ${whereClause}
            ORDER BY importance_score DESC
            LIMIT ? OFFSET ?
        `);

        const atoms = dataQuery.all(limit, offset);

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
            total: count.total,
            offset,
            limit,
            hasMore: offset + limit < count.total,
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

        const countQuery = this.repo.db.prepare(`
            SELECT COUNT(*) as total
            FROM atoms
            ${whereClause}
        `);
        
        const count = countQuery.get();
        
        const dataQuery = this.repo.db.prepare(`
            SELECT 
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
            total: count.total,
            offset,
            limit,
            hasMore: offset + limit < count.total,
            asyncAtoms
        };
    }

    /**
     * Obtiene conexiones semánticas (society)
     * @param {Object} options - Opciones de consulta
     * @returns {Object} Resultado paginado
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

        const countQuery = this.repo.db.prepare(`
            SELECT COUNT(*) as total
            FROM semantic_connections
            ${whereClause}
        `);
        
        const count = countQuery.get(...params);
        
        const dataQuery = this.repo.db.prepare(`
            SELECT 
                id, connection_type, source_path, target_path,
                connection_key, context_json, weight, created_at
            FROM semantic_connections
            ${whereClause}
            ORDER BY weight DESC, created_at DESC
            LIMIT ? OFFSET ?
        `);

        const connections = dataQuery.all(...params, limit, offset);

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
            total: count.total,
            offset,
            limit,
            hasMore: offset + limit < count.total,
            connections: society
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
}
