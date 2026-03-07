
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
import { SocietyHandler } from './handlers/society-handler.js';

/**
 * requireSemanticRepo
 * Ensures the repository is available for semantic queries.
 */
function requireSemanticRepo(repo) {
    if (!repo) {
        throw new Error('Repository not initialized');
    }
    return repo;
}

/**
 * SemanticQueryTool
 *
 * Base tool for semantic graph queries. orchestrates multiple handlers
 * to provide insights into race conditions, event patterns, duplicates,
 * and functional societies.
 */
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
        this.societyHandler = new SocietyHandler(this.logger);
    }

    async getRaceConditions(options = {}) {
        const repo = requireSemanticRepo(this.repo);
        const { rows, total } = queryRaceConditions(repo.db, { ...options, includeRemoved: !!options.includeRemoved });
        const { offset = 0, limit = 20 } = options;
        const races = this.raceHandler.handle(rows);
        return { total, offset, limit, hasMore: offset + limit < total, races };
    }

    async getEventPatterns(options = {}) {
        const repo = requireSemanticRepo(this.repo);
        const { rows, total } = queryEventPatterns(repo.db, { ...options, includeRemoved: !!options.includeRemoved });
        const { offset = 0, limit = 20 } = options;
        const patterns = this.eventHandler.handle(rows);
        return { total, offset, limit, hasMore: offset + limit < total, patterns };
    }

    async getAsyncAnalysis(options = {}) {
        const repo = requireSemanticRepo(this.repo);
        const { rows, total } = queryAsyncAtoms(repo.db, { ...options, includeRemoved: !!options.includeRemoved });
        const { offset = 0, limit = 20 } = options;
        const asyncAtoms = this.asyncHandler.handle(rows);
        return { total, offset, limit, hasMore: offset + limit < total, asyncAtoms };
    }

    async getSocieties(options = {}) {
        const repo = requireSemanticRepo(this.repo);
        const { rows, total } = querySocieties(repo.db, { ...options, includeRemoved: !!options.includeRemoved });
        const { offset = 0, limit = 20 } = options;
        const societies = this.societyHandler.mapSocieties(rows);
        return { total, offset, limit, hasMore: offset + limit < total, societies };
    }

    async getDuplicates(options = {}) {
        const repo = requireSemanticRepo(this.repo);
        const { rows, stats } = queryDuplicates(repo.db, { ...options, includeRemoved: !!options.includeRemoved });
        const coverage = queryDnaCoverage(repo.db);
        const duplicates = this.duplicateHandler.handle(rows);
        const remediation = buildDuplicateRemediationPlan(duplicates);
        const hasUsableDnaCoverage = (coverage?.duplicateEligibleWithDna || 0) > 0;

        return {
            coverage,
            summary: this.duplicateHandler.buildSummary(
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
        const { rows, stats } = queryIsomorphicDuplicates(repo.db, { ...options, includeRemoved: !!options.includeRemoved });
        const coverage = queryDnaCoverage(repo.db);
        const duplicates = this.duplicateHandler.handle(rows);
        const remediation = buildDuplicateRemediationPlan(duplicates);
        const hasUsableDnaCoverage = (coverage?.duplicateEligibleWithDna || 0) > 0;

        return {
            coverage,
            summary: this.duplicateHandler.buildSummary(
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

    async getConceptualDuplicates(options = {}) {
        const repo = requireSemanticRepo(this.repo);
        const groups = repo.findConceptualDuplicates ?
            repo.findConceptualDuplicates(options) :
            this._queryConceptualDuplicates(repo.db, options);

        const summary = this._buildConceptualSummary(groups);

        return {
            aggregationType: 'conceptual_duplicates',
            summary,
            total: groups.length,
            groups,
            remediation: groups.length > 0 ? this._buildConceptualRemediation(summary) : null
        };
    }

    _buildConceptualSummary(groups) {
        const totalGroups = groups.length;
        const highRisk = groups.filter(g => g.risk === 'high').length;
        return {
            totalGroups,
            totalImplementations: groups.reduce((sum, g) => sum + g.implementationCount, 0),
            highRisk,
            mediumRisk: groups.filter(g => g.risk === 'medium').length,
            lowRisk: groups.filter(g => g.risk === 'low').length,
            message: totalGroups > 0
                ? `Found ${totalGroups} conceptual duplicate groups`
                : 'No conceptual duplicates found'
        };
    }

    _buildConceptualRemediation(summary) {
        return {
            priority: summary.highRisk > 0 ? 'high' : 'medium',
            suggestedActions: [
                summary.highRisk > 0 && `Consolidate ${summary.highRisk} high-risk groups`,
                'Standardize groups with structural variations'
            ].filter(Boolean)
        };
    }

    _queryConceptualDuplicates(db, options = {}) {
        const minCount = options.minCount || 2;
        const limit = options.limit || 50;
        return db.prepare(`
            SELECT 
                json_extract(dna_json, '$.semanticFingerprint') as fingerprint,
                COUNT(*) as count
            FROM atoms
            WHERE atom_type IN ('function', 'method', 'arrow')
                AND (${options.includeRemoved ? '1=1' : 'is_removed IS NULL OR is_removed = 0'})
                AND json_extract(dna_json, '$.semanticFingerprint') IS NOT NULL
            GROUP BY fingerprint
            HAVING count >= ?
            ORDER BY count DESC
            LIMIT ?
        `).all(minCount, limit);
    }

    async getAtomSociety(options = {}) {
        const repo = requireSemanticRepo(this.repo);
        const semanticSurface = getSemanticSurfaceGranularity(repo.db);
        const queryResult = this.societyHandler.loadRows(repo.db, options);
        return this.societyHandler.buildResult(queryResult, semanticSurface, options);
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
