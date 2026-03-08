import { SemanticQueryTool } from './semantic/semantic-query-tool.js';
import { getProjectMetadata } from '../../query/apis/project-api.js';
import { getFileAnalysis } from '../../query/apis/file-api.js';
import { getRiskAssessment } from '../../query/queries/risk-query.js';

// Nuevos manejadores modulares
import { handleHealthMetrics } from './handlers/health-handler.js';
import { aggregatePipelineHealth } from './handlers/pipeline-health-handler.js';
import { handleWatcherAlerts } from './handlers/watcher-handler.js';
import { handlePatterns, handleAsyncAnalysis } from './handlers/patterns-handler.js';
import { handlePrioritizedBacklog } from './handlers/prioritized-backlog-handler.js';

/**
 * mcp_omnysystem_aggregate_metrics
 *
 * Router unificado para extraer métricas agrupadas y detectar patrones.
 * Delega en SemanticQueryTool para consultas base y en handlers especializados para lógica compleja.
 */
export class AggregateMetricsTool extends SemanticQueryTool {
    constructor() {
        super('aggregate:metrics');
    }

    async performAction(args) {
        const { aggregationType, filePath, options = {} } = args;

        return this.runRoutedAction({
            routeKey: 'aggregationType',
            routeValue: aggregationType,
            handlers: this._buildAggregationHandlers(filePath, options),
            debugMessage: `Executing aggregate:metrics -> ${aggregationType}`,
            debugContext: { filePath, options },
            executionErrorMessage: (error) =>
                `Error executing aggregation ${aggregationType}: ${error.message}`
        });
    }

    _buildAggregationHandlers(filePath, options) {
        return {
            health: async () => this.formatSuccess(await handleHealthMetrics(this, this.projectPath)),
            pipeline_health: async () => this.formatSuccess({ aggregationType: 'pipeline_health', ...(await aggregatePipelineHealth(this)) }),
            modules: async () => this._handleModules(),
            molecule: async () => this._handleMolecule(filePath),
            risk: async () => this.formatSuccess({ ...(await getRiskAssessment(this.projectPath)) }),
            race_conditions: async () => this.formatSuccess(await this._handleRaceConditions(options)),
            patterns: async () => this.formatSuccess(await handlePatterns(this, options)),
            async_analysis: async () => this.formatSuccess(await handleAsyncAnalysis(this, options)),
            society: async () => this.formatSuccess(await this._handleSociety(options)),
            duplicates: async () => this.formatSuccess({ aggregationType: 'duplicates', ...(await this.getDuplicates(this._getPaginationOpts(options))) }),
            isomorphism: async () => this.formatSuccess({ aggregationType: 'isomorphism', ...(await this.getIsomorphicDuplicates(this._getPaginationOpts(options))) }),
            conceptual_duplicates: async () => this.formatSuccess(await this.getConceptualDuplicates(options)),
            watcher_alerts: async () => {
                const result = await handleWatcherAlerts(this, this.repo?.db, options, filePath);
                return result.error ? result : this.formatSuccess(result);
            },
            prioritized_backlog: async () => this.formatSuccess(await handlePrioritizedBacklog(this, this.projectPath, options))
        };
    }

    _getPaginationOpts(options) {
        return { offset: options.offset || 0, limit: options.limit || 20 };
    }

    async _handleModules() {
        const metadata = await getProjectMetadata(this.projectPath);
        return { modules: metadata.modules || [], totalFiles: metadata.totalFiles };
    }

    async _handleMolecule(filePath) {
        if (!filePath) {
            return this.formatError('MISSING_PARAMS', 'filePath required');
        }

        const fileData = await getFileAnalysis(this.projectPath, filePath);
        if (!fileData) {
            return this.formatError('NOT_FOUND', `File ${filePath} not found`);
        }

        return this.formatSuccess({
            file: filePath,
            atomsCount: (fileData.atoms || []).length,
            riskScore: fileData.riskScore
        });
    }

    async _handleRaceConditions(options) {
        const result = await this.getRaceConditions({
            ...this._getPaginationOpts(options),
            scopeType: options.scopeType,
            asyncOnly: options.asyncOnly !== false,
            minSeverity: options.minSeverity || 0
        });

        return {
            aggregationType: 'race_conditions',
            ...result,
            summary: {
                totalRaces: result.total,
                highSeverity: result.races.filter(r => r.severity >= 7).length,
                mediumSeverity: result.races.filter(r => r.severity >= 4 && r.severity < 7).length,
                lowSeverity: result.races.filter(r => r.severity < 4).length
            }
        };
    }

    async _handleSociety(options) {
        const result = await this.getSocieties({
            ...this._getPaginationOpts(options),
            type: options.societyType
        });

        return {
            aggregationType: 'societies',
            ...result,
            summary: {
                totalSocieties: result.total,
                functional: result.societies.filter(s => s.type === 'functional').length,
                avgCohesion: result.societies.reduce((sum, s) => sum + s.cohesion, 0) / (result.societies.length || 1)
            }
        };
    }
}

export const aggregate_metrics = async (args, context) => {
    const tool = new AggregateMetricsTool();
    return tool.execute(args, context);
};

export default { aggregate_metrics };
