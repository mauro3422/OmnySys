
import { GraphQueryTool } from '../../core/shared/base-tools/graph-query-tool.js';
import {
    buildDuplicateRemediationPlan,
    getSemanticSurfaceGranularity
} from '../../../../shared/compiler/index.js';
import {
    queryDuplicates,
    queryIsomorphicDuplicates,
    queryDnaCoverage
} from './semantic-queries.js';
import {
    loadRaceConditions,
    loadEventPatterns,
    loadAsyncAnalysis,
    loadSocieties
} from './semantic-query-tool/paginated-queries.js';
import { loadConceptualDuplicates } from './semantic-query-tool/conceptual-duplicates.js';

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
        return loadRaceConditions(repo, this.raceHandler, options);
    }

    async getEventPatterns(options = {}) {
        const repo = requireSemanticRepo(this.repo);
        return loadEventPatterns(repo, this.eventHandler, options);
    }

    async getAsyncAnalysis(options = {}) {
        const repo = requireSemanticRepo(this.repo);
        return loadAsyncAnalysis(repo, this.asyncHandler, options);
    }

    async getSocieties(options = {}) {
        const repo = requireSemanticRepo(this.repo);
        return loadSocieties(repo, this.societyHandler, options);
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
        return loadConceptualDuplicates(repo, options);
    }

    async getAtomSociety(options = {}) {
        const repo = requireSemanticRepo(this.repo);
        const semanticSurface = getSemanticSurfaceGranularity(repo.db);
        const queryResult = this.societyHandler.loadRows(semanticSurface, options);
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
