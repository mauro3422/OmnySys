/**
 * @fileoverview Re-indexación de archivos
 * Extraído de atomic-edit.js para modularidad
 */

import path from 'path';
import { createLogger } from '../../../../utils/logger.js';
import { saveAtomsIncremental } from '#layer-c/storage/atoms/incremental-atom-saver.js';
import { parseFileFromDisk } from '#layer-a/parser/index.js';
import { extractAllMetadata } from '#layer-a/extractors/metadata/index.js';
import * as atomExtractor from '#layer-a/pipeline/phases/atom-extraction/extraction/atom-extractor.js';
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

    const relativePath = path.relative(projectPath, absolutePath);

    // 1. Parsear el archivo con Tree-sitter
    const parsedFile = await parseFileFromDisk(absolutePath);
    if (!parsedFile) throw new Error(`Could not parse file: ${relativePath}`);

    const code = parsedFile.source || '';

    // 2. Extraer metadata (JSDoc, async, etc.) para el extractor de átomos
    const metadata = extractAllMetadata(absolutePath, code);

    // 3. Extraer átomos usando el resultado del parser y metadata
    // Nota: El extractor de átomos ahora requiere (fileInfo, code, fileMetadata, filePath)
    const atoms = await extractAtoms(parsedFile, code, metadata, relativePath);

    if (!atoms || atoms.length === 0) {
      // No retornamos early aquí para permitir que saveAtomsIncremental maneje la limpieza si es necesario
    }

    // 4. Guardar de forma incremental en SQLite
    await saveAtomsIncremental(projectPath, relativePath, atoms, { source: 'atomic-edit' });

    // FIX: El incremental saver NO actualiza la tabla 'files'. Lo hacemos manualmente para que fix_imports lo vea.
    try {
      const { getRepository } = await import('../../../storage/repository/index.js');
      const repo = getRepository(projectPath);
      if (repo.db) {
        repo.db.prepare(`
          INSERT INTO files (path, last_analyzed, total_lines)
          VALUES (?, ?, ?)
          ON CONFLICT(path) DO UPDATE SET last_analyzed = excluded.last_analyzed, total_lines = excluded.total_lines
        `).run(relativePath, new Date().toISOString(), code.split('\n').length);
      }
    } catch (e) {
      console.warn(`[DEBUG-REINDEX] Manual 'files' update error: ${e.message}`);
    }

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
