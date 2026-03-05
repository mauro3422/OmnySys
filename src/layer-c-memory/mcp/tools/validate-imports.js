import { GraphQueryTool } from '../core/shared/base-tools/graph-query-tool.js';
import { getFileAnalysis } from '../../query/apis/file-api.js';

export class ValidateImportsTool extends GraphQueryTool {
    constructor() {
        super('validate:imports');
    }

    async performAction(args) {
        const { filePath, checkBroken = true, checkUnused = true, checkCircular = false } = args;

        if (!filePath) {
            return this.formatError('MISSING_PARAMS', 'filePath is required');
        }

        const fileData = await getFileAnalysis(this.projectPath, filePath);

        if (!fileData) {
            return this.formatError('NOT_FOUND', `File ${filePath} not found in the index. Run 'omny up' or analysis.`);
        }

        const imports = fileData.imports || [];
        const broken = [];
        const unused = []; // The static analyzer usually tags unused imports if supported
        let circularPaths = [];

        // Fast minimal check based on SQLite Graph data (since the actual paths are stored)
        for (const imp of imports) {
            if (checkBroken && !imp.resolved && imp.type === 'local') {
                broken.push(imp);
            }
            if (checkUnused && imp.unused === true) {
                unused.push(imp);
            }
        }

        if (checkCircular && this.repo?.db) {
            const rows = this.repo.db.prepare('SELECT source_path, target_path FROM file_dependencies').all();
            const graph = {};
            for (const row of rows) {
                if (!graph[row.source_path]) graph[row.source_path] = [];
                graph[row.source_path].push(row.target_path);
            }

            const visited = new Set();
            const pathStack = [];
            const cycles = [];

            const dfs = (current) => {
                visited.add(current);
                pathStack.push(current);

                const neighbors = graph[current] || [];
                for (const neighbor of neighbors) {
                    const idx = pathStack.indexOf(neighbor);
                    if (idx !== -1) {
                        const cycle = pathStack.slice(idx);
                        if (cycle.includes(filePath)) {
                            cycles.push([...cycle, neighbor]);
                        }
                    } else if (!visited.has(neighbor)) {
                        dfs(neighbor);
                    }
                }
                pathStack.pop();
            };

            if (graph[filePath]) {
                dfs(filePath);
            }

            const uniqueCycles = new Set(cycles.map(c => c.join(' -> ')));
            circularPaths = Array.from(uniqueCycles);
        }

        return this.formatSuccess({
            file: filePath,
            totalImports: imports.length,
            brokenPaths: broken.map(b => b.source),
            unusedImports: unused.map(u => u.name),
            circularDependencies: circularPaths,
            status: broken.length === 0 && unused.length === 0 && circularPaths.length === 0 ? 'CLEAN' : 'HAS_ISSUES'
        });
    }
}

export const validate_imports = async (args, context) => {
    const tool = new ValidateImportsTool();
    return tool.execute(args, context);
};

export default { validate_imports };
