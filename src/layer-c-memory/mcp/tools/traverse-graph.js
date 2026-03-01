import { SemanticQueryTool } from './semantic/semantic-query-tool.js';

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
export class TraverseGraphTool extends SemanticQueryTool {
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

        this.logger.debug(`Executing traverse:graph -> ${traverseType}`, { filePath, symbolName, options });

        const innerArgs = { filePath, symbolName, variableName, ...options };

        try {
            switch (traverseType) {
                case 'impact_map': {
                    if (!filePath) return this.formatError('MISSING_PARAMS', 'filePath required for impact_map');
                    const fileData = await getFileAnalysis(this.projectPath, filePath);
                    if (!fileData) return this.formatError('NOT_FOUND', `File ${filePath} not found in index`);

                    const directDeps = await getFileDependents(this.projectPath, filePath);
                    const transDeps = await getTransitiveDependents(this.projectPath, filePath);

                    const result = {
                        file: filePath,
                        directlyAffects: directDeps,
                        transitiveAffects: transDeps,
                        totalAffected: directDeps.length + transDeps.length,
                        riskLevel: fileData.riskScore?.severity || 'low',
                        subsystem: fileData.subsystem || 'unknown',
                        exports: (fileData.exports || []).map(e => e.name)
                    };

                    // Agregar datos semánticos si se solicitan
                    if (options.includeSemantic) {
                        result.semanticSummary = {
                            hasSharedState: (fileData.semanticAnalysis?.sharedState?.reads?.length || 0) > 0 ||
                                           (fileData.semanticAnalysis?.sharedState?.writes?.length || 0) > 0,
                            hasEvents: (fileData.semanticAnalysis?.eventPatterns?.eventEmitters?.length || 0) > 0 ||
                                      (fileData.semanticAnalysis?.eventPatterns?.eventListeners?.length || 0) > 0,
                            sharedStateReads: fileData.semanticAnalysis?.sharedState?.reads || [],
                            sharedStateWrites: fileData.semanticAnalysis?.sharedState?.writes || [],
                            eventEmitters: fileData.semanticAnalysis?.eventPatterns?.eventEmitters || [],
                            eventListeners: fileData.semanticAnalysis?.eventPatterns?.eventListeners || []
                        };
                    }

                    return this.formatSuccess(result);
                }

                case 'call_graph': {
                    if (!filePath) return this.formatError('MISSING_PARAMS', 'filePath required for call_graph');
                    const depthNum = parseInt(options.depth || options.maxDepth || 2, 10);
                    const tree = await getDependencyGraph(this.projectPath, filePath, depthNum);

                    const result = {
                        root: filePath,
                        depth: depthNum,
                        graph: tree
                    };

                    // Agregar datos semánticos si se solicitan
                    if (options.includeSemantic) {
                        // Enriquecer nodos del grafo con datos semánticos
                        result.graph = this._enrichGraphWithSemantic(tree);
                    }

                    return this.formatSuccess(result);
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

    /**
     * Enriquece el grafo de dependencias con datos semánticos
     * @param {Object} tree - Árbol de dependencias
     * @returns {Object} Árbol enriquecido
     * @private
     */
    _enrichGraphWithSemantic(tree) {
        if (!tree || !tree.nodes) return tree;

        // Para cada nodo, agregar datos semánticos si existen
        tree.nodes = tree.nodes.map(node => {
            if (!this.repo) return node;

            // Buscar átomos en este archivo
            const atoms = this.repo.query({ filePath: node.file || node.filePath, limit: 100 });
            
            if (atoms.length === 0) return node;

            // Calcular resumen semántico del archivo
            const hasSharedState = atoms.some(a => a.shared_state_json && a.shared_state_json !== '[]');
            const hasEvents = atoms.some(a => 
                (a.event_emitters_json && a.event_emitters_json !== '[]') ||
                (a.event_listeners_json && a.event_listeners_json !== '[]')
            );
            const asyncCount = atoms.filter(a => a.is_async).length;

            return {
                ...node,
                semantic: {
                    hasSharedState,
                    hasEvents,
                    asyncCount,
                    totalAtoms: atoms.length
                }
            };
        });

        return tree;
    }
}

export const traverse_graph = async (args, context) => {
    const tool = new TraverseGraphTool();
    return tool.execute(args, context);
};

export default { traverse_graph };
