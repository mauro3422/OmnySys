import { SemanticQueryTool } from './semantic/semantic-query-tool.js';

import { getProjectMetadata } from '../../query/apis/project-api.js';
import { getFileAnalysis } from '../../query/apis/file-api.js';
import { getRiskAssessment } from '../../query/queries/risk-query.js';

// Nuevos manejadores modulares
import { handleHealthMetrics } from './handlers/health-handler.js';
import { handlePipelineHealth } from './handlers/pipeline-health-handler.js';
import { handleWatcherAlerts } from './handlers/watcher-handler.js';
import { handlePatterns, handleAsyncAnalysis } from './handlers/patterns-handler.js';

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

        if (!aggregationType) {
            return this.formatError('MISSING_PARAMS', 'aggregationType is required');
        }

        this.logger.debug(`Executing aggregate:metrics -> ${aggregationType}`, { filePath, options });

        try {
            switch (aggregationType) {
                case 'health': return this.formatSuccess(await handleHealthMetrics(this, this.projectPath));
                case 'pipeline_health': return this.formatSuccess({ aggregationType: 'pipeline_health', ...(await handlePipelineHealth(this)) });
                case 'modules': return this.formatSuccess(await this._handleModules());
                case 'molecule': return await this._handleMolecule(filePath);
                case 'risk': return this.formatSuccess({ ...(await getRiskAssessment(this.projectPath)) });
                case 'race_conditions': return this.formatSuccess(await this._handleRaceConditions(options));
                case 'patterns': return this.formatSuccess(await handlePatterns(this, options));
                case 'async_analysis': return this.formatSuccess(await handleAsyncAnalysis(this, options));
                case 'society': return this.formatSuccess(await this._handleSociety(options));
                case 'duplicates': return this.formatSuccess({ aggregationType: 'duplicates', ...(await this.getDuplicates(this._getPaginationOpts(options))) });
                case 'isomorphism': return this.formatSuccess({ aggregationType: 'isomorphism', ...(await this.getIsomorphicDuplicates(this._getPaginationOpts(options))) });
                case 'watcher_alerts': {
                    const result = await handleWatcherAlerts(this, this.repo?.db, options, filePath);
                    return result.error ? result : this.formatSuccess(result);
                }
                default: return this.formatError('INVALID_PARAM', `Unknown aggregationType: ${aggregationType}`);
            }
        } catch (error) {
            this.logger.error(`[AggregateMetrics] Error: ${error.message}`);
            return this.formatError('EXECUTION_ERROR', `Error executing aggregation ${aggregationType}: ${error.message}`);
        }
    }

    _getPaginationOpts(options) {
        return { offset: options.offset || 0, limit: options.limit || 20 };
    }

    async _handleModules() {
        const metadata = await getProjectMetadata(this.projectPath);
        return { modules: metadata.modules || [], totalFiles: metadata.totalFiles };
    }

    async _handleMolecule(filePath) {
        if (!filePath) return this.formatError('MISSING_PARAMS', 'filePath required');
        const fileData = await getFileAnalysis(this.projectPath, filePath);
        if (!fileData) return this.formatError('NOT_FOUND', `File ${filePath} not found`);
        return this.formatSuccess({
            file: filePath,
            atomsCount: (fileData.atoms || []).length,
            riskScore: fileData.riskScore
        });
    }

    async _handleRaceConditions(options) {
        const opts = { ...this._getPaginationOpts(options), scopeType: options.scopeType, asyncOnly: options.asyncOnly !== false, minSeverity: options.minSeverity || 0 };
        const result = await this.getRaceConditions(opts);
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
        const result = await this.getSocieties({ ...this._getPaginationOpts(options), type: options.societyType });
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
