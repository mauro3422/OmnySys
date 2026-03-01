import { SemanticQueryTool } from './semantic/semantic-query-tool.js';

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
export class AggregateMetricsTool extends SemanticQueryTool {
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

        this.logger.debug(`Executing aggregate:metrics -> ${aggregationType}`, { filePath, options });

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

                // ========================================
                // FUNCIONALIDADES REACTIVADAS (SQLite)
                // ========================================

                case 'race_conditions': {
                    // Consulta SQLite: átomos con shared state + async
                    const result = await this.getRaceConditions({
                        offset: options.offset || 0,
                        limit: options.limit || 20,
                        scopeType: options.scopeType,
                        asyncOnly: options.asyncOnly !== false, // default true
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
                    // Consulta SQLite: event emitters/listeners
                    const result = await this.getEventPatterns({
                        offset: options.offset || 0,
                        limit: options.limit || 20,
                        type: options.patternType || 'all', // 'emitters', 'listeners', 'all'
                        minSeverity: options.minSeverity || 0
                    });

                    return this.formatSuccess({
                        aggregationType: 'patterns',
                        ...result,
                        summary: {
                            totalPatterns: result.total,
                            emitters: result.patterns.filter(p => p.hasEmitters).length,
                            listeners: result.patterns.filter(p => p.hasListeners).length,
                            both: result.patterns.filter(p => p.hasEmitters && p.hasListeners).length
                        }
                    });
                }

                case 'async_analysis': {
                    // Consulta SQLite: funciones asíncronas
                    const result = await this.getAsyncAnalysis({
                        offset: options.offset || 0,
                        limit: options.limit || 20,
                        withNetworkCalls: options.withNetworkCalls || false,
                        withErrorHandling: options.withErrorHandling || false
                    });

                    return this.formatSuccess({
                        aggregationType: 'async_analysis',
                        ...result,
                        summary: {
                            totalAsync: result.total,
                            withNetworkCalls: result.asyncAtoms.filter(a => a.hasNetworkCalls).length,
                            withErrorHandling: result.asyncAtoms.filter(a => a.hasErrorHandling).length,
                            highComplexity: result.asyncAtoms.filter(a => a.complexity > 10).length
                        }
                    });
                }

                case 'society': {
                    // Consulta SQLite: conexiones semánticas entre archivos
                    const result = await this.getAtomSociety({
                        offset: options.offset || 0,
                        limit: options.limit || 20,
                        connectionType: options.connectionType || 'all', // 'shared_state', 'event', 'all'
                        filePath: options.filePath
                    });

                    return this.formatSuccess({
                        aggregationType: 'society',
                        ...result,
                        summary: {
                            totalConnections: result.total,
                            byType: this._groupByType(result.connections)
                        }
                    });
                }

                default:
                    return this.formatError('INVALID_PARAM', `Unknown aggregationType: ${aggregationType}`, {
                        allowedValues: ['health', 'modules', 'molecule', 'patterns', 'race_conditions', 'async_analysis', 'risk', 'society']
                    });
            }
        } catch (error) {
            this.logger.error(`[AggregateMetrics] Error: ${error.message}`);
            return this.formatError('EXECUTION_ERROR', `Error executing aggregation ${aggregationType}: ${error.message}`);
        }
    }

    /**
     * Agrupa conexiones por tipo
     * @param {Array} connections 
     * @returns {Object}
     * @private
     */
    _groupByType(connections) {
        return connections.reduce((acc, conn) => {
            acc[conn.type] = (acc[conn.type] || 0) + 1;
            return acc;
        }, {});
    }
}

export const aggregate_metrics = async (args, context) => {
    const tool = new AggregateMetricsTool();
    return tool.execute(args, context);
};

export default { aggregate_metrics };
