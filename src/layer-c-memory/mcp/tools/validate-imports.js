import { GraphQueryTool } from '../core/shared/base-tools/graph-query-tool.js';
import { getFileAnalysis } from '../../query/apis/file-api.js';
import { getSystemMapPersistenceCoverage, shouldTrustSystemMapDependencies } from '../../../shared/compiler/index.js';
import {
    buildFilesystemOnlyValidation,
    buildIndexedValidationResult,
    collectBrokenImports
} from './validate-imports/filesystem-validation.js';

function normalizeComparablePath(filePath = '') {
    return String(filePath || '').replace(/\\/g, '/');
}

function hasDirectImportEvidence(fileData, targetPath) {
    const normalizedTarget = normalizeComparablePath(targetPath);
    return (fileData?.imports || []).some((entry) => {
        const resolved = normalizeComparablePath(entry?.resolvedPath || entry?.resolved || '');
        const source = normalizeComparablePath(entry?.source || '');
        return resolved === normalizedTarget || source === normalizedTarget;
    });
}

async function loadFileAnalysis(projectPath, filePath) {
    try {
        return await getFileAnalysis(projectPath, filePath);
    } catch (error) {
        throw new Error(`Failed to analyze ${filePath}: ${error?.message || error}`);
    }
}

async function filterCyclesByDirectImportEvidence(projectPath, cycles = []) {
    const fileMemo = new Map();

    async function getCachedFileAnalysis(filePath) {
        try {
            if (!fileMemo.has(filePath)) {
                fileMemo.set(filePath, await loadFileAnalysis(projectPath, filePath));
            }
            return fileMemo.get(filePath);
        } catch (error) {
            throw new Error(`Failed to verify cycle evidence for ${filePath}: ${error?.message || error}`);
        }
    }

    const verifiedCycles = [];

    for (const cycle of cycles) {
        let hasUnsupportedEdge = false;

        for (let index = 0; index < cycle.length - 1; index += 1) {
            const sourcePath = cycle[index];
            const targetPath = cycle[index + 1];
            const sourceFileData = await getCachedFileAnalysis(sourcePath);

            if (!hasDirectImportEvidence(sourceFileData, targetPath)) {
                hasUnsupportedEdge = true;
                break;
            }
        }

        if (!hasUnsupportedEdge) {
            verifiedCycles.push(cycle);
        }
    }

    return verifiedCycles;
}

async function computeCircularDependencies(repo, projectPath, filePath, checkCircular) {
    try {
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

        const verifiedCycles = await filterCyclesByDirectImportEvidence(projectPath, cycles);
        return Array.from(new Set(verifiedCycles.map((cycle) => cycle.join(' -> '))));
    } catch (error) {
        throw new Error(`Failed to compute circular dependencies for ${filePath}: ${error?.message || error}`);
    }
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
            const fileData = await loadFileAnalysis(this.projectPath, filePath);

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
            const circularPaths = await computeCircularDependencies(this.repo, this.projectPath, filePath, checkCircular);

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
