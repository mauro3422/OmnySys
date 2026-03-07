
import { SemanticQueryTool } from './semantic/semantic-query-tool.js';
import { GitTerminalBridge } from '../../../shared/utils/git-terminal-bridge.js';
import path from 'path';
import fs from 'fs';

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

        const rootPath = this.projectPath || process.cwd();
        const bridge = new GitTerminalBridge(rootPath, this.logger);

        // Resolve absolute and relative paths consistently
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(rootPath, filePath);

        if (!fs.existsSync(absolutePath)) {
            return this.formatError('NOT_FOUND', `File not found: ${filePath}`);
        }

        const relativePath = bridge.getRelativePath(absolutePath);

        try {
            this.logger.info(`[History] Tracing symbol '${symbolName}' in ${relativePath}`);

            // Core logic delegated to bridge
            const history = await bridge.getSymbolHistory(symbolName, relativePath, limit);

            // Transformation - Output Coherence (Strict derivation args -> history -> response)
            const response = {
                correlationId: `${relativePath}#${symbolName}`,
                input: { symbolName, filePath: relativePath, limit },
                results: {
                    symbol: symbolName,
                    file: relativePath,
                    versionCount: history.length,
                    versions: history.map(v => ({
                        commit: v.hash.substring(0, 7),
                        author: v.author,
                        date: v.date,
                        summary: v.subject,
                        snippet: v.codeSnippet // Coherence: proving we found the actual code
                    }))
                },
                metadata: {
                    engine: 'git-log-L',
                    coherenceScore: history.length > 0 ? 1.0 : 0.5,
                    timestamp: new Date().toISOString()
                }
            };

            return this.formatSuccess(response);

        } catch (error) {
            this.logger.warn(`[History] git log -L failed for ${symbolName}: ${error.message}. Trying file fallback.`);

            try {
                // Fallback logic
                const fileHistory = await bridge.getFileHistory(relativePath, limit);

                return this.formatSuccess({
                    correlationId: `${relativePath}#${symbolName}`,
                    input: { symbolName, filePath: relativePath, limit },
                    note: 'Fallback file-level history used (symbol-specific tracking failed)',
                    results: {
                        symbol: symbolName,
                        file: relativePath,
                        versionCount: fileHistory.length,
                        versions: fileHistory
                    },
                    metadata: {
                        engine: 'git-log-file',
                        timestamp: new Date().toISOString()
                    }
                });
            } catch (fallbackError) {
                return this.formatError('HISTORY_FAILED', `Git operations failed: ${fallbackError.message}`);
            }
        }
    }
}

export const get_atom_history = async (args, context) => {
    const tool = new GetAtomHistoryTool();
    return tool.execute(args, context);
};

export default { get_atom_history };
