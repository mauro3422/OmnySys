/**
 * @fileoverview Re-indexación de archivos
 * Extraído de atomic-edit.js para modularidad
 */

import path from 'path';
import { createLogger } from '../../../../utils/logger.js';
import { saveAtomsIncremental } from '#layer-c/storage/atoms/incremental-atom-saver.js';
import { parseFileFromDisk } from '#layer-a/parser/index.js';
import { extractMetadataSurface } from '#layer-a/pipeline/metadata-gateway.js';
import { calculateContentHash } from '#layer-a/pipeline/incremental-analysis-utils.js';
import { saveFileResult } from '#layer-a/pipeline/single-file-db.js';
import { buildFileAnalysis, resolveFileImports } from '#layer-a/pipeline/single-file-utils.js';
import * as atomExtractor from '#layer-a/pipeline/phases/atom-extraction/extraction/atom-extractor.js';
import { clearWatcherIssue } from '../../../../core/file-watcher/watcher-issue-persistence.js';
import { syncRuntimeTableHealthIssues } from '../../../../core/diagnostics/runtime-table-health.js';
const extractAtoms = atomExtractor.extractAtoms || atomExtractor.default.extractAtoms;

const logger = createLogger('OmnySys:atomic:reindex');

/**
 * Re-indexa un archivo después de editar (incremental)
 * Usa el pipeline Tree-sitter completo para integridad total
 */
export async function reindexFile(filePath, projectPath) {
  try {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(projectPath, filePath);

    const relativePath = path.relative(projectPath, absolutePath).replace(/\\/g, '/');

    // 1. Parsear el archivo con Tree-sitter
    const parsedFile = await parseFileFromDisk(absolutePath);
    if (!parsedFile) throw new Error(`Could not parse file: ${relativePath}`);

    const code = parsedFile.source || '';

    // 2. Extraer metadata (JSDoc, async, etc.) para el extractor de átomos
    const metadata = await extractMetadataSurface({
      mode: 'file',
      filePath: absolutePath,
      code
    });

    // 3. Extraer átomos usando el resultado del parser y metadata
    // Nota: El extractor de átomos ahora requiere (fileInfo, code, fileMetadata, filePath)
    const atoms = await extractAtoms(parsedFile, code, metadata, relativePath);

    if (!atoms || atoms.length === 0) {
      // No retornamos early aquí para permitir que saveAtomsIncremental maneje la limpieza si es necesario
    }

    // 4. Guardar de forma incremental en SQLite
    // Ahora repo.saveMany (vía incremental-atom-saver) actualiza la tabla 'files' automáticamente en la misma transacción
    await saveAtomsIncremental(projectPath, relativePath, atoms, { source: 'atomic-edit' });

    // 4b. Refrescar el summary de archivo para mantener `files.imports_json` y `files.exports_json`
    // alineados con el parser actual. validate_imports y varias superficies de compiler leen
    // esa tabla, así que dejarla vieja genera falsos positivos aunque atoms ya estén frescos.
    const resolvedImports = await resolveFileImports(parsedFile, absolutePath, projectPath);
    const fileAnalysis = buildFileAnalysis(
      relativePath,
      parsedFile,
      resolvedImports,
      { all: [] },
      { all: [] },
      metadata,
      atoms
    );
    fileAnalysis.totalLines = code.split(/\r?\n/).length;

    await saveFileResult(
      projectPath,
      relativePath,
      fileAnalysis,
      calculateContentHash(code),
      null,
      false,
      false
    );

    // A successful reindex should clear transient watcher runtime failures for
    // the same file, matching the success path used by the live file watcher.
    await clearWatcherIssue(projectPath, relativePath, 'watcher_runtime_error');

    // Keep project-wide runtime-table health aligned with the freshly reindexed
    // support tables. This prevents stale live-row drift alerts from surviving
    // a successful atomic edit / move cycle.
    await syncRuntimeTableHealthIssues(projectPath);

    // Invalidate cache for this file
    try {
      const { invalidateCacheInstance } = await import('#core/cache/index.js');
      await invalidateCacheInstance(projectPath);
      logger.debug(`[Reindex] Cache invalidated for ${relativePath}`);
    } catch (e) {
      logger.warn(`[Reindex] Cache invalidation failed: ${e.message}`);
    }

    logger.info(`[Reindex] Updated ${atoms.length} atoms for ${relativePath}`);

    return {
      success: true,
      atoms,
      exports: parsedFile.exports || [],
      relativePath
    };
  } catch (error) {
    logger.error(`[Reindex] Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}
