import { BaseMCPTool } from '../../core/shared/base-tools/base-tool.js';
import {
    loadRaceConditions,
    loadEventPatterns,
    loadAsyncAnalysis,
    loadSocieties
} from './semantic-query-tool/paginated-queries.js';
import {
    buildSemanticDuplicateResult,
    buildSemanticConceptualDuplicateResult,
    buildSemanticSocietyResult,
    requireSemanticRepo
} from './semantic-query-tool-helpers.js';

import { RaceConditionHandler } from './handlers/race-condition-handler.js';
import { DuplicateHandler } from './handlers/duplicate-handler.js';
import { EventPatternHandler } from './handlers/event-pattern-handler.js';
import { AsyncAnalysisHandler } from './handlers/async-analysis-handler.js';
import { SocietyHandler } from './handlers/society-handler.js';

/**
 * SemanticQueryTool
 *
 * Base tool for semantic graph queries. orchestrates multiple handlers
 * to provide insights into race conditions, event patterns, duplicates,
 * and functional societies.
 */
export class SemanticQueryTool extends BaseMCPTool {
    constructor(toolName) {
        super(toolName);
        this._initHandlers();
    }

    async execute(args, context) {
        try {
            const { getRepository } = await import('../../../storage/repository/repository-factory.js');
            this.repo = getRepository(context.projectPath);
            this.projectPath = context.projectPath;
        } catch (e) {
            this.logger.error(`[SemanticQueryTool] Failed to load repository: ${e.message}`);
            return this.formatError('REPO_UNAVAILABLE', 'Could not load Graph Repository');
        }

        return super.execute(args, context);
    }

    getAtomsByFile(filePath) {
        if (!this.repo) return [];
        return this.repo.query({ filePath, limit: 10000 });
    }

    getExactAtom(name, filePath) {
        if (!this.repo) return null;
        const atoms = this.repo.query({ name, filePath });
        return atoms.length > 0 ? atoms[0] : null;
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
        return buildSemanticDuplicateResult({
            repo: this.repo,
            duplicateHandler: this.duplicateHandler,
            options,
            mode: 'duplicates'
        });
    }

    async getIsomorphicDuplicates(options = {}) {
        return buildSemanticDuplicateResult({
            repo: this.repo,
            duplicateHandler: this.duplicateHandler,
            options,
            mode: 'isomorphic'
        });
    }

    async getConceptualDuplicates(options = {}) {
        return buildSemanticConceptualDuplicateResult(this.repo, options);
    }

    async getAtomSociety(options = {}) {
        return buildSemanticSocietyResult({
            repo: this.repo,
            societyHandler: this.societyHandler,
            options
        });
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
