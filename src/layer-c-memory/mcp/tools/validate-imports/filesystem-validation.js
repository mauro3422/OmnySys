/**
 * @fileoverview filesystem-validation.js
 *
 * Validates imports against canonical DB metadata only.
 * If the file is not represented in the compiler index, validation fails
 * explicitly instead of falling back to filesystem/runtime inspection.
 */

import { getFileAnalysis, getFileExports } from '#layer-c/query/apis/file-api.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import { normalizeComparablePath, normalizePath } from '#shared/utils/path-utils.js';

export { normalizeComparablePath };

function createCacheKey(projectPath, filePath) {
    return `${normalizeComparablePath(projectPath)}::${normalizeComparablePath(filePath)}`;
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
                atomCount: atoms.length
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

async function inspectImportEntryAgainstDb(projectPath, entry, exportsByModule) {
    const fromModule = entry?.resolvedPath || entry?.resolved || entry?.source || entry?.fromModule;
    const { names, namespaceImport } = extractImportNames(entry);

    if (!fromModule || namespaceImport || names.length === 0) {
        return [];
    }

    const moduleExports = await loadModuleExportsFromDb(projectPath, fromModule, exportsByModule);
    return names
        .filter((name) => !moduleExports.has(name))
        .map((missingName) => createBrokenEntry(fromModule, missingName));
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
        const brokenEntries = await inspectImportEntryAgainstDb(projectPath, entry, exportsByModule);
        for (const brokenEntry of brokenEntries) {
            pushBroken(brokenEntry);
        }
    }

    return {
        source: analysis,
        broken,
        specifierCount: imports.length,
        compilerIndexed: true,
        sourceOfTruth: 'database'
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
            compilerIndexed: state.compilerIndexed
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
            compilerIndexed: false
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

    return {
        file: filePath,
        totalImports: indexedImportCount,
        brokenPaths: broken.map((entry) => entry.source),
        brokenImports: broken,
        unusedImports: unused.map((entry) => entry.name),
        circularDependencies: circularPaths,
        status: broken.length === 0 && unused.length === 0 && circularPaths.length === 0 ? 'CLEAN' : 'HAS_ISSUES',
        validationMode: 'database_only',
        compilerIndexed: true
    };
}

export const collectFilesystemImportState = collectDatabaseImportState;
export const buildFilesystemOnlyValidation = buildDatabaseOnlyValidation;
