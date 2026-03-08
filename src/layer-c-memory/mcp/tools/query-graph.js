import { SemanticQueryTool } from './semantic/semantic-query-tool.js';
import { queryAtomHistory } from './semantic/semantic-queries.js';
import { GraphQueryHandler } from './semantic/handlers/graph-query-handler.js';

/**
 * mcp_omnysystem_query_graph
 *
 * Direct entry point for graph-level queries.
 * Standardizes access to symbol instances and architectural details.
 */
export class QueryGraphTool extends SemanticQueryTool {
    constructor() {
        super('query:graph');
        this.graphHandler = new GraphQueryHandler(this.logger);
    }

    async performAction(args) {
        const {
            queryType,
            symbolName,
            filePath,
            autoDetect = false,
            options = {}
        } = args;

        return this.runRoutedAction({
            routeKey: 'queryType',
            routeValue: queryType,
            handlers: {
                instances: async () => {
                    if (!this.repo) return this.formatError('REPO_UNAVAILABLE', 'Repository not initialized');

                    if (autoDetect || !symbolName) {
                        return this.formatError('UNSUPPORTED', 'Querying requires a symbolName.');
                    }

                    const atoms = this.repo.query({ name: symbolName }, {
                        includeRemoved: !!options.includeRemoved
                    });
                    const instances = this.graphHandler.handleInstances(atoms, options);

                    return this.formatSuccess({
                        symbol: symbolName,
                        totalInstances: instances.length,
                        instances,
                        semanticIncluded: !!options.includeSemantic
                    });
                },

                details: async () => {
                    if (!filePath || !symbolName) {
                        return this.formatError('MISSING_PARAMS', 'filePath and symbolName are required for details query');
                    }

                    let atom = this.getExactAtom(symbolName, filePath);
                    if (!atom) return this.formatError('NOT_FOUND', `Symbol ${symbolName} not found in ${filePath}`);

                    // Phase 2: On-Demand Lazy Indexing
                    if (!atom.isPhase2Complete) {
                        await this._triggerPhase2OnDemand(symbolName, filePath);
                        atom = this.getExactAtom(symbolName, filePath) || atom;
                    }

                    const details = this.graphHandler.handleDetails(atom, options);

                    return this.formatSuccess({
                        file: filePath,
                        symbol: symbolName,
                        details,
                        semanticIncluded: !!options.includeSemantic
                    });
                },

                history: async () => {
                    if (!symbolName && !options.dnaHash) {
                        return this.formatError('MISSING_PARAMS', 'symbolName or options.dnaHash is required for history');
                    }

                    const history = queryAtomHistory(this.repo.db, {
                        name: symbolName,
                        filePath,
                        dnaHash: options.dnaHash,
                        limit: options.limit || 50
                    });

                    return this.formatSuccess({
                        symbol: symbolName,
                        filePath,
                        dnaHash: options.dnaHash,
                        versionCount: history.length,
                        history: history.map(v => ({
                            ...v,
                            dna: JSON.parse(v.dna_json || '{}')
                        }))
                    });
                },

                value_flow: async () => this.formatError('DEPRECATED_ROUTING',
                    `The complex query '${queryType}' has been deprecated. ` +
                    `Use 'instances' or 'details' for structural info.`
                ),
                removed: async () => this.formatError('DEPRECATED_ROUTING',
                    `The complex query '${queryType}' has been deprecated. ` +
                    `Use 'instances' or 'details' for structural info.`
                ),
                search: async () => this.formatError('DEPRECATED_ROUTING',
                    `The complex query '${queryType}' has been deprecated. ` +
                    `Use 'instances' or 'details' for structural info.`
                )
            },
            debugMessage: `[Graph] Querying ${queryType}`,
            debugContext: { symbolName, filePath },
            executionErrorMessage: (error) => `Error executing query ${queryType}: ${error.message}`
        });
    }

    /**
     * Internal helper to trigger Phase 2 analysis if atom is incomplete.
     * @private
     */
    async _triggerPhase2OnDemand(symbolName, filePath) {
        this.logger.info(`[Phase2:OnDemand] Triggering for: ${symbolName} in ${filePath}`);
        try {
            const { analyzeSingleFile } = await import('../../../layer-a-static/pipeline/single-file.js');
            const rootPath = this.projectPath || process.cwd();

            await Promise.race([
                analyzeSingleFile(rootPath, filePath, { verbose: false, incremental: false }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
            ]);
        } catch (err) {
            this.logger.warn(`[Phase2:OnDemand] Skipped (${err.message}) — returning existing data`);
        }
    }
}

export const query_graph = async (args, context) => {
    const tool = new QueryGraphTool();
    return tool.execute(args, context);
};

export default { query_graph };
