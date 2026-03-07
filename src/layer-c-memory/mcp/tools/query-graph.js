import { SemanticQueryTool } from './semantic/semantic-query-tool.js';
import { queryAtomHistory } from './semantic/semantic-queries.js';

import { getFileAnalysis } from '../../query/apis/file-api.js';
import { getAtomDetails } from '../../query/queries/file-query/atoms/atom-query.js';

/**
 * mcp_omnysystem_query_graph
 *
 * Replaces:
 * - find_symbol_instances
 * - explain_value_flow
 * - get_atom_history
 * - get_function_details
 * - search_files
 * - get_removed_atoms
 */
export class QueryGraphTool extends SemanticQueryTool {
    constructor() {
        super('query:graph');
    }

    async performAction(args) {
        const {
            queryType,
            symbolName,
            filePath,
            autoDetect = false,
            options = {}
        } = args;

        if (!queryType) {
            return this.formatError('MISSING_PARAMS', 'queryType is required', {
                allowedValues: ['instances', 'details', 'history', 'value_flow', 'search', 'removed']
            });
        }

        this.logger.debug(`Executing query:graph -> ${queryType}`, { symbolName, filePath, options });

        const innerArgs = { filePath, functionName: symbolName, ...options };

        try {
            switch (queryType) {
                case 'instances': {
                    // SQLite Query: name MATCH symbolName (o search en atoms del file)
                    if (!this.repo) return this.formatError('REPO_UNAVAILABLE', 'Repository not initialized');

                    if (autoDetect || !symbolName) {
                        return this.formatError('UNSUPPORTED', 'autoDetect is no longer supported directly. Query the database directly.');
                    }

                    const atoms = this.repo.query({ name: symbolName });

                    // Procesar resultados (guard for undefined entries + normalize snake_case)
                    let instances = atoms.filter(Boolean).map(a => {
                        const file = a.file_path || a.filePath || a.file;
                        const base = {
                            file,
                            type: a.atom_type || a.type,
                            id: a.id,
                            params: a.params || [],
                            exports: !!(a.is_exported || a.exports || false)
                        };

                        // Agregar datos semánticos si se solicitan
                        if (options.includeSemantic) {
                            base.semantic = {
                                sharedStateAccess: JSON.parse(a.shared_state_json || '[]'),
                                eventEmitters: JSON.parse(a.event_emitters_json || '[]'),
                                eventListeners: JSON.parse(a.event_listeners_json || '[]'),
                                isAsync: a.is_async,
                                scopeType: a.scope_type,
                                hasNetworkCalls: a.has_network_calls,
                                hasErrorHandling: a.has_error_handling
                            };
                        }

                        return base;
                    });

                    return this.formatSuccess({
                        symbol: symbolName,
                        totalInstances: instances.length,
                        instances,
                        semanticIncluded: !!options.includeSemantic
                    });
                }

                case 'details': {
                    if (!filePath || !symbolName) {
                        return this.formatError('MISSING_PARAMS', 'filePath and symbolName are required for details query');
                    }

                    let atom = this.getExactAtom(symbolName, filePath);
                    if (!atom) return this.formatError('NOT_FOUND', `Symbol ${symbolName} not found in ${filePath}`);

                    // Phase 2: On-Demand Lazy Indexing
                    if (!atom.isPhase2Complete) {
                        this.logger.info(`[Phase2:OnDemand] Triggering for: ${symbolName} in ${filePath}`);
                        try {
                            const { analyzeSingleFile } = await import('../../../layer-a-static/pipeline/single-file.js');
                            const rootPath = this.projectPath || process.cwd();

                            // Fire-and-wait with 5s timeout so we don't block indefinitely
                            await Promise.race([
                                analyzeSingleFile(rootPath, filePath, { verbose: false, incremental: false }),
                                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
                            ]);

                            // Reload atom after Phase 2 completes
                            atom = this.getExactAtom(symbolName, filePath) || atom;
                            this.logger.info(`[Phase2:OnDemand] Complete for: ${symbolName}`);
                        } catch (err) {
                            this.logger.warn(`[Phase2:OnDemand] Skipped (${err.message}) — returning Phase 1 data`);
                        }
                    }

                    // Agregar datos semánticos si se solicitan
                    if (options.includeSemantic) {
                        atom.semantic = {
                            sharedStateAccess: JSON.parse(atom.shared_state_json || '[]'),
                            eventEmitters: JSON.parse(atom.event_emitters_json || '[]'),
                            eventListeners: JSON.parse(atom.event_listeners_json || '[]'),
                            isAsync: atom.is_async,
                            scopeType: atom.scope_type,
                            hasNetworkCalls: atom.has_network_calls,
                            hasErrorHandling: atom.has_error_handling
                        };
                    }

                    return this.formatSuccess({
                        file: filePath,
                        symbol: symbolName,
                        details: atom,
                        semanticIncluded: !!options.includeSemantic
                    });
                }

                case 'history': {
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
                }

                case 'value_flow':
                case 'removed':
                case 'search':
                    // History usaba git log. ValueFlow y Search lanzaban comandos grep pesados.
                    // Removed leía el timeline. Hemos unificado esto bajo mcp_omnysystem_aggregate_metrics.
                    return this.formatError('DEPRECATED_ROUTING',
                        `The complex query '${queryType}' has been deprecated from real-time routing to save token boundaries. ` +
                        `Use 'instances' or 'details' for structural info, or use system prompts for historical analysis.`
                    );

                default:
                    return this.formatError('INVALID_PARAM', `Unknown queryType: ${queryType}`);
            }
        } catch (error) {
            return this.formatError('EXECUTION_ERROR', `Error executing query ${queryType}: ${error.message}`);
        }
    }
}

export const query_graph = async (args, context) => {
    const tool = new QueryGraphTool();
    return tool.execute(args, context);
};

export default { query_graph };
