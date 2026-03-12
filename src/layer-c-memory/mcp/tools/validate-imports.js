import { GraphQueryTool } from '../core/shared/base-tools/graph-query-tool.js';
import { getFileAnalysis } from '../../query/apis/file-api.js';
import { getSystemMapPersistenceCoverage, shouldTrustSystemMapDependencies } from '../../../shared/compiler/index.js';
import {
    buildFilesystemOnlyValidation,
    buildIndexedValidationResult,
    collectBrokenImports
} from './validate-imports/filesystem-validation.js';

function computeCircularDependencies(repo, filePath, checkCircular) {
    if (!checkCircular || !repo?.db) {
        return [];
    }

    const coverage = getSystemMapPersistenceCoverage(repo.db);
    if (!shouldTrustSystemMapDependencies(coverage)) {
        return [];
    }

    const graph = {};
    const rows = repo.db.prepare('SELECT source_path, target_path FROM file_dependencies').all();
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

    return Array.from(new Set(cycles.map((cycle) => cycle.join(' -> '))));
}

export class ValidateImportsTool extends GraphQueryTool {
    constructor() {
        super('validate:imports');
    }

    async performAction(args) {
        const { filePath, checkBroken = true, checkUnused = true, checkCircular = false } = args;

        if (!filePath) {
            return this.formatError('MISSING_PARAMS', 'filePath is required');
        }

        try {
            const fileData = await getFileAnalysis(this.projectPath, filePath);

            if (!fileData) {
                const filesystemValidation = await buildFilesystemOnlyValidation(this.projectPath, filePath);
                if (filesystemValidation) {
                    return this.formatSuccess(filesystemValidation);
                }

                return this.formatError('NOT_FOUND', `File ${filePath} not found in the index or filesystem. Run 'omny up' or analysis.`);
            }

            const broken = await collectBrokenImports(fileData, this.projectPath, filePath, checkBroken);
            const unused = checkUnused
                ? (fileData?.imports || []).filter((entry) => entry?.unused === true)
                : [];
            const circularPaths = computeCircularDependencies(this.repo, filePath, checkCircular);

            return this.formatSuccess(
                await buildIndexedValidationResult(filePath, fileData, broken, unused, circularPaths, this.projectPath)
            );
        } catch (error) {
            return this.formatError(
                'VALIDATION_FAILED',
                `Import validation failed for ${filePath}: ${error?.message || error}`
            );
        }
    }
}

export const validate_imports = async (args, context) => {
    const tool = new ValidateImportsTool();
    return tool.execute(args, context);
};

export default { validate_imports };
