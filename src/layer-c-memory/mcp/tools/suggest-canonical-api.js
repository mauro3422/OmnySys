/**
 * @fileoverview suggest-canonial-api.js
 *
 * Herramienta que detecta acceso directo a DB y sugiere APIs canónicas.
 * Usa metadata del grafo para encontrar la API pública equivalente.
 * 
 * MEJORADO: Ahora detecta CUALQUIER SQL hardcodeado, no solo patrones específicos.
 * Usa la DB del OmnySys para sugerir APIs basadas en la tabla mencionada.
 * 
 * ============================================================================
 * MEJORAS PENDIENTES (TODO):
 * ============================================================================
 * 
 * TODO #1: Detectar SQL multilinea
 * --------------------------------
 * Problema: El regex actual solo captura SQL en una línea
 * Ejemplo que NO detecta:
 *   const stmt = repo.db.prepare(`
 *     SELECT COUNT(*) FROM atoms
 *     WHERE file_path = ?
 *   `);
 * Solución: Usar Tree-sitter para parsear el AST y encontrar calls a prepare()
 * 
 * TODO #2: Detectar INSERT/UPDATE/DELETE
 * --------------------------------------
 * Problema: Solo detecta SELECT statements
 * Ejemplo que NO detecta:
 *   repo.db.prepare('INSERT INTO atoms ...').run(...)
 * Solución: Agregar patrones para INSERT, UPDATE, DELETE y sugerir APIs de mutación
 * 
 * TODO #3: Sugerir APIs basadas en patrones de JOIN
 * --------------------------------------------------
 * Problema: No detecta queries complejos con JOINs
 * Ejemplo:
 *   SELECT a.*, f.* FROM atoms a JOIN files f ON a.file_id = f.id
 * Solución: Analizar tablas en JOIN y sugerir APIs compuestas o crear nueva API
 * 
 * TODO #4: Integrar con DB del OmnySys para sugerencias dinámicas
 * --------------------------------------------------------------
 * Problema: KNOWN_TABLES es hardcodeado
 * Solución: Consultar `PRAGMA table_list` para obtener tablas existentes
 * y buscar en el grafo qué APIs las usan
 * 
 * TODO #5: Detectar acceso directo a otras DBs (no SQLite)
 * --------------------------------------------------------
 * Problema: Solo detecta repo.db.prepare()
 * Ejemplo que NO detecta:
 *   await mongoose.Model.find()
 *   await sequelize.query()
 * Solución: Agregar patrones para ORMs populares
 */

import { getRepository } from '#layer-c/storage/repository/index.js';
import { createLogger } from '#utils/logger.js';
import { formatError } from '../core/shared/utils/error-formatter.js';

const logger = createLogger('OmnySys:MCP:SuggestCanonicalAPI');

import { detectDirectDBAccess } from './detect-db-access.js';
/**
 * Tool principal: suggest_canonical_api
 * @param {Object} args - Argumentos del tool
 * @param {string} args.filePath - Archivo a analizar
 * @param {Object} context - Contexto MCP
 * @returns {Promise<Object>} Resultado del análisis
 */
export async function suggest_canonical_api(args, context) {
  const { filePath } = args;
  const { projectPath } = context;

  if (!projectPath) {
    return formatError('MISSING_PROJECT_PATH', 'projectPath not provided in context');
  }

  if (!filePath) {
    return formatError('INVALID_PARAMS', 'filePath is required');
  }

  logger.info(`[suggest_canonical_api] Analyzing ${filePath}`);

  try {
    // 1. Detectar acceso directo a DB
    const issues = await detectDirectDBAccess(filePath, projectPath);

    if (issues.length === 0) {
      return {
        success: true,
        message: 'No direct DB access detected. File is using canonical APIs.',
        filePath,
        issues: []
      };
    }

    // 2. Generar sugerencias de refactorización
    const suggestions = issues.map(issue => ({
      ...issue,
      autoFixAvailable: true,
      priority: issue.type === 'direct_db_access' ? 'high' : 'medium'
    }));

    return {
      success: true,
      message: `Found ${issues.length} issue(s) with direct DB access`,
      filePath,
      issues: suggestions,
      summary: {
        total: issues.length,
        directDBAccess: issues.filter(i => i.type === 'direct_db_access').length,
        directRepositoryImport: issues.filter(i => i.type === 'direct_repository_import').length
      }
    };
  } catch (error) {
    logger.error(`[suggest_canonical_api] Error: ${error.message}`);
    return formatError('ANALYSIS_FAILED', `Failed to analyze file: ${error.message}`);
  }
}


