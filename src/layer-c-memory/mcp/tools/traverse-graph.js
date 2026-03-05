import { SemanticQueryTool } from './semantic/semantic-query-tool.js';
import { ImpactMapStrategy } from './traverse/strategies/impact-map-strategy.js';
import { CallGraphStrategy } from './traverse/strategies/call-graph-strategy.js';

/**
 * mcp_omnysystem_traverse_graph
 */
export class TraverseGraphTool extends SemanticQueryTool {
    constructor() {
        super('traverse:graph');
        this._initStrategies();
    }

    _initStrategies() {
        this.impactStrategy = new ImpactMapStrategy();
        this.callGraphStrategy = new CallGraphStrategy(this.repo);
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
                allowedValues: ['impact_map', 'call_graph']
            });
        }

        this.logger.debug(`Executing traverse:graph -> ${traverseType}`, { filePath, symbolName, options });

        try {
            switch (traverseType) {
                case 'impact_map': {
                    const result = await this.impactStrategy.execute(this.projectPath, filePath, options);
                    return this.formatSuccess(result);
                }

                case 'call_graph': {
                    // Re-inject safe repo if needed
                    this.callGraphStrategy.repo = this.repo;
                    const result = await this.callGraphStrategy.execute(this.projectPath, filePath, options);
                    return this.formatSuccess(result);
                }

                case 'analyze_change':
                case 'simulate_data_journey':
                case 'trace_variable':
                case 'trace_data_flow':
                case 'explain_connection':
                case 'signature_change':
                    return this.formatError('DEPRECATED_ROUTING',
                        `The traversal '${traverseType}' is deprecated. ` +
                        `Use traverse_graph(impact_map) for dependency boundaries, traverse_graph(call_graph) for tree view, ` +
                        `or query_graph(details, includeSemantic:true) for deep per-atom analysis.`
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
