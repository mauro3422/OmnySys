/**
 * @fileoverview core-analyzer.js
 * 
 * Eje central unificado para el análisis de archivos en OmnySys.
 * Soporta análisis incremental, diferentes profundidades (skeleton/deep)
 * y enriquecimiento estandarizado.
 * 
 * @module pipeline/core-analyzer
 */

import path from 'path';
import { parseFile, parseFileFromDisk } from '../parser/index.js';
import { AtomExtractionPhase } from './phases/atom-extraction/index.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:Pipeline:Core');

/**
 * Realiza el análisis central de un archivo.
 * 
 * @param {string} filePath - Ruta relativa o absoluta del archivo.
 * @param {string} rootPath - Ruta raíz del proyecto.
 * @param {Object} options - Opciones de análisis.
 * @param {string} options.depth - 'structural' (skeleton) o 'deep' (completo).
 * @param {string} options.source - Opcional, contenido del archivo si ya se leyó.
 * @param {Object} options.gitStats - Opcional, métricas de git pre-calculadas.
 * @returns {Promise<Object>} Resultado del análisis con átomos y metadata.
 */
export async function analyzeFileCore(filePath, rootPath, options = {}) {
    const {
        depth = 'deep',
        source = null,
        gitStats = null
    } = options;

    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(rootPath, filePath);
    const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, '/');

    try {
        // 1. Parsing (Layer A)
        const parsed = source
            ? await parseFile(fullPath, source)
            : await parseFileFromDisk(fullPath);
        if (parsed && !parsed.source) {
            parsed.source = source || parsed.source;
        }
        if (!parsed) {
            throw new Error(`Failed to parse file: ${fullPath}`);
        }

        // 2. Extracción de Átomos (Phase 1)
        const atomPhase = new AtomExtractionPhase();
        const context = {
            filePath: relativePath,
            code: parsed.source || source || '',
            fileInfo: parsed,
            fileMetadata: parsed.metadata || {},
            extractionDepth: depth
        };

        await atomPhase.execute(context);

        // 3. Enriquecimiento Básico (Git Stats / DNA / etc)
        if (context.atoms && context.atoms.length > 0) {
            // Aplicar Git Stats si están disponibles (evita re-calcular en cada archivo)
            if (gitStats) {
                const fileGitStats = gitStats[relativePath] || { ageDays: 0, changeFrequency: 0 };
                context.atoms.forEach(atom => {
                    atom.ageDays = fileGitStats.ageDays;
                    atom.changeFrequency = fileGitStats.changeFrequency;
                });
            }
        }

        return {
            filePath: relativePath,
            fullPath,
            atoms: context.atoms || [],
            atomCount: context.atomCount || 0,
            metadata: context.fileMetadata,
            parsed,
            depth
        };

    } catch (error) {
        logger.error(`[CoreAnalyzer] Error analyzing ${relativePath}: ${error.message}`);
        throw error;
    }
}

/**
 * Calcula el Shadow Volume real de un archivo basado en AST vs LOC físicos.
 * 
 * @param {string} sourceCode - Código fuente original.
 * @param {Array} atoms - Átomos extraídos.
 * @returns {Object} Métricas de Shadow Volume.
 */
export function calculateShadowVolume(sourceCode, atoms) {
    if (!sourceCode || !atoms) return { percentage: 0, unindexedLines: 0 };

    const totalLines = sourceCode.split('\n').length;
    const indexedLines = atoms.reduce((sum, atom) => {
        const start = atom.lineStart || atom.line || 0;
        const end = atom.lineEnd || atom.endLine || 0;
        return sum + (end - start + 1);
    }, 0);

    const unindexedLines = Math.max(0, totalLines - indexedLines);
    const percentage = Number(((unindexedLines / totalLines) * 100).toFixed(2));

    return {
        totalLines,
        indexedLines,
        unindexedLines,
        percentage
    };
}
