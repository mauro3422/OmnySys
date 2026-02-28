import { GraphQueryTool } from '../core/shared/base-tools/graph-query-tool.js';

import { getProjectStats, getProjectMetadata } from '../../query/apis/project-api.js';
import { getFileAnalysis } from '../../query/apis/file-api.js';
import { getRiskAssessment } from '../../query/queries/risk-query.js';

/**
 * mcp_omnysystem_aggregate_metrics
 * 
 * Replaces:
 * - get_health_metrics
 * - get_module_overview
 * - get_molecule_summary
 * - detect_patterns
 * - detect_race_conditions
 * - get_async_analysis
 * - get_risk_assessment
 * - get_atom_society
 */
export class AggregateMetricsTool extends GraphQueryTool {
    constructor() {
        super('aggregate:metrics');
    }

    async performAction(args) {
        const {
            aggregationType, // 'health' | 'modules' | 'molecule' | 'patterns' | 'race_conditions' | 'async_analysis' | 'risk' | 'society'
            filePath,        // Optional filter
            options = {}     // Additional parameters (limit, minSeverity, patternType, etc.)
        } = args;

        if (!aggregationType) {
            return this.formatError('MISSING_PARAMS', 'aggregationType is required', {
                allowedValues: ['health', 'modules', 'molecule', 'patterns', 'race_conditions', 'async_analysis', 'risk', 'society']
            });
        }

        this.logger.debug(`Executing aggregate:metrics -> ${aggregationType}`, { filePath });

        const innerArgs = { filePath, ...options };

        try {
            switch (aggregationType) {
                case 'health': {
                    const stats = await getProjectStats(this.projectPath);
                    return this.formatSuccess({
                        project: this.projectPath,
                        globalHealth: stats.health,
                        quality: stats.quality
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
                    if (!filePath) return this.formatError('MISSING_PARAMS', 'filePath required for molecule summary');
                    const fileData = await getFileAnalysis(this.projectPath, filePath);
                    if (!fileData) return this.formatError('NOT_FOUND', `File ${filePath} not found`);

                    return this.formatSuccess({
                        file: filePath,
                        atomsCount: (fileData.atoms || []).length,
                        exportsCount: (fileData.exports || []).length,
                        importsCount: (fileData.imports || []).length,
                        riskScore: fileData.riskScore
                    });
                }

                case 'risk': {
                    const riskData = await getRiskAssessment(this.projectPath);
                    return this.formatSuccess({
                        ...riskData
                    });
                }

                case 'patterns':
                case 'race_conditions':
                case 'async_analysis':
                case 'society':
                    // Funcionalidades legacy de algoritmos puramente estáticos que ya no operan al vuelo.
                    // Fase 17 consolida esto bajo métricas de "risk" o "health" calculadas en background por Layer A.
                    return this.formatError('DEPRECATED_ROUTING',
                        `The complex metric tool '${aggregationType}' has been deprecated to avoid expensive on-the-fly AST parsing. ` +
                        `Use 'health' or 'risk' aggregation to get the background job's unified conclusions.`
                    );

                default:
                    return this.formatError('INVALID_PARAM', `Unknown aggregationType: ${aggregationType}`);
            }
        } catch (error) {
            return this.formatError('EXECUTION_ERROR', `Error executing aggregation ${aggregationType}: ${error.message}`);
        }
    }
}

export const aggregate_metrics = async (args, context) => {
    const tool = new AggregateMetricsTool();
    return tool.execute(args, context);
};

export default { aggregate_metrics };
