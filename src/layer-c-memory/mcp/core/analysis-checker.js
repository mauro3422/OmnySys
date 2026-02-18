/**
 * @fileoverview analysis-checker.js
 *
 * Verifica y ejecuta Layer A si es necesario.
 * Flujo: Verifica .omnysysdata/ -> Ejecuta Layer A si falta -> Espera completado
 *
 * @module mcp/core/analysis-checker
 */

import path from 'path';
import fs from 'fs/promises';

const DATA_DIR = '.omnysysdata';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:analysis:checker');



/**
 * Verifica si existe analisis previo en .omnysysdata/
 */
async function hasExistingAnalysis(projectPath) {
  try {
    const indexPath = path.join(projectPath, DATA_DIR, 'index.json');
    await fs.access(indexPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Escanear archivos actuales del proyecto
 */
async function scanCurrentFiles(projectPath) {
  const files = [];
  
  async function scanDir(dir, relativePath = '') {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.join(relativePath, entry.name);
        
        // Ignorar node_modules y .omnysysdata
        if (entry.name === 'node_modules' || entry.name === '.omnysysdata' || entry.name.startsWith('.')) {
          continue;
        }
        
        if (entry.isDirectory()) {
          await scanDir(fullPath, relPath);
        } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts') || entry.name.endsWith('.jsx') || entry.name.endsWith('.tsx'))) {
          const stats = await fs.stat(fullPath);
          files.push({
            path: relPath.replace(/\\/g, '/'),
            fullPath,
            mtime: stats.mtime.getTime(),
            size: stats.size
          });
        }
      }
    } catch (error) {
      // Ignorar errores de lectura
    }
  }
  
  await scanDir(projectPath);
  return files;
}

/**
 * Detectar cambios entre proyecto y cache
 */
async function detectCacheChanges(projectPath, metadata) {
  try {
    // Escanear archivos actuales
    const currentFiles = await scanCurrentFiles(projectPath);
    const currentFileMap = new Map(currentFiles.map(f => [f.path, f]));
    
    // Obtener archivos del cache
    const cachedFiles = metadata?.fileIndex || metadata?.files || {};
    const cachedFileSet = new Set(Object.keys(cachedFiles));
    
    const changes = {
      newFiles: [],
      modifiedFiles: [],
      deletedFiles: [],
      unchangedFiles: []
    };
    
    // Detectar archivos nuevos y modificados
    for (const [filePath, fileInfo] of currentFileMap) {
      const normalizedPath = filePath.replace(/\\/g, '/');
      
      if (!cachedFileSet.has(normalizedPath)) {
        // Archivo nuevo
        changes.newFiles.push(normalizedPath);
      } else {
        // Verificar si fue modificado (comparar timestamps)
        const cachedInfo = cachedFiles[normalizedPath];
        const cachedTime = cachedInfo?.lastAnalyzed || cachedInfo?.metadata?.lastAnalyzed || 0;
        
        if (fileInfo.mtime > cachedTime) {
          changes.modifiedFiles.push(normalizedPath);
        } else {
          changes.unchangedFiles.push(normalizedPath);
        }
      }
    }
    
    // Detectar archivos eliminados
    for (const cachedPath of cachedFileSet) {
      if (!currentFileMap.has(cachedPath)) {
        changes.deletedFiles.push(cachedPath);
      }
    }
    
    return changes;
  } catch (error) {
    logger.warn('   ⚠️  Failed to detect cache changes:', error.message);
    return { newFiles: [], modifiedFiles: [], deletedFiles: [], unchangedFiles: [], error: true };
  }
}

/**
 * Cuenta archivos pendientes de analisis LLM
 */
async function countPendingLLMAnalysis(projectPath) {
  try {
    const { getProjectMetadata } = await import('#layer-c/query/apis/project-api.js');
    const { getFileAnalysis } = await import('#layer-c/query/apis/file-api.js');

    const metadata = await getProjectMetadata(projectPath);

    let pendingCount = 0;
    const fileEntries = metadata?.fileIndex || metadata?.files || {};

    for (const filePath of Object.keys(fileEntries)) {
      const analysis = await getFileAnalysis(projectPath, filePath);

      // Un archivo necesita LLM si:
      // 1. No tiene llmInsights Y
      // 2. Tiene caracteristicas que sugieren que necesita LLM
      if (!analysis?.llmInsights) {
        const needsLLM =
          analysis?.semanticAnalysis?.sharedState?.writes?.length > 0 ||
          analysis?.semanticAnalysis?.eventPatterns?.eventListeners?.length > 0 ||
          (analysis?.exports?.length > 0 && analysis?.dependents?.length === 0);

        if (needsLLM) pendingCount++;
      }
    }

    return pendingCount;
  } catch {
    return 0;
  }
}

