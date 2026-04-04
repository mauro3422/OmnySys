import { GraphQueryTool } from '../core/shared/base-tools/graph-query-tool.js';
import { getFileDependencies } from '../../query/apis/file-api.js';
import { getSystemMapPersistenceCoverage, shouldTrustSystemMapDependencies } from '../../../shared/compiler/index.js';
import {
    buildIndexedValidationResult,
    collectBrokenImports,
    loadIndexedFileAnalysis,
    normalizeComparablePath
} from './validate-imports/filesystem-validation.js';

function hasDirectImportEvidence(fileData, targetPath) {
    const normalizedTarget = normalizeComparablePath(targetPath);
    return (fileData?.imports || []).some((entry) => {
        const resolved = normalizeComparablePath(entry?.resolvedPath || entry?.resolved || '');
        const source = normalizeComparablePath(entry?.source || '');
        return resolved === normalizedTarget || source === normalizedTarget;
    });
}

async function filterCyclesByDirectImportEvidence(projectPath, cycles = [], repo = null) {
    const fileMemo = new Map();

    async function getCachedFileAnalysis(filePath) {
        try {
            if (!fileMemo.has(filePath)) {
                fileMemo.set(filePath, await loadIndexedFileAnalysis(projectPath, filePath, repo));
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

async function buildCircularDependencyGraph(projectPath, rootFilePath) {
    const graph = new Map();
    const loaded = new Set();

    async function loadNodeDependencies(nodePath) {
        if (!nodePath || loaded.has(nodePath)) {
            return;
        }

        loaded.add(nodePath);
        let nodeDeps;
        try {
            nodeDeps = await getFileDependencies(projectPath, nodePath);
        } catch (error) {
            throw new Error(`Failed to load dependencies for ${nodePath}: ${error?.message || error}`);
        }

        const targets = Array.isArray(nodeDeps?.dependencies)
            ? nodeDeps.dependencies
                .map((dependency) => dependency?.resolvedPath || dependency?.source)
                .filter(Boolean)
            : [];

        graph.set(nodePath, targets);

        for (const target of targets) {
            await loadNodeDependencies(target);
        }
    }

    await loadNodeDependencies(rootFilePath);
    return graph;
}

function collectCyclesFromGraph(graph, rootFilePath) {
    const visited = new Set();
    const pathStack = [];
    const cycles = [];

    const dfs = (current) => {
        visited.add(current);
        pathStack.push(current);

        const neighbors = graph.get(current) || [];
        for (const neighbor of neighbors) {
            const idx = pathStack.indexOf(neighbor);
            if (idx !== -1) {
                const cycle = pathStack.slice(idx);
                if (cycle.includes(rootFilePath)) {
                    cycles.push([...cycle, neighbor]);
                }
            } else if (!visited.has(neighbor)) {
                dfs(neighbor);
            }
        }

        pathStack.pop();
    };

    if (graph.has(rootFilePath)) {
        dfs(rootFilePath);
    }

    return cycles;
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

        const graph = await buildCircularDependencyGraph(projectPath, filePath);
        const cycles = collectCyclesFromGraph(graph, filePath);
        const verifiedCycles = await filterCyclesByDirectImportEvidence(projectPath, cycles, repo);
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
            const fileData = await loadIndexedFileAnalysis(this.projectPath, filePath, this.repo);

            if (!fileData) {
                return this.formatError('NOT_FOUND', `File ${filePath} not found in the canonical DB index. Run 'omny up' or analysis to index it first.`);
            }

            const broken = await collectBrokenImports(fileData, this.projectPath, filePath, checkBroken, this.repo);
            const unused = checkUnused
                ? (fileData?.imports || []).filter((entry) => entry?.unused === true)
                : [];
            const circularPaths = await computeCircularDependencies(this.repo, this.projectPath, filePath, checkCircular);

            return this.formatSuccess(
                await buildIndexedValidationResult(this.repo, filePath, fileData, broken, unused, circularPaths, this.projectPath)
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
