import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { resolveImport, getResolutionConfig } from '../../layer-a-static/resolver.js';

/**
 * Calcula hash del contenido de un archivo
 */
export async function _calculateContentHash(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return crypto.createHash('md5').update(content).digest('hex');
    } catch {
        return null;
    }
}

/**
 * Detecta si hay cambios significativos entre dos análisis
 */
export function _detectChangeType(oldAnalysis, newAnalysis) {
    const changes = [];

    // Detectar cambios en imports
    const oldImports = new Set((oldAnalysis.imports || []).map(i => i.source));
    const newImports = new Set((newAnalysis.imports || []).map(i => i.source));

    const addedImports = [...newImports].filter(i => !oldImports.has(i));
    const removedImports = [...oldImports].filter(i => !newImports.has(i));

    if (addedImports.length > 0 || removedImports.length > 0) {
        changes.push({
            type: 'IMPORT_CHANGED',
            added: addedImports,
            removed: removedImports
        });
    }

    // Detectar cambios en exports
    const oldExports = new Set((oldAnalysis.exports || []).map(e => e.name));
    const newExports = new Set((newAnalysis.exports || []).map(e => e.name));

    const addedExports = [...newExports].filter(e => !oldExports.has(e));
    const removedExports = [...oldExports].filter(e => !newExports.has(e));

    if (addedExports.length > 0 || removedExports.length > 0) {
        changes.push({
            type: 'EXPORT_CHANGED',
            added: addedExports,
            removed: removedExports
        });
    }

    // Detectar cambios en funciones
    const oldFuncs = new Set((oldAnalysis.definitions || []).filter(d => d.type === 'function').map(d => d.name));
    const newFuncs = new Set((newAnalysis.definitions || []).filter(d => d.type === 'function').map(d => d.name));

    if ([...oldFuncs].sort().join(',') !== [...newFuncs].sort().join(',')) {
        changes.push({ type: 'FUNCTIONS_CHANGED' });
    }

    return changes;
}

export async function resolveAllImports(parsed, fullPath, rootPath) {
    const resolutionConfig = await getResolutionConfig(rootPath);
    const resolvedImports = [];
    for (const importStmt of parsed.imports || []) {
        const sources = Array.isArray(importStmt.source) ? importStmt.source : [importStmt.source];
        for (const source of sources) {
            const result = await resolveImport(source, fullPath, rootPath, resolutionConfig.aliases);
            resolvedImports.push({
                source,
                resolved: result.resolved,
                type: result.type,
                specifiers: importStmt.specifiers || [],
                reason: result.reason
            });
        }
    }
    return resolvedImports;
}

export async function loadDependencySources(resolvedImports, filePath, parsedSource, rootPath) {
    const fileSourceCode = { [filePath]: parsedSource };
    for (const imp of resolvedImports) {
        if (imp.type === 'local' && imp.resolved) {
            try {
                fileSourceCode[imp.resolved] = await fs.readFile(path.join(rootPath, imp.resolved), 'utf-8');
            } catch {
                // Ignorar errores de dependencias
            }
        }
    }
    return fileSourceCode;
}

export function buildFileResult(filePath, parsed, resolvedImports, staticConnections, advancedConnections, metadata, moleculeAtoms, contentHash) {
    return {
        filePath,
        fileName: path.basename(filePath),
        ext: path.extname(filePath),
        imports: resolvedImports.map(imp => ({
            source: imp.source,
            resolvedPath: imp.resolved,
            type: imp.type,
            specifiers: imp.specifiers
        })),
        exports: parsed.exports || [],
        definitions: parsed.definitions || [],
        functionRefs: (parsed.functions || []).map(f => ({ id: f.id, name: f.name, line: f.line, isExported: f.isExported })),
        atomIds: moleculeAtoms.map(a => a.id),
        atomCount: moleculeAtoms.length,
        calls: parsed.calls || [],
        semanticConnections: [
            ...staticConnections.all.map(conn => ({
                target: conn.targetFile, type: conn.via, key: conn.key || conn.event,
                confidence: conn.confidence, detectedBy: 'static-extractor'
            })),
            ...(advancedConnections.all || []).map(conn => ({
                target: conn.targetFile, type: conn.via, channelName: conn.channelName,
                confidence: conn.confidence, detectedBy: 'advanced-extractor'
            }))
        ],
        metadata: {
            jsdocContracts: metadata.jsdoc || { all: [] },
            asyncPatterns: metadata.async || { all: [] },
            errorHandling: metadata.errors || { all: [] },
            buildTimeDeps: metadata.build || { envVars: [] },
            sideEffects: metadata.sideEffects || { all: [] },
            callGraph: metadata.callGraph || { all: [] },
            dataFlow: metadata.dataFlow || { all: [] },
            typeInference: metadata.typeInference || { all: [] },
            temporal: metadata.temporal || { all: [] },
            depDepth: metadata.depDepth || {},
            performance: metadata.performance || { all: [] },
            historical: metadata.historical || {}
        },
        contentHash,
        analyzedAt: new Date().toISOString()
    };
}
