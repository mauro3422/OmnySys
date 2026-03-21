import path from 'path';

import { parseFileFromDisk } from '../parser/index.js';
import { resolveImport, getResolutionConfig } from '../resolver.js';
import { detectAllSemanticConnections } from '../extractors/static/index.js';
import { detectAllAdvancedConnections } from '../extractors/communication/index.js';

/**
 * Resuelve todos los imports del archivo para determinar dependencias de modulos locales
 */
export async function resolveFileImports(parsedFile, targetFilePath, absoluteRootPath) {
    const resolutionConfig = await getResolutionConfig(absoluteRootPath);
    const resolvedImports = [];
    for (const importStmt of parsedFile.imports || []) {
        const sources = Array.isArray(importStmt.source) ? importStmt.source : [importStmt.source];
        for (const source of sources) {
            const result = await resolveImport(source, targetFilePath, absoluteRootPath, resolutionConfig.aliases);
            resolvedImports.push({
                source,
                resolved: result.resolved,
                type: result.type,
                specifiers: importStmt.specifiers,
                reason: result.reason
            });
        }
    }
    return resolvedImports;
}

/**
 * Detecta conexiones semanticas y de comunicacion avanzada parseando el codigo fuente y el de sus dependencias locales
 */
export async function detectConnections(parsedFile, targetFilePath, resolvedImports, absoluteRootPath) {
    const fileSourceCode = { [targetFilePath]: parsedFile.source || '' };
    const allParsedFiles = { [targetFilePath]: parsedFile };

    for (const imp of resolvedImports) {
        if (imp.type === 'local' && imp.resolved) {
            try {
                const depPath = path.join(absoluteRootPath, imp.resolved);
                const depParsed = await parseFileFromDisk(depPath);
                if (depParsed) {
                    allParsedFiles[depPath] = depParsed;
                    fileSourceCode[depPath] = depParsed.source || '';
                }
            } catch {
                // Ignore dependency errors
            }
        }
    }

  return {
    staticConnections: detectAllSemanticConnections(fileSourceCode),
    advancedConnections: detectAllAdvancedConnections(parsedFile.source || '')
  };
}

/**
 * Deriva el nombre del módulo a partir de la ruta del archivo.
 * Mantiene la convención usada por project-query: top-level directory.
 *
 * @param {string} filePath - Ruta relativa o absoluta del archivo
 * @param {string|null} rootPath - Raíz opcional para normalizar rutas absolutas
 * @returns {string} moduleName
 */
export function deriveModuleName(filePath, rootPath = null) {
    if (!filePath || typeof filePath !== 'string') {
        return '_root';
    }

    let normalizedPath = filePath.replace(/\\/g, '/');

    if (rootPath && typeof rootPath === 'string' && path.isAbsolute(filePath)) {
        const normalizedRoot = rootPath.replace(/\\/g, '/');
        if (normalizedPath.startsWith(normalizedRoot)) {
            normalizedPath = path.relative(rootPath, filePath).replace(/\\/g, '/');
        }
    }

    normalizedPath = normalizedPath.replace(/^\.?\//, '');
    const segments = normalizedPath.split('/').filter(Boolean);

    if (segments.length <= 1) {
        return '_root';
    }

    return segments[0] || '_root';
}

/**
 * Marca un átomo como removido, preservando toda su metadata como snapshot histórico.
 * El átomo sigue en storage pero excluido de análisis activos por defecto.
 */
export function markAtomAsRemoved(atom) {
    return {
        ...atom,
        purpose: 'REMOVED',
        isDeadCode: true,
        callerPattern: {
            id: 'removed',
            label: 'Eliminado',
            reason: 'Function no longer exists in source file'
        },
        lineage: {
            status: 'removed',
            removedAt: new Date().toISOString(),
            lastSeenAt: atom.extractedAt || atom.analyzedAt || null,
            lastSeenLine: atom.line || null,
            snapshotLOC: atom.linesOfCode ?? atom.lines ?? null,
            snapshotComplexity: atom.complexity ?? null,
            snapshotCallers: Array.isArray(atom.calledBy) ? atom.calledBy.length : 0,
            // Preservar DNA para detección de duplicados futuros
            dnaHash: atom.dna?.structuralHash || atom.dna?.patternHash || null
        }
    };
}

/**
 * Construye el objeto final de analisis del archivo que sera persistido
 */
export function buildFileAnalysis(singleFile, parsedFile, resolvedImports, staticConnections, advancedConnections, metadata, atoms) {
    return {
        filePath: singleFile,
        fileName: path.basename(singleFile),
        ext: path.extname(singleFile),
        moduleName: deriveModuleName(singleFile),
        imports: resolvedImports.map(imp => ({
            source: imp.source,
            resolvedPath: imp.resolved,
            type: imp.type,
            specifiers: imp.specifiers || []
        })),
        exports: parsedFile.exports || [],
        definitions: parsedFile.definitions || [],
        semanticConnections: [
            ...staticConnections.all.map(conn => ({
                target: conn.targetFile,
                type: conn.via,
                key: conn.key || conn.event,
                confidence: conn.confidence,
                detectedBy: 'static-extractor'
            })),
            ...advancedConnections.all.map(conn => ({
                target: conn.targetFile,
                type: conn.via,
                channelName: conn.channelName,
                confidence: conn.confidence,
                detectedBy: 'advanced-extractor'
            }))
        ],
        metadata: {
            jsdocContracts: metadata.jsdoc || { all: [] },
            asyncPatterns: metadata.async || { all: [] },
            errorHandling: metadata.errors || { all: [] },
            buildTimeDeps: metadata.build || { envVars: [] }
        },
        atoms,
        totalAtoms: atoms.length,
        atomsByType: atoms.reduce((acc, atom) => {
            acc[atom.type] = (acc[atom.type] || 0) + 1;
            return acc;
        }, {}),
        analyzedAt: new Date().toISOString()
    };
}