/**
 * Ejecuta Layer A completo (BLOQUEANTE)
 */
async function runFullIndexing(projectPath) {
  const { indexProject } = await import('#layer-a/indexer.js');

  logger.info('   \uD83D\uDE80 Starting Layer A: Static Analysis...');
  logger.info('   \u23F3 This may take 30-60 seconds...');

  try {
    const result = await indexProject(projectPath, {
      verbose: true,
      skipLLM: false,
      outputPath: 'system-map.json'
    });

    logger.info(`\n   \uD83D\uDCCA Layer A: ${Object.keys(result.files || {}).length} files analyzed`);

    // Verificar si IA se activo
    const hasLLM = Object.values(result.files || {}).some(
      f => f.aiEnhancement || f.llmInsights
    );

    if (hasLLM) {
      logger.info('   \uD83E\uDD16 Layer B: IA enrichment applied');
    } else {
      logger.info('   \u2139\uFE0F  Layer B: Static analysis sufficient (no IA needed)');
    }

    return result;
  } catch (error) {
    logger.info('   \u274C Indexing failed:', error.message);
    throw error;
  }
}

/**
 * Verifica y ejecuta analisis si es necesario
 * Flujo principal llamado durante inicializacion
 */
export async function checkAndRunAnalysis(projectPath) {
  try {
    const { getProjectMetadata } =
      await import('#layer-c/query/apis/project-api.js');

    const hasAnalysis = await hasExistingAnalysis(projectPath);

    if (!hasAnalysis) {
      logger.info('\u26A0\uFE0F  No analysis found, running Layer A...');
      logger.info('   \u23F3 This may take 30-60 seconds...\n');

      await runFullIndexing(projectPath);

      logger.info('\n\u2705 Layer A completed');
      logger.info('   \uD83E\uDD16 LLM enrichment will continue in background');
      return { ran: true, filesAnalyzed: 0 };
    }

    // Tiene analisis, verificar si es valido
    const metadata = await getProjectMetadata(projectPath);
    const fileCount = metadata?.metadata?.totalFiles || 0;

    logger.info(`\u2705 Found existing analysis: ${fileCount} files`);

    // Validar si el analisis base de Layer A esta completo
    const hasValidBaseAnalysis =
      fileCount > 0 &&
      (metadata?.fileIndex || metadata?.files) &&
      metadata?.metadata?.enhanced === true;

    if (!hasValidBaseAnalysis) {
      logger.info('   \uD83D\uDEA8 Analysis incomplete, running Layer A...');
      logger.info('   \u23F3 This may take 30-60 seconds...\n');

      await runFullIndexing(projectPath);

      logger.info('\n\u2705 Layer A completed');
      logger.info('   \uD83E\uDD16 LLM enrichment will continue in background');
      return { ran: true, filesAnalyzed: fileCount };
    }

    logger.info('   \u2705 Layer A analysis valid');

    // Detectar cambios entre proyecto y cache
    logger.info('   \uD83D\uDD0D Checking for file changes...');
    const changes = await detectCacheChanges(projectPath, metadata);
    
    const hasChanges = changes.newFiles.length > 0 || 
                       changes.modifiedFiles.length > 0 || 
                       changes.deletedFiles.length > 0;
    
    if (hasChanges) {
      logger.info(`   \uD83D\uDD04 Changes detected:`);
      if (changes.newFiles.length > 0) {
        logger.info(`      + ${changes.newFiles.length} new files`);
      }
      if (changes.modifiedFiles.length > 0) {
        logger.info(`      ~ ${changes.modifiedFiles.length} modified files`);
      }
      if (changes.deletedFiles.length > 0) {
        logger.info(`      - ${changes.deletedFiles.length} deleted files`);
      }
      logger.info('   \uD83D\uDE80 Re-running Layer A analysis...');
      logger.info('   \u23F3 This may take 30-60 seconds...\n');
      
      await runFullIndexing(projectPath);
      
      logger.info('\n\u2705 Layer A completed (updated)');
      logger.info('   \uD83E\uDD16 LLM enrichment will continue in background');
      return { ran: true, filesAnalyzed: changes.unchangedFiles.length + changes.newFiles.length + changes.modifiedFiles.length };
    }

    // Verificar si hay archivos pendientes de LLM
    const pendingLLM = await countPendingLLMAnalysis(projectPath);
    if (pendingLLM > 0) {
      logger.info(`   \u23F3 ${pendingLLM} files pending LLM enrichment (background)`);
    } else {
      logger.info('   \u2705 All files processed (no changes detected)');
    }

    return { ran: false, filesAnalyzed: fileCount };
  } catch (error) {
    logger.info('   \u274C Analysis check failed:', error.message);
    throw error;
  }
}
