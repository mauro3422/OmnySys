/**
 * @fileoverview Base tool for semantic graph queries.
 * Extends GraphQueryTool with helpers for race conditions, events, duplicates,
 * async analysis, and societies.
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
    queryIsomorphicDuplicates,
    queryDnaCoverage
} from './semantic-queries.js';

import { RaceConditionHandler } from './handlers/race-condition-handler.js';
import { DuplicateHandler } from './handlers/duplicate-handler.js';
import { EventPatternHandler } from './handlers/event-pattern-handler.js';
import { AsyncAnalysisHandler } from './handlers/async-analysis-handler.js';

export class SemanticQueryTool extends GraphQueryTool {
    constructor(toolName) {
        super(toolName);
        this._initHandlers();
    }

    _initHandlers() {
        this.raceHandler = new RaceConditionHandler();
        this.duplicateHandler = new DuplicateHandler();
        this.eventHandler = new EventPatternHandler();
        this.asyncHandler = new AsyncAnalysisHandler();
    }

    async getRaceConditions(options = {}) {
        if (!this.repo) throw new Error('Repository not initialized');

        const { rows, total } = queryRaceConditions(this.repo.db, options);
        const { offset = 0, limit = 20 } = options;

        const races = this.raceHandler.handle(rows);
        return { total, offset, limit, hasMore: offset + limit < total, races };
    }

    async getEventPatterns(options = {}) {
        if (!this.repo) throw new Error('Repository not initialized');

        const { rows, total } = queryEventPatterns(this.repo.db, options);
        const { offset = 0, limit = 20 } = options;

        const patterns = this.eventHandler.handle(rows);
        return { total, offset, limit, hasMore: offset + limit < total, patterns };
    }

    async getAsyncAnalysis(options = {}) {
        if (!this.repo) throw new Error('Repository not initialized');

        const { rows, total } = queryAsyncAtoms(this.repo.db, options);
        const { offset = 0, limit = 20 } = options;

        const asyncAtoms = this.asyncHandler.handle(rows);
        return { total, offset, limit, hasMore: offset + limit < total, asyncAtoms };
    }

    async getSocieties(options = {}) {
        if (!this.repo) throw new Error('Repository not initialized');

        const { rows, total } = querySocieties(this.repo.db, options);
        const { offset = 0, limit = 20 } = options;

        const societies = rows.map((row) => ({
            id: row.id,
            name: row.name,
            type: row.type,
            cohesion: row.cohesion_score,
            entropy: row.entropy_score,
            moleculeCount: row.molecule_count,
            metadata: JSON.parse(row.metadata_json || '{}'),
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));

        return { total, offset, limit, hasMore: offset + limit < total, societies };
    }

    async getDuplicates(options = {}) {
        if (!this.repo) throw new Error('Repository not initialized');

        const { rows, stats } = queryDuplicates(this.repo.db, options);
        const coverage = queryDnaCoverage(this.repo.db);
        const duplicates = this.duplicateHandler.handle(rows);
        const hasUsableDnaCoverage = (coverage?.withDna || 0) > 0;

        return {
            coverage,
            summary: {
                duplicateGroups: stats.groups || 0,
                totalDuplicateInstances: stats.total_instances || 0,
                status: !hasUsableDnaCoverage
                    ? 'DNA coverage unavailable - duplicate detection disabled'
                    : ((stats.groups || 0) === 0
                        ? 'No logic duplicates found'
                        : `${stats.groups} duplicate group(s) detected`)
            },
            total: duplicates.length,
            duplicates
        };
    }

    async getIsomorphicDuplicates(options = {}) {
        if (!this.repo) throw new Error('Repository not initialized');

        const { rows, stats } = queryIsomorphicDuplicates(this.repo.db, options);
        const coverage = queryDnaCoverage(this.repo.db);
        const duplicates = this.duplicateHandler.handle(rows);
        const hasUsableDnaCoverage = (coverage?.withDna || 0) > 0;

        return {
            coverage,
            summary: {
                duplicateGroups: stats.groups || 0,
                totalDuplicateInstances: stats.total_instances || 0,
                status: !hasUsableDnaCoverage
                    ? 'DNA coverage unavailable - isomorphic duplicate detection limited'
                    : ((stats.groups || 0) === 0
                        ? 'No isomorphic duplicates found'
                        : `${stats.groups} isomorphic group(s) detected`)
            },
            total: duplicates.length,
            duplicates
        };
    }

    async getAtomSociety(options = {}) {
        if (!this.repo) throw new Error('Repository not initialized');

        const { offset = 0, limit = 20, connectionType, filePath } = options;
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
        const society = connections.map((conn) => ({
            id: conn.id,
            type: conn.connection_type,
            source: conn.source_path,
            target: conn.target_path,
            key: conn.connection_key,
            context: JSON.parse(conn.context_json || '{}'),
            weight: conn.weight,
            createdAt: conn.created_at
        }));

        return { total, offset, limit, hasMore: offset + limit < total, connections: society };
    }

    formatSemanticResult(type, data, pagination) {
        return {
            [type]: data,
            pagination,
            source: 'sqlite',
            timestamp: new Date().toISOString()
        };
    }
}

export default SemanticQueryTool;
