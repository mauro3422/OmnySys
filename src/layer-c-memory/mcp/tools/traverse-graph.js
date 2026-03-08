import { SemanticQueryTool } from './semantic/semantic-query-tool.js';
import { ImpactMapStrategy } from './traverse/strategies/impact-map-strategy.js';
import { CallGraphStrategy } from './traverse/strategies/call-graph-strategy.js';
import { DataJourneyStrategy } from './traverse/strategies/data-journey-strategy.js';

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
        this.dataJourneyStrategy = new DataJourneyStrategy(this.repo);
    }

    async performAction(args) {
        const {
            traverseType,
            filePath,
            symbolName,
            variableName,
            options = {}
        } = args;

        return this.runRoutedAction({
            routeKey: 'traverseType',
            routeValue: traverseType,
            handlers: {
                impact_map: async () => {
                    const result = await this.impactStrategy.execute(this.projectPath, filePath, options);
                    return this.formatSuccess(result);
                },

                call_graph: async () => {
                    // Re-inject safe repo if needed
                    this.callGraphStrategy.repo = this.repo;
                    const result = await this.callGraphStrategy.execute(this.projectPath, filePath, options);
                    return this.formatSuccess(result);
                },

                trace_data_flow: async () => {
                    // Update repo if needed
                    this.dataJourneyStrategy.repo = this.repo;
                    const result = await this.dataJourneyStrategy.execute(this.projectPath, filePath, {
                        ...args,
                        ...options
                    });
                    return this.formatSuccess(result);
                },
                simulate_data_journey: async () => {
                    this.dataJourneyStrategy.repo = this.repo;
                    const result = await this.dataJourneyStrategy.execute(this.projectPath, filePath, {
                        ...args,
                        ...options
                    });
                    return this.formatSuccess(result);
                },
                trace_variable: async () => {
                    this.dataJourneyStrategy.repo = this.repo;
                    const result = await this.dataJourneyStrategy.execute(this.projectPath, filePath, {
                        ...args,
                        ...options
                    });
                    return this.formatSuccess(result);
                },

                analyze_change: async () => this.formatError('DEPRECATED_ROUTING',
                    `The traversal '${traverseType}' is deprecated. ` +
                    `Use traverse_graph(impact_map) for dependency boundaries, traverse_graph(call_graph) for tree view, ` +
                    `or query_graph(details, includeSemantic:true) for deep per-atom analysis.`
                ),
                explain_connection: async () => this.formatError('DEPRECATED_ROUTING',
                    `The traversal '${traverseType}' is deprecated. ` +
                    `Use traverse_graph(impact_map) for dependency boundaries, traverse_graph(call_graph) for tree view, ` +
                    `or query_graph(details, includeSemantic:true) for deep per-atom analysis.`
                ),
                signature_change: async () => this.formatError('DEPRECATED_ROUTING',
                    `The traversal '${traverseType}' is deprecated. ` +
                    `Use traverse_graph(impact_map) for dependency boundaries, traverse_graph(call_graph) for tree view, ` +
                    `or query_graph(details, includeSemantic:true) for deep per-atom analysis.`
                )
            },
            debugMessage: `Executing traverse:graph -> ${traverseType}`,
            debugContext: { filePath, symbolName, options },
            executionErrorMessage: (error) => `Error executing traversal ${traverseType}: ${error.message}`
        });
    }
}

export const traverse_graph = async (args, context) => {
    const tool = new TraverseGraphTool();
    return tool.execute(args, context);
};

export default { traverse_graph };
