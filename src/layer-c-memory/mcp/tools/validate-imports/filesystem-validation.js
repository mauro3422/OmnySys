/**
 * @fileoverview filesystem-validation.js
 *
 * Validates imports against canonical DB metadata only.
 * If the file is not represented in the compiler index, validation fails
 * explicitly instead of falling back to filesystem/runtime inspection.
 */

import path from 'path';
import { getFileAnalysis, getFileExports } from '#layer-c/query/apis/file-api.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import { buildPropagationPlan, summarizePropagationPlan } from '#shared/compiler/index.js';
import { normalizeComparablePath, normalizePath } from '#shared/utils/path-utils.js';

export { normalizeComparablePath };

function createCacheKey(projectPath, filePath) {
    return `${normalizeComparablePath(projectPath)}::${normalizeComparablePath(filePath)}`;
}

/**
 * Resolves a relative import path against the importing file's directory.
 * If the modulePath is already absolute/fully-qualified, returns it as-is.
 */
function resolveImportModulePath(projectPath, importingFilePath, modulePath) {
    if (!modulePath) return '';

    // If it's already a full path (starts with src/ or is absolute), return normalized
    const normalized = normalizePath(modulePath, projectPath);
    if (!modulePath.startsWith('.') && !modulePath.startsWith('/')) {
        // External module or already-resolved
        return normalized;
    }

    // Resolve relative path against the importing file's directory
    const importingDir = path.posix.dirname(importingFilePath);
    const resolved = path.posix.join(importingDir, modulePath);
    // Add .js extension if missing (ESM convention in this project)
    const withExtension = resolved.endsWith('.js') ? resolved : `${resolved}.js`;
    return normalizePath(withExtension, projectPath);
}

async function loadModuleExportsFromDb(projectPath, modulePath, exportsByModule) {
    if (!modulePath) {
        return new Set();
    }

    const normalizedModulePath = normalizePath(modulePath, projectPath);
    const cacheKey = createCacheKey(projectPath, normalizedModulePath);
    if (exportsByModule.has(cacheKey)) {
        return exportsByModule.get(cacheKey);
    }

    const moduleExports = await getFileExports(projectPath, normalizedModulePath).catch(() => new Set());

    // Always merge exports_json from DB to catch re-exports that are not atoms
    // e.g.: export { foo as bar } from './other.js' — these don't create atoms
    // but ARE present in files.exports_json
    const repo = getRepository(projectPath);
    if (repo?.initialized && repo?.db && repo.db.open !== false) {
        const row = repo.db.prepare(
            'SELECT exports_json FROM files WHERE path = ? AND is_removed = 0'
        ).get(normalizedModulePath);
        if (row?.exports_json) {
            try {
                const exports = JSON.parse(row.exports_json);
                for (const exp of exports) {
                    if (typeof exp === 'string') {
                        moduleExports.add(exp);
                    } else if (exp?.name) {
                        moduleExports.add(exp.name);
                    } else if (exp?.exportedAs) {
                        moduleExports.add(exp.exportedAs);
                    } else if (exp?.localName) {
                        moduleExports.add(exp.localName);
                    }
                }
            } catch {
                // JSON parse error — skip
            }
        }
    }

    exportsByModule.set(cacheKey, moduleExports);
    return moduleExports;
}

function parseJsonArray(value, fallback = []) {
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch {
            return fallback;
        }
    }

    return Array.isArray(value) ? value : fallback;
}

function buildValidationPropagationPlan({
    filePath,
    importCount = 0,
    brokenCount = 0,
    circularCount = 0
} = {}) {
    return summarizePropagationPlan(buildPropagationPlan({
        changeType: 'policy_drift',
        decision: brokenCount > 0 || circularCount > 0 ? 'review' : 'approve',
        mode: brokenCount > 0 || circularCount > 0 ? 'alert_and_review' : 'alert_and_recommend',
        impactedFileCount: 1,
        validationTargetCount: importCount,
        candidateCount: brokenCount + circularCount,
        findingCount: brokenCount + circularCount,
        ruleCount: brokenCount + circularCount,
        policyAreaCount: 1,
        guidance: brokenCount > 0 || circularCount > 0
            ? 'Attach the canonical propagation plan before surfacing import validation drift.'
            : 'Keep import validation attached to the canonical propagation contract.',
        recommendationStrategy: 'validate_imports',
        focusPath: filePath || null,
        scopePath: filePath || null,
        connectedSystems: [
            { name: 'validate_imports', role: 'verification' },
            { name: 'watcher', role: 'persistence' },
            { name: 'technical_debt_report', role: 'consumer' },
            { name: 'status_panel', role: 'visibility' },
            { name: 'health_snapshot', role: 'history' },
            { name: 'compiler_explainability', role: 'explainability' },
            { name: 'drift_assessment', role: 'governance' }
        ]
    }));
}

async function loadIndexedFileAnalysis(projectPath, filePath, repo = null) {
    const indexedFilePath = normalizePath(filePath, projectPath);
    const indexedRepo = repo || getRepository(projectPath);
    if (indexedRepo?.initialized && indexedRepo?.db && indexedRepo.db.open !== false) {
        const row = indexedRepo.db.prepare(
            'SELECT * FROM files WHERE path = ? AND is_removed = 0'
        ).get(indexedFilePath);
        if (row) {
            const atoms = indexedRepo.db.prepare(
                'SELECT * FROM atoms WHERE file_path = ? AND is_removed = 0'
            ).all(indexedFilePath);
            return {
                file: indexedFilePath,
                path: indexedFilePath,
                imports: parseJsonArray(row.imports_json, []),
                exports: parseJsonArray(row.exports_json, []),
                atoms,
                atomCount: atoms.length,
                propagation: buildValidationPropagationPlan({
                    filePath: indexedFilePath,
                    importCount: parseJsonArray(row.imports_json, []).length,
                    brokenCount: 0
                })
            };
        }
    }

    const analysis = await getFileAnalysis(projectPath, indexedFilePath).catch(() => null);
    if (analysis) {
        return analysis;
    }

    return null;
}

