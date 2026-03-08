import { GraphQueryTool } from '../core/shared/base-tools/graph-query-tool.js';
import fs from 'fs';
import path from 'path';
import { getFileAnalysis } from '../../query/apis/file-api.js';
import { getSystemMapPersistenceCoverage, shouldTrustSystemMapDependencies } from '../../../shared/compiler/index.js';

function extractRelativeModuleSpecifiers(source = '') {
    const specifiers = new Set();
    const patterns = [
        /\bimport\s+[^'"]*?from\s+['"](\.[^'"]+)['"]/g,
        /\bexport\s+[^'"]*?from\s+['"](\.[^'"]+)['"]/g,
        /\bimport\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g
    ];

    for (const pattern of patterns) {
        for (const match of String(source || '').matchAll(pattern)) {
            if (match?.[1]) {
                specifiers.add(match[1]);
            }
        }
    }

    return [...specifiers];
}

function resolveExistingModulePath(baseDir, specifier) {
    const candidateBase = path.resolve(baseDir, specifier);
    const candidates = [
        candidateBase,
        `${candidateBase}.js`,
        `${candidateBase}.mjs`,
        `${candidateBase}.cjs`,
        `${candidateBase}.ts`,
        `${candidateBase}.mts`,
        `${candidateBase}.cts`,
        path.join(candidateBase, 'index.js'),
        path.join(candidateBase, 'index.mjs'),
        path.join(candidateBase, 'index.ts')
    ];

    return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function detectFilesystemBrokenImports(projectPath, filePath) {
    const absoluteFilePath = path.resolve(projectPath, filePath);
    if (!fs.existsSync(absoluteFilePath)) {
        return [];
    }

    const source = fs.readFileSync(absoluteFilePath, 'utf8');
    const baseDir = path.dirname(absoluteFilePath);
    const broken = [];

    for (const specifier of extractRelativeModuleSpecifiers(source)) {
        if (!resolveExistingModulePath(baseDir, specifier)) {
            broken.push({
                source: specifier,
                type: 'local',
                resolved: false,
                reason: 'filesystem_missing'
            });
        }
    }

    return broken;
}

function buildFilesystemOnlyValidation(projectPath, filePath) {
    const absoluteFilePath = path.resolve(projectPath, filePath);
    if (!fs.existsSync(absoluteFilePath)) {
        return null;
    }

    const broken = detectFilesystemBrokenImports(projectPath, filePath);
    return {
        file: filePath,
        totalImports: extractRelativeModuleSpecifiers(fs.readFileSync(absoluteFilePath, 'utf8')).length,
        brokenPaths: broken.map((entry) => entry.source),
        unusedImports: [],
        circularDependencies: [],
        status: broken.length === 0 ? 'CLEAN' : 'HAS_ISSUES',
        validationMode: 'filesystem_fallback'
    };
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

        const fileData = await getFileAnalysis(this.projectPath, filePath);

        if (!fileData) {
            const filesystemValidation = buildFilesystemOnlyValidation(this.projectPath, filePath);
            if (filesystemValidation) {
                return this.formatSuccess(filesystemValidation);
            }

            return this.formatError('NOT_FOUND', `File ${filePath} not found in the index or filesystem. Run 'omny up' or analysis.`);
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

        if (checkBroken) {
            const filesystemBrokenImports = detectFilesystemBrokenImports(this.projectPath, filePath);
            for (const missingImport of filesystemBrokenImports) {
                if (!broken.some((entry) => entry.source === missingImport.source)) {
                    broken.push(missingImport);
                }
            }
        }

        if (checkCircular && this.repo?.db) {
            const coverage = getSystemMapPersistenceCoverage(this.repo.db);
            const graph = {};
            if (shouldTrustSystemMapDependencies(coverage)) {
                const rows = this.repo.db.prepare('SELECT source_path, target_path FROM file_dependencies').all();
                for (const row of rows) {
                    if (!graph[row.source_path]) graph[row.source_path] = [];
                    graph[row.source_path].push(row.target_path);
                }
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
