/**
 * @fileoverview filesystem-validation.js
 *
 * Validates imports using ONLY OmnySys DB.
 * No filesystem fallback - single source of truth.
 */

import path from 'path';
import { getFileExports } from '#layer-c/query/apis/file-api.js';

import {
    extractRelativeImportContracts,
    extractRelativeModuleSpecifiers
} from './source-analysis.js';

/**
 * Loads named exports from OmnySys DB for a given file path.
 * Uses canonical API getFileExports instead of direct DB access.
 * @param {string} projectPath - Project root path
 * @param {string} filePath - File path to query
 * @returns {Promise<Set<string>>} Set of exported names
 */
async function loadExportsFromDb(projectPath, filePath) {
    // Use canonical API instead of direct DB access
    const exports = await getFileExports(projectPath, filePath);
    return exports;
}

/**
 * Collects all exports from DB only.
 * @param {string} projectPath - Project root path
 * @param {string} filePath - File path to analyze
 * @param {Map} exportsByModule - Cache of exports by module path
 * @returns {Promise<Set<string>>}
 */
async function collectAllExports(projectPath, filePath, exportsByModule) {
    const cacheKey = `${projectPath}::${filePath}`;
    if (exportsByModule.has(cacheKey)) {
        return exportsByModule.get(cacheKey);
    }

    // DB ONLY - no filesystem fallback
    const dbExports = await loadExportsFromDb(projectPath, filePath);
    exportsByModule.set(cacheKey, dbExports);
    return dbExports;
}

/**
 * Loads module exports from DB only.
 * @param {string} projectPath - Project root path
 * @param {string} modulePath - Module path to load
 * @param {Map} exportsByModule - Cache of exports by module
 * @returns {Promise<Set<string>>}
 */
async function loadModuleExports(projectPath, modulePath, exportsByModule) {
    if (!modulePath) {
        return new Set();
    }

    const cacheKey = `${projectPath}::${modulePath}`;
    if (exportsByModule.has(cacheKey)) {
        return exportsByModule.get(cacheKey);
    }

    // DB ONLY
    return collectAllExports(projectPath, modulePath, exportsByModule);
}

export async function collectFilesystemImportState(projectPath, filePath) {
    // Read source file to extract import contracts (still need filesystem for this)
    const absoluteFilePath = path.resolve(projectPath, filePath);
    let source;
    try {
        const { readFile } = await import('fs/promises');
        source = await readFile(absoluteFilePath, 'utf8');
    } catch (error) {
        throw new Error(`Cannot read source file ${filePath}: ${error.message}`);
    }

    const baseDir = path.dirname(absoluteFilePath);
    const specifiers = extractRelativeModuleSpecifiers(source);
    const contracts = extractRelativeImportContracts(source);
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

    // Validate specifiers exist in DB
    for (const specifier of specifiers) {
        const resolvedPath = path.resolve(baseDir, specifier).replace(/\\/g, '/');
        const normalizedResolved = resolvedPath.replace(projectPath.replace(/\\/g, '/'), '').replace(/^\//, '');

        try {
            await loadModuleExports(projectPath, normalizedResolved, exportsByModule);
        } catch (error) {
            pushBroken({
                source: specifier,
                type: 'local',
                resolved: false,
                reason: 'db_missing',
                missingExport: error.message
            });
        }
    }

    // Validate named exports from DB
    for (const contract of contracts) {
        if (contract.namedImports.length === 0 || contract.namespaceImport) {
            continue;
        }

        const resolvedPath = path.resolve(baseDir, contract.specifier).replace(/\\/g, '/');
        const normalizedResolved = resolvedPath.replace(projectPath.replace(/\\/g, '/'), '').replace(/^\//, '');

        try {
            const moduleExports = await loadModuleExports(projectPath, normalizedResolved, exportsByModule);
            for (const missingName of contract.namedImports.filter((name) => !moduleExports.has(name))) {
                pushBroken({
                    source: contract.specifier,
                    type: 'local',
                    resolved: true,
                    reason: 'missing_named_export',
                    missingExport: missingName
                });
            }
        } catch (error) {
            pushBroken({
                source: contract.specifier,
                type: 'local',
                resolved: false,
                reason: 'db_missing',
                missingExport: error.message
            });
        }
    }

    return {
        source,
        broken,
        specifierCount: specifiers.length
    };
}

export async function buildFilesystemOnlyValidation(projectPath, filePath) {
    try {
        const state = await collectFilesystemImportState(projectPath, filePath);
        if (!state) {
            return null;
        }

        return {
            file: filePath,
            totalImports: state.specifierCount,
            brokenPaths: state.broken.map((entry) => entry.source),
            brokenImports: state.broken,
            unusedImports: [],
            circularDependencies: [],
            status: state.broken.length === 0 ? 'CLEAN' : 'HAS_ISSUES',
            validationMode: 'db_only'
        };
    } catch (error) {
        // DB error - return as issue
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
            validationMode: 'db_only'
        };
    }
}

export async function collectBrokenImports(fileData, projectPath, filePath, checkBroken) {
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

    // Use DB + filesystem hybrid approach
    const state = await collectFilesystemImportState(projectPath, filePath);
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
        validationMode: 'db_only'
    };
}
