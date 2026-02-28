import { GraphQueryTool } from '../core/shared/base-tools/graph-query-tool.js';

import { getFileAnalysis, getFileDependents } from '../../query/apis/file-api.js';
import { getDependencyGraph, getTransitiveDependents } from '../../query/queries/dependency-query.js';

/**
 * mcp_omnysystem_traverse_graph
 * 
 * Replaces:
 * - get_impact_map
 * - get_call_graph
 * - analyze_change
 * - simulate_data_journey
 * - trace_variable_impact
 * - trace_data_journey
 * - explain_connection
 * - analyze_signature_change
 */
export class TraverseGraphTool extends GraphQueryTool {
    constructor() {
        super('traverse:graph');
    }

    async performAction(args) {
        const {
            traverseType,
            filePath,
            symbolName,
            variableName,
            options = {}
        } = args;

        if (!traverseType) {
            return this.formatError('MISSING_PARAMS', 'traverseType is required', {
                allowedValues: ['impact_map', 'call_graph', 'analyze_change', 'simulate_data_journey', 'trace_variable', 'trace_data_flow', 'explain_connection', 'signature_change']
            });
        }

        this.logger.debug(`Executing traverse:graph -> ${traverseType}`, { filePath, symbolName });

        const innerArgs = { filePath, symbolName, variableName, ...options };

        try {
            switch (traverseType) {
                case 'impact_map': {
                    if (!filePath) return this.formatError('MISSING_PARAMS', 'filePath required for impact_map');
                    const fileData = await getFileAnalysis(this.projectPath, filePath);
                    if (!fileData) return this.formatError('NOT_FOUND', `File ${filePath} not found in index`);

                    const directDeps = await getFileDependents(this.projectPath, filePath);
                    const transDeps = await getTransitiveDependents(this.projectPath, filePath);

                    return this.formatSuccess({
                        file: filePath,
                        directlyAffects: directDeps,
                        transitiveAffects: transDeps,
                        totalAffected: directDeps.length + transDeps.length,
                        riskLevel: fileData.riskScore?.severity || 'low',
                        subsystem: fileData.subsystem || 'unknown',
                        exports: (fileData.exports || []).map(e => e.name)
                    });
                }

                case 'call_graph': {
                    if (!filePath) return this.formatError('MISSING_PARAMS', 'filePath required for call_graph');
                    const depthNum = parseInt(options.depth || options.maxDepth || 2, 10);
                    const tree = await getDependencyGraph(this.projectPath, filePath, depthNum);

                    // Solo devolver el árbol formateado 
                    return this.formatSuccess({
                        root: filePath,
                        depth: depthNum,
                        graph: tree
                    });
                }

                case 'analyze_change':
                case 'simulate_data_journey':
                case 'trace_variable':
                case 'trace_data_flow':
                case 'explain_connection':
                case 'signature_change':
                    // Estas funcionalidades hiper-específicas de Data Flow eran simuladas por el LLM o no eran reales en SQLite.
                    // Fase 17 consolida esto bajo un prompt estructurado tras pedir el `impact_map` o `query_graph(value_flow)`.
                    return this.formatError('DEPRECATED_ROUTING',
                        `The complex traversal '${traverseType}' has been deprecated to simplify the MCP. ` +
                        `Instead, please use 'impact_map' or 'call_graph' first to get structural boundaries, ` +
                        `and then use 'mcp_omnysystem_query_graph' with queryType 'value_flow' for deeper IO details.`
                    );

                default:
                    return this.formatError('INVALID_PARAM', `Unknown traverseType: ${traverseType}`);
            }
        } catch (error) {
            return this.formatError('EXECUTION_ERROR', `Error executing traversal ${traverseType}: ${error.message}`);
        }
    }
}

export const traverse_graph = async (args, context) => {
    const tool = new TraverseGraphTool();
    return tool.execute(args, context);
};

export default { traverse_graph };
