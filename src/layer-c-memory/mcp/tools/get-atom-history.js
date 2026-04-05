
import { SemanticQueryTool } from './semantic/semantic-query-tool.js';
import {
    collectAtomHistory,
    summarizeAtomHistory
} from './atom-history-helpers.js';

/**
 * mcp_omnysystem_get_atom_history
 * 
 * Retrieves historical versions of a specific atom using Git logs.
 * Consolidates Shell/Git logic into GitTerminalBridge.
 */
export class GetAtomHistoryTool extends SemanticQueryTool {
    constructor() {
        super('query:atom-history');
    }

    /**
     * Primary action for history retrieval.
     * High coherence: strictly connects args -> path validation -> git bridge -> formatted response.
     */
    async performAction(args) {
        const { symbolName, filePath, limit = 10 } = args;

        // Validation - Input Coherence
        if (!symbolName || !filePath) {
            return this.formatError('MISSING_PARAMS', 'symbolName and filePath are required');
        }

        const historyBundle = await collectAtomHistory({
            projectPath: this.projectPath || process.cwd(),
            filePath,
            symbolName,
            limit
        }, {
            logger: this.logger
        });

        if (!historyBundle.ok) {
            return this.formatError('NOT_FOUND', historyBundle.error);
        }

        try {
            this.logger.info(`[History] Tracing symbol '${symbolName}' in ${historyBundle.relativePath}`);

            // Transformation - Output Coherence (Strict derivation args -> history -> response)
            const response = {
                correlationId: `${historyBundle.relativePath}#${symbolName}`,
                input: { symbolName, filePath: historyBundle.relativePath, limit },
                results: {
                    symbol: symbolName,
                    file: historyBundle.relativePath,
                    versionCount: historyBundle.history.length,
                    archiveVersionCount: historyBundle.archiveHistory.length,
                    versions: historyBundle.history.map(v => ({
                        commit: v.hash.substring(0, 7),
                        author: v.author,
                        date: v.date,
                        summary: v.subject,
                        snippet: v.codeSnippet // Coherence: proving we found the actual code
                    })),
                    archiveVersions: historyBundle.archiveHistory.map((row) => ({
                        versionHash: row.version_hash,
                        atomId: row.atom_id,
                        atomName: row.atom_name,
                        filePath: row.file_path,
                        capturedAt: row.captured_at,
                        source: row.source,
                        fieldHashes: JSON.parse(row.field_hashes_json || '{}')
                    }))
                },
                metadata: {
                    ...historyBundle.metadata,
                    timestamp: new Date().toISOString()
                }
            };

            return this.formatSuccess(response);

        } catch (error) {
            return this.formatError('HISTORY_FAILED', `History formatting failed: ${error.message}`);
        }
    }
}

export const get_atom_history = async (args, context) => {
    const tool = new GetAtomHistoryTool();
    return tool.execute(args, context);
};

export default { get_atom_history };
