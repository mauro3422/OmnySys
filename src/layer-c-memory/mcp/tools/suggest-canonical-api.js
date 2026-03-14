/**
 * @fileoverview suggest-canonial-api.js
 *
 * Herramienta que detecta acceso directo a DB y sugiere APIs canónicas.
 * Usa metadata del grafo para encontrar la API pública equivalente.
 */

import { getRepository } from '#layer-c/storage/repository/index.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:MCP:SuggestCanonicalAPI');

/**
 * Mapeo de patrones de DB a APIs canónicas
 */
const DB_TO_API_MAPPING = {
  // Patrones de SQL → API canónica
  'SELECT.*FROM atoms': {
    api: 'findAtomByLine',
    from: '#layer-c/query/apis/file-api.js',
    description: 'Buscar átomos por línea en archivo',
    usage: 'await findAtomByLine(projectPath, filePath, lineNumber)'
  },
  'SELECT.*FROM files': {
    api: 'getFileAnalysis',
    from: '#layer-c/query/apis/file-api.js',
    description: 'Obtener análisis de archivo',
    usage: 'await getFileAnalysis(projectPath, filePath)'
  },
  'SELECT.*FROM atom_relations': {
    api: 'getFileDependencies',
    from: '#layer-c/query/apis/file-api.js',
    description: 'Obtener dependencias de archivo',
    usage: 'await getFileDependencies(projectPath, filePath)'
  }
};

/**
 * Detecta acceso directo a DB en un archivo
 * @param {string} filePath - Ruta del archivo a analizar
 * @param {string} projectPath - Ruta del proyecto
 * @returns {Promise<Array>} Lista de issues detectadas
 */
export async function detectDirectDBAccess(filePath, projectPath) {
  const fs = await import('fs/promises');
  const fullPath = projectPath + '/' + filePath;
  
  try {
    const content = await fs.readFile(fullPath, 'utf8');
    const lines = content.split('\n');
    const issues = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Detectar imports de repository
      if (line.includes("from '#layer-c/storage/repository'") || 
          line.includes("from '#layer-c/storage/index'")) {
        issues.push({
          type: 'direct_repository_import',
          line: lineNumber,
          content: line.trim(),
          suggestion: {
            message: 'Use query/apis instead of storage/repository',
            recommendedImport: "import { findAtomByLine } from '#layer-c/query/apis/file-api.js';"
          }
        });
      }

      // Detectar acceso directo a DB
      if (line.includes('repo.db.prepare') || line.includes('db.prepare')) {
        // Buscar el patrón SQL en las líneas siguientes
        const sqlMatch = line.match(/prepare\(['"`](.*?)['"`]/);
        if (sqlMatch) {
          const sqlPattern = sqlMatch[1];
          const apiMapping = findAPIMapping(sqlPattern);
          
          if (apiMapping) {
            issues.push({
              type: 'direct_db_access',
              line: lineNumber,
              content: line.trim(),
              sqlPattern: sqlPattern,
              suggestion: {
                message: `Use ${apiMapping.api} instead of direct SQL`,
                api: apiMapping.api,
                from: apiMapping.from,
                usage: apiMapping.usage,
                description: apiMapping.description
              }
            });
          }
        }
      }
    }

    return issues;
  } catch (error) {
    logger.error(`Failed to analyze ${filePath}: ${error.message}`);
    return [];
  }
}

/**
 * Encuentra el mapeo de API para un patrón SQL
 * @param {string} sqlPattern - Patrón SQL
 * @returns {Object|null} Mapeo de API o null
 */
function findAPIMapping(sqlPattern) {
  for (const [pattern, mapping] of Object.entries(DB_TO_API_MAPPING)) {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(sqlPattern)) {
      return mapping;
    }
  }
  return null;
}

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

/**
 * Formatea error estándar
 */
function formatError(code, message, details = {}) {
  return {
    success: false,
    error: { code, message },
    ...details,
    severity: details.severity || 'high'
  };
}
