import path from 'path';
import { access, readFile } from 'fs/promises';

import {
    extractModuleNamedExports,
    extractRelativeImportContracts,
    extractRelativeModuleSpecifiers
} from './source-analysis.js';

async function pathExists(filePath) {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function readSourceIfExists(filePath) {
    if (!(await pathExists(filePath))) {
        return null;
    }

    return readFile(filePath, 'utf8');
}

async function resolveExistingModulePath(baseDir, specifier, resolutionCache) {
    const cacheKey = `${baseDir}::${specifier}`;
    if (resolutionCache.has(cacheKey)) {
        return resolutionCache.get(cacheKey);
    }

    try {
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

        for (const candidate of candidates) {
            if (await pathExists(candidate)) {
                resolutionCache.set(cacheKey, candidate);
                return candidate;
            }
        }
    } catch {
        resolutionCache.set(cacheKey, null);
        return null;
    }

    resolutionCache.set(cacheKey, null);
    return null;
}

async function loadModuleExports(modulePath, exportsByModule) {
    if (!modulePath) {
        return new Set();
    }

    if (exportsByModule.has(modulePath)) {
        return exportsByModule.get(modulePath);
    }

    try {
        const source = await readSourceIfExists(modulePath);
        const namedExports = extractModuleNamedExports(source || '');
        exportsByModule.set(modulePath, namedExports);
        return namedExports;
    } catch {
        const emptyExports = new Set();
        exportsByModule.set(modulePath, emptyExports);
        return emptyExports;
    }
}

export async function collectFilesystemImportState(projectPath, filePath) {
    const absoluteFilePath = path.resolve(projectPath, filePath);
    const source = await readSourceIfExists(absoluteFilePath);
    if (source == null) {
        return null;
    }

    const baseDir = path.dirname(absoluteFilePath);
    const specifiers = extractRelativeModuleSpecifiers(source);
    const contracts = extractRelativeImportContracts(source);
    const resolutions = new Map();
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

    for (const specifier of specifiers) {
        const resolvedModulePath = await resolveExistingModulePath(baseDir, specifier, resolutions);
        if (!resolvedModulePath) {
            pushBroken({
                source: specifier,
                type: 'local',
                resolved: false,
                reason: 'filesystem_missing'
            });
        }
    }

    for (const contract of contracts) {
        if (contract.namedImports.length === 0 || contract.namespaceImport) {
            continue;
        }

        const resolvedModulePath = await resolveExistingModulePath(baseDir, contract.specifier, resolutions);
        if (!resolvedModulePath) {
            continue;
        }

        const moduleExports = await loadModuleExports(resolvedModulePath, exportsByModule);
        for (const missingName of contract.namedImports.filter((name) => !moduleExports.has(name))) {
            pushBroken({
                source: contract.specifier,
                type: 'local',
                resolved: false,
                reason: 'missing_named_export',
                missingExport: missingName
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
        validationMode: 'filesystem_fallback'
    };
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

    const state = await collectFilesystemImportState(projectPath, filePath);
    for (const missingImport of state?.broken || []) {
        pushUniqueBrokenImport(missingImport);
    }

    return broken;
}

export async function buildIndexedValidationResult(filePath, fileData, broken, unused, circularPaths, projectPath) {
    const indexedImportCount = Array.isArray(fileData?.imports) ? fileData.imports.length : 0;
    const state = await collectFilesystemImportState(projectPath, filePath);
    const sourceImportCount = state?.specifierCount || 0;

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
