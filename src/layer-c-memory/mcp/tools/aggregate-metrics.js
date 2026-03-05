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
        const {
            aggregationType,
            filePath,
            options = {}
        } = args;

        if (!aggregationType) {
            return this.formatError('MISSING_PARAMS', 'aggregationType is required');
        }

        this.logger.debug(`Executing aggregate:metrics -> ${aggregationType}`, { filePath, options });

        try {
            switch (aggregationType) {
                case 'health': {
                    const health = await handleHealthMetrics(this, this.projectPath);
                    return this.formatSuccess(health);
                }

                case 'pipeline_health': {
                    const diagnostic = await handlePipelineHealth(this);
                    return this.formatSuccess({
                        aggregationType: 'pipeline_health',
                        ...diagnostic
                    });
                }

                case 'modules': {
                    const metadata = await getProjectMetadata(this.projectPath);
                    return this.formatSuccess({
                        modules: metadata.modules || [],
                        totalFiles: metadata.totalFiles
                    });
                }

                case 'molecule': {
                    if (!filePath) return this.formatError('MISSING_PARAMS', 'filePath required');
                    const fileData = await getFileAnalysis(this.projectPath, filePath);
                    if (!fileData) return this.formatError('NOT_FOUND', `File ${filePath} not found`);

                    return this.formatSuccess({
                        file: filePath,
                        atomsCount: (fileData.atoms || []).length,
                        riskScore: fileData.riskScore
                    });
                }

                case 'risk': {
                    const riskData = await getRiskAssessment(this.projectPath);
                    return this.formatSuccess({ ...riskData });
                }

                case 'race_conditions': {
                    const result = await this.getRaceConditions({
                        offset: options.offset || 0,
                        limit: options.limit || 20,
                        scopeType: options.scopeType,
                        asyncOnly: options.asyncOnly !== false,
                        minSeverity: options.minSeverity || 0
                    });

                    return this.formatSuccess({
                        aggregationType: 'race_conditions',
                        ...result,
                        summary: {
                            totalRaces: result.total,
                            highSeverity: result.races.filter(r => r.severity >= 7).length,
                            mediumSeverity: result.races.filter(r => r.severity >= 4 && r.severity < 7).length,
                            lowSeverity: result.races.filter(r => r.severity < 4).length
                        }
                    });
                }

                case 'patterns': {
                    const result = await handlePatterns(this, options);
                    return this.formatSuccess(result);
                }

                case 'async_analysis': {
                    const result = await handleAsyncAnalysis(this, options);
                    return this.formatSuccess(result);
                }

                case 'society': {
                    const result = await this.getSocieties({
                        offset: options.offset || 0,
                        limit: options.limit || 20,
                        type: options.societyType
                    });

                    return this.formatSuccess({
                        aggregationType: 'societies',
                        ...result,
                        summary: {
                            totalSocieties: result.total,
                            functional: result.societies.filter(s => s.type === 'functional').length,
                            avgCohesion: result.societies.reduce((sum, s) => sum + s.cohesion, 0) / (result.societies.length || 1)
                        }
                    });
                }

                case 'duplicates': {
                    const result = await this.getDuplicates({
                        offset: options.offset || 0,
                        limit: options.limit || 20
                    });
                    return this.formatSuccess({ aggregationType: 'duplicates', ...result });
                }

                case 'isomorphism': {
                    const result = await this.getIsomorphicDuplicates({
                        offset: options.offset || 0,
                        limit: options.limit || 20
                    });
                    return this.formatSuccess({ aggregationType: 'isomorphism', ...result });
                }

                case 'watcher_alerts': {
                    const result = await handleWatcherAlerts(this, this.repo?.db, options, filePath);
                    if (result.error) return result; // MISSING_DB pre-formatError from handler
                    return this.formatSuccess(result);
                }

                default:
                    return this.formatError('INVALID_PARAM', `Unknown aggregationType: ${aggregationType}`);
            }
        } catch (error) {
            this.logger.error(`[AggregateMetrics] Error: ${error.message}`);
            return this.formatError('EXECUTION_ERROR', `Error executing aggregation ${aggregationType}: ${error.message}`);
        }
    }
}

export const aggregate_metrics = async (args, context) => {
    const tool = new AggregateMetricsTool();
    return tool.execute(args, context);
};

export default { aggregate_metrics };