export { loadIndexedFileAnalysis };

function extractImportNames(entry) {
    const specifiers = Array.isArray(entry?.specifiers) ? entry.specifiers : [];
    return {
        specifiers,
        names: specifiers
            .map((specifier) => specifier?.local || specifier?.name || specifier?.imported)
            .filter(Boolean),
        namespaceImport: specifiers.some((specifier) => specifier?.type === 'namespace')
    };
}

function createBrokenEntry(source, missingExport, reason = 'missing_named_export') {
    return {
        source,
        type: 'db',
        resolved: true,
        reason,
        missingExport
    };
}

async function inspectImportEntryAgainstDb(projectPath, importingFilePath, entry, exportsByModule) {
    const rawModulePath = entry?.resolvedPath || entry?.resolved || entry?.source || entry?.fromModule;
    const { names, namespaceImport } = extractImportNames(entry);

    if (!rawModulePath || namespaceImport || names.length === 0) {
        return [];
    }

    // Resolve relative imports against the importing file's directory
    const resolvedModulePath = resolveImportModulePath(projectPath, importingFilePath, rawModulePath);
    const moduleExports = await loadModuleExportsFromDb(projectPath, resolvedModulePath, exportsByModule);
    return names
        .filter((name) => !moduleExports.has(name))
        .map((missingName) => createBrokenEntry(rawModulePath, missingName));
}

export async function collectDatabaseImportState(projectPath, filePath, repo = null) {
    const indexedFilePath = normalizePath(filePath, projectPath);
    const analysis = await loadIndexedFileAnalysis(projectPath, indexedFilePath, repo);

    if (!analysis) {
        throw new Error(`DB_MISSING: ${filePath} is not indexed in the canonical compiler DB`);
    }

    const imports = Array.isArray(analysis.imports) ? analysis.imports : [];
    const exportsByModule = new Map();
    const broken = [];
    const brokenFingerprints = new Set();
    const pushBroken = (entry) => {
        const fingerprint = [
            entry?.source || '',
            entry?.reason || '',
            entry?.missingExport || ''
        ].join('::');
        if (brokenFingerprints.has(fingerprint)) {
            return;
        }
        brokenFingerprints.add(fingerprint);
        broken.push(entry);
    };

    for (const entry of imports) {
        const brokenEntries = await inspectImportEntryAgainstDb(projectPath, indexedFilePath, entry, exportsByModule);
        for (const brokenEntry of brokenEntries) {
            pushBroken(brokenEntry);
        }
    }

    return {
        source: analysis,
        broken,
        specifierCount: imports.length,
        compilerIndexed: true,
        sourceOfTruth: 'database',
        propagation: buildValidationPropagationPlan({
            filePath: indexedFilePath,
            importCount: imports.length,
            brokenCount: broken.length
        })
    };
}

export async function buildDatabaseOnlyValidation(projectPath, filePath, repo = null) {
    try {
        const state = await collectDatabaseImportState(projectPath, filePath, repo);

        return {
            file: filePath,
            totalImports: state.specifierCount,
            brokenPaths: state.broken.map((entry) => entry.source),
            brokenImports: state.broken,
            unusedImports: [],
            circularDependencies: [],
            status: state.broken.length === 0 ? 'CLEAN' : 'HAS_ISSUES',
            validationMode: 'database_only',
            compilerIndexed: state.compilerIndexed,
            propagation: state.propagation
        };
    } catch (error) {
        return {
            file: filePath,
            totalImports: 0,
            brokenPaths: [],
            brokenImports: [{
                source: '*',
                type: 'db_error',
                resolved: false,
                reason: 'db_unavailable',
                missingExport: error.message
            }],
            unusedImports: [],
            circularDependencies: [],
            status: 'HAS_ISSUES',
            validationMode: 'database_only',
            compilerIndexed: false,
            propagation: buildValidationPropagationPlan({
                filePath,
                importCount: 0,
                brokenCount: 1
            })
        };
    }
}

export async function collectBrokenImports(fileData, projectPath, filePath, checkBroken, repo = null) {
    const broken = [];
    const fingerprints = new Set();
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

    if (!checkBroken) {
        return broken;
    }

    const state = await collectDatabaseImportState(projectPath, filePath, repo);
    for (const missingImport of state?.broken || []) {
        pushUniqueBrokenImport(missingImport);
    }

    return broken;
}

export async function buildIndexedValidationResult(repo, filePath, fileData, broken, unused, circularPaths, projectPath) {
    const indexedImportCount = Array.isArray(fileData?.imports) ? fileData.imports.length : 0;
    const propagation = buildValidationPropagationPlan({
        filePath,
        importCount: indexedImportCount,
        brokenCount: broken.length,
        circularCount: circularPaths.length
    });

    return {
        file: filePath,
        totalImports: indexedImportCount,
        brokenPaths: broken.map((entry) => entry.source),
        brokenImports: broken,
        unusedImports: unused.map((entry) => entry.name),
        circularDependencies: circularPaths,
        status: broken.length === 0 && unused.length === 0 && circularPaths.length === 0 ? 'CLEAN' : 'HAS_ISSUES',
        validationMode: 'database_only',
        compilerIndexed: true,
        propagation
    };
}

export const collectFilesystemImportState = collectDatabaseImportState;
export const buildFilesystemOnlyValidation = buildDatabaseOnlyValidation;
