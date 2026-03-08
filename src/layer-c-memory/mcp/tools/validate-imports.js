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

function extractRelativeImportContracts(source = '') {
    const contracts = [];
    const patterns = [
        /\bimport\s+([^'"]*?)\s+from\s+['"](\.[^'"]+)['"]/g,
        /\bexport\s+\{([^'"]+)\}\s+from\s+['"](\.[^'"]+)['"]/g
    ];

    for (const pattern of patterns) {
        for (const match of String(source || '').matchAll(pattern)) {
            const clause = String(match?.[1] || '').trim();
            const specifier = String(match?.[2] || '').trim();
            if (!specifier) continue;

            contracts.push({
                specifier,
                namedImports: extractNamedImportsFromClause(clause),
                namespaceImport: /\*\s+as\s+\w+/i.test(clause)
            });
        }
    }

    return contracts;
}

function extractNamedImportsFromClause(clause = '') {
    const normalized = String(clause || '').trim();
    if (!normalized) return [];

    const braceMatch = normalized.match(/\{([^}]+)\}/);
    if (!braceMatch?.[1]) return [];

    return braceMatch[1]
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
            const [importedName] = entry.split(/\s+as\s+/i);
            return String(importedName || '').trim();
        })
        .filter(Boolean);
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

function extractModuleNamedExports(source = '') {
    const namedExports = new Set();
    const exportPatterns = [
        /\bexport\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g,
        /\bexport\s+(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)/g,
        /\bexport\s*\{([^}]+)\}/g
    ];

    for (const pattern of exportPatterns) {
        for (const match of String(source || '').matchAll(pattern)) {
            if (match[1] && !match[0].includes('{')) {
                namedExports.add(String(match[1]).trim());
                continue;
            }

            const clause = String(match[1] || '').trim();
            if (!clause) continue;
            for (const entry of clause.split(',')) {
                const normalized = String(entry).trim();
                if (!normalized) continue;
                const parts = normalized.split(/\s+as\s+/i);
                const exportedName = String(parts[1] || parts[0] || '').trim();
                if (exportedName && exportedName !== 'default') {
                    namedExports.add(exportedName);
                }
            }
        }
    }

    return namedExports;
}

function detectMissingNamedExports(projectPath, filePath) {
    const absoluteFilePath = path.resolve(projectPath, filePath);
    if (!fs.existsSync(absoluteFilePath)) {
        return [];
    }

    const source = fs.readFileSync(absoluteFilePath, 'utf8');
    const baseDir = path.dirname(absoluteFilePath);
    const contracts = extractRelativeImportContracts(source);
    const violations = [];

    for (const contract of contracts) {
        if (contract.namedImports.length === 0 || contract.namespaceImport) {
            continue;
        }

        const resolvedModulePath = resolveExistingModulePath(baseDir, contract.specifier);
        if (!resolvedModulePath) {
            continue;
        }

        const moduleSource = fs.readFileSync(resolvedModulePath, 'utf8');
        const moduleExports = extractModuleNamedExports(moduleSource);
        const missingNames = contract.namedImports.filter((name) => !moduleExports.has(name));

        for (const missingName of missingNames) {
            violations.push({
                source: contract.specifier,
                type: 'local',
                resolved: false,
                reason: 'missing_named_export',
                missingExport: missingName
            });
        }
    }

    return violations;
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

    for (const violation of detectMissingNamedExports(projectPath, filePath)) {
        broken.push(violation);
    }

    return broken;
}

function buildFilesystemOnlyValidation(projectPath, filePath) {
    const absoluteFilePath = path.resolve(projectPath, filePath);
    if (!fs.existsSync(absoluteFilePath)) {
        return null;
    }

    const broken = detectFilesystemBrokenImports(projectPath, filePath);
    const source = fs.readFileSync(absoluteFilePath, 'utf8');
    return {
        file: filePath,
        totalImports: extractRelativeModuleSpecifiers(source).length,
        brokenPaths: broken.map((entry) => entry.source),
        brokenImports: broken,
        unusedImports: [],
        circularDependencies: [],
        status: broken.length === 0 ? 'CLEAN' : 'HAS_ISSUES',
        validationMode: 'filesystem_fallback'
    };
}

function collectBrokenImports(fileData, projectPath, filePath, checkBroken) {
    const broken = [];
    const fingerprints = new Set();
    const imports = fileData?.imports || [];
    const pushUniqueBrokenImport = (entry) => {
        const fingerprint = [
            entry?.source || '',
            entry?.reason || '',
            entry?.missingExport || ''
        ].join('::');
        if (fingerprints.has(fingerprint)) {
            return;
        }
        fingerprints.add(fingerprint);
        broken.push(entry);
    };

    for (const imp of imports) {
        if (checkBroken && !imp.resolved && imp.type === 'local') {
            pushUniqueBrokenImport(imp);
        }
    }

    if (!checkBroken) {
        return broken;
    }

    const filesystemBrokenImports = detectFilesystemBrokenImports(projectPath, filePath);
    for (const missingImport of filesystemBrokenImports) {
        pushUniqueBrokenImport(missingImport);
    }

    return broken;
}

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

function buildIndexedValidationResult(filePath, fileData, broken, unused, circularPaths, projectPath) {
    const indexedImportCount = Array.isArray(fileData?.imports) ? fileData.imports.length : 0;
    const absoluteFilePath = path.resolve(projectPath, filePath);
    const sourceImportCount = fs.existsSync(absoluteFilePath)
        ? extractRelativeModuleSpecifiers(fs.readFileSync(absoluteFilePath, 'utf8')).length
        : 0;
    return {
        file: filePath,
        totalImports: Math.max(indexedImportCount, sourceImportCount),
        brokenPaths: broken.map((entry) => entry.source),
        brokenImports: broken,
        unusedImports: unused.map((entry) => entry.name),
        circularDependencies: circularPaths,
        status: broken.length === 0 && unused.length === 0 && circularPaths.length === 0 ? 'CLEAN' : 'HAS_ISSUES'
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

        try {
            const fileData = await getFileAnalysis(this.projectPath, filePath);

            if (!fileData) {
                const filesystemValidation = buildFilesystemOnlyValidation(this.projectPath, filePath);
                if (filesystemValidation) {
                    return this.formatSuccess(filesystemValidation);
                }

                return this.formatError('NOT_FOUND', `File ${filePath} not found in the index or filesystem. Run 'omny up' or analysis.`);
            }

            const broken = collectBrokenImports(fileData, this.projectPath, filePath, checkBroken);
            const unused = checkUnused
                ? (fileData?.imports || []).filter((entry) => entry?.unused === true)
                : [];
            const circularPaths = computeCircularDependencies(this.repo, filePath, checkCircular);

            return this.formatSuccess(
                buildIndexedValidationResult(filePath, fileData, broken, unused, circularPaths, this.projectPath)
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
