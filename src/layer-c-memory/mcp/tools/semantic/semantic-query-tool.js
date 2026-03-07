/**
 * @fileoverview Base tool for semantic graph queries.
 * Extends GraphQueryTool with helpers for race conditions, events, duplicates,
 * async analysis, and societies.
 *
 * @module mcp/tools/semantic/semantic-query-tool
 */

import { GraphQueryTool } from '../../core/shared/base-tools/graph-query-tool.js';
import {
    buildDuplicateRemediationPlan,
    getSemanticSurfaceGranularity
} from '../../../../shared/compiler/index.js';
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

function requireSemanticRepo(repo) {
    if (!repo) {
        throw new Error('Repository not initialized');
    }
    return repo;
}

function buildSocietyQuery(options = {}) {
    const { connectionType, filePath } = options;
    const clauses = ['WHERE (is_removed IS NULL OR is_removed = 0)'];
    const params = [];

    if (connectionType && connectionType !== 'all') {
        clauses.push('AND connection_type = ?');
        params.push(connectionType);
    }

    if (filePath) {
        clauses.push('AND (source_path = ? OR target_path = ?)');
        params.push(filePath, filePath);
    }

    return {
        whereClause: clauses.join(' '),
        params
    };
}

function loadAtomSocietyRows(repo, options = {}) {
    const { offset = 0, limit = 20 } = options;
    const { whereClause, params } = buildSocietyQuery(options);
    const rows = repo.db.prepare(`
        SELECT COUNT(*) OVER() as total_count,
               id, connection_type, source_path, target_path,
               connection_key, context_json, weight, created_at
        FROM semantic_connections
        ${whereClause}
        ORDER BY weight DESC, created_at DESC
        LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return {
        total: rows[0]?.total_count || 0,
        rows
    };
}

function mapSocietyConnection(row) {
    return {
        id: row.id,
        type: row.connection_type,
        source: row.source_path,
        target: row.target_path,
        key: row.connection_key,
        context: JSON.parse(row.context_json || '{}'),
        weight: row.weight,
        createdAt: row.created_at
    };
}

function buildAtomSocietyResult(queryResult, semanticSurface, options = {}) {
    const { offset = 0, limit = 20 } = options;

    return {
        total: queryResult.total,
        offset,
        limit,
        hasMore: offset + limit < queryResult.total,
        granularity: semanticSurface.contract,
        semanticByType: semanticSurface.fileLevel.byType,
        connections: queryResult.rows.map(mapSocietyConnection)
    };
}

function buildDuplicateSummary(stats, hasUsableDnaCoverage, detectedLabel, unavailableLabel) {
    return {
        duplicateGroups: stats.groups || 0,
        totalDuplicateInstances: stats.total_instances || 0,
        status: !hasUsableDnaCoverage
            ? unavailableLabel
            : ((stats.groups || 0) === 0
                ? `No ${detectedLabel} found`
                : `${stats.groups} ${detectedLabel} group(s) detected`)
    };
}

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
        const repo = requireSemanticRepo(this.repo);
        const { rows, total } = queryRaceConditions(repo.db, options);
        const { offset = 0, limit = 20 } = options;
        const races = this.raceHandler.handle(rows);
        return { total, offset, limit, hasMore: offset + limit < total, races };
    }

    async getEventPatterns(options = {}) {
        const repo = requireSemanticRepo(this.repo);
        const { rows, total } = queryEventPatterns(repo.db, options);
        const { offset = 0, limit = 20 } = options;
        const patterns = this.eventHandler.handle(rows);
        return { total, offset, limit, hasMore: offset + limit < total, patterns };
    }

    async getAsyncAnalysis(options = {}) {
        const repo = requireSemanticRepo(this.repo);
        const { rows, total } = queryAsyncAtoms(repo.db, options);
        const { offset = 0, limit = 20 } = options;
        const asyncAtoms = this.asyncHandler.handle(rows);
        return { total, offset, limit, hasMore: offset + limit < total, asyncAtoms };
    }

    async getSocieties(options = {}) {
        const repo = requireSemanticRepo(this.repo);
        const { rows, total } = querySocieties(repo.db, options);
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
        const repo = requireSemanticRepo(this.repo);
        const { rows, stats } = queryDuplicates(repo.db, options);
        const coverage = queryDnaCoverage(repo.db);
        const duplicates = this.duplicateHandler.handle(rows);
        const remediation = buildDuplicateRemediationPlan(duplicates);
        const hasUsableDnaCoverage = (coverage?.duplicateEligibleWithDna || 0) > 0;

        return {
            coverage,
            summary: buildDuplicateSummary(
                stats,
                hasUsableDnaCoverage,
                'logic duplicate',
                'DNA coverage unavailable - duplicate detection disabled'
            ),
            remediation,
            total: duplicates.length,
            duplicates
        };
    }

    async getIsomorphicDuplicates(options = {}) {
        const repo = requireSemanticRepo(this.repo);
        const { rows, stats } = queryIsomorphicDuplicates(repo.db, options);
        const coverage = queryDnaCoverage(repo.db);
        const duplicates = this.duplicateHandler.handle(rows);
        const remediation = buildDuplicateRemediationPlan(duplicates);
        const hasUsableDnaCoverage = (coverage?.duplicateEligibleWithDna || 0) > 0;

        return {
            coverage,
            summary: buildDuplicateSummary(
                stats,
                hasUsableDnaCoverage,
                'isomorphic duplicate',
                'DNA coverage unavailable - isomorphic duplicate detection limited'
            ),
            remediation,
            total: duplicates.length,
            duplicates
        };
    }

    /**
     * Find conceptual duplicates - functions with same semantic purpose but different implementations
     * Uses semanticFingerprint (verb:domain:entity format) to group conceptually similar functions
     * @param {Object} options - Query options
     * @returns {Object} Conceptual duplicate groups with risk assessment
     */
    async getConceptualDuplicates(options = {}) {
        const repo = requireSemanticRepo(this.repo);

        // Use the repository's findConceptualDuplicates method
        const groups = repo.findConceptualDuplicates ?
            repo.findConceptualDuplicates(options) :
            // Fallback: query directly if method not available
            this._queryConceptualDuplicates(repo.db, options);

        // Build summary statistics
        const totalGroups = groups.length;
        const highRisk = groups.filter(g => g.risk === 'high').length;
        const mediumRisk = groups.filter(g => g.risk === 'medium').length;
        const lowRisk = groups.filter(g => g.risk === 'low').length;
        const totalImplementations = groups.reduce((sum, g) => sum + g.implementationCount, 0);
        const withStructuralVariations = groups.filter(g => g.hasStructuralVariations).length;
        const publicApiIssues = groups.filter(g => g.allExported).length;

        return {
            aggregationType: 'conceptual_duplicates',
            summary: {
                totalGroups,
                totalImplementations,
                highRisk,
                mediumRisk,
                lowRisk,
                withStructuralVariations,
                publicApiIssues,
                message: totalGroups > 0
                    ? `Found ${totalGroups} conceptual duplicate groups with ${totalImplementations} total implementations`
                    : 'No conceptual duplicates found - all functions have unique semantic purposes'
            },
            total: totalGroups,
            groups,
            // Provide remediation guidance for top issues
            remediation: totalGroups > 0 ? {
                priority: highRisk > 0 ? 'high' : mediumRisk > 0 ? 'medium' : 'low',
                suggestedActions: [
                    highRisk > 0 && `Consolidate ${highRisk} high-risk groups with 3+ implementations each`,
                    publicApiIssues > 0 && `Review ${publicApiIssues} public API groups where all variants are exported`,
                    withStructuralVariations > 0 && `Standardize ${withStructuralVariations} groups with structural variations`,
                    'Consider creating shared utilities in `src/shared/` for common patterns'
                ].filter(Boolean),
                canonicalReuseGuidance: 'Use existing canonical implementations from src/shared/ when available'
            } : null
        };
    }

    /**
     * Fallback query for conceptual duplicates if repository method not available
     * @private
     */
    _queryConceptualDuplicates(db, options = {}) {
        const minCount = options.minCount || 2;
        const limit = options.limit || 50;

        const stmt = db.prepare(`
            SELECT 
                json_extract(dna_json, '$.semanticFingerprint') as fingerprint,
                COUNT(*) as count
            FROM atoms
            WHERE atom_type IN ('function', 'method', 'arrow')
                AND (is_removed IS NULL OR is_removed = 0)
                AND json_extract(dna_json, '$.semanticFingerprint') IS NOT NULL
            GROUP BY fingerprint
            HAVING count >= ?
            ORDER BY count DESC
            LIMIT ?
        `);

        return stmt.all(minCount, limit);
    }

    async getAtomSociety(options = {}) {
        const repo = requireSemanticRepo(this.repo);
        const semanticSurface = getSemanticSurfaceGranularity(repo.db);
        const queryResult = loadAtomSocietyRows(repo, options);
        return buildAtomSocietyResult(queryResult, semanticSurface, options);
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
