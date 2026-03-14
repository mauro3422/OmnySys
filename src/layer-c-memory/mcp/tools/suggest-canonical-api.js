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

const logger = createLogger('OmnySys:MCP:SuggestCanonicalAPI');

/**
 * Mapeo de patrones de DB a APIs canónicas
 * 
 * NOTA: Ahora el sistema detecta CUALQUIER tabla dinámicamente.
 * Este mapeo es solo para sugerencias específicas de tablas conocidas.
 */
const DB_TO_API_MAPPING = {
  // Patrones de SQL → API canónica (casos específicos)
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
  },
  'SELECT.*FROM societies': {
    api: 'getFileAnalysis',
    from: '#layer-c/query/apis/file-api.js',
    description: 'Obtener análisis de archivo (societies se accede vía file analysis)',
    usage: 'const metadata = await getFileAnalysis(projectPath, filePath); metadata.societiesCount'
  },
  'SELECT.*FROM risk_assessments': {
    api: 'getFileAnalysis',
    from: '#layer-c/query/apis/file-api.js',
    description: 'Obtener análisis de archivo (risk se accede vía file analysis)',
    usage: 'const metadata = await getFileAnalysis(projectPath, filePath); metadata.risk'
  }
};

/**
 * Tablas comunes del sistema OmnySys
 * 
 * TODO #4: Esto es hardcodeado - debería consultar la DB dinámicamente
 * Solución: Usar `PRAGMA table_list` para obtener tablas existentes
 * y buscar en el grafo qué APIs las usan
 */
const KNOWN_TABLES = [
  'atoms',
  'files',
  'atom_relations',
  'societies',
  'risk_assessments',
  'semantic_connections',
  'file_dependencies',
  'system_files',
  'cache_entries',
  'atom_versions',
  'modules',
  'atom_events',
  'system_metadata',
  'mcp_sessions',
  'compiler_scanned_files'
];

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
      // TODO #5: Solo detecta SQLite - agregar patrones para ORMs (mongoose, sequelize, etc.)
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
        // Regex MEJORADO: Detecta SQL en la misma línea
        // Captura: prepare('SELECT...') con cualquier contenido entre comillas
        // TODO #1: Esto NO detecta SQL multilinea - requiere Tree-sitter
        const sqlMatch = line.match(/prepare\(\s*['"`]([^'"`]+)['"`]/i);
        
        if (sqlMatch) {
          const sqlStatement = sqlMatch[1];
          
          // TODO #2: Solo detecta SELECT - agregar INSERT/UPDATE/DELETE
          // Solo procesar SELECT statements
          if (!sqlStatement.trim().toUpperCase().startsWith('SELECT')) {
            continue;
          }
          
          // Intentar mapeo específico primero
          let apiMapping = findAPIMapping(sqlStatement);
          
          // Si no hay mapeo específico, intentar detección genérica por tabla
          if (!apiMapping) {
            apiMapping = findAPIByTableName(sqlStatement);
          }
          
          // TODO #3: No detecta JOINs complejos - solo extrae primera tabla
          // Si todavía no hay mapeo, sugerir búsqueda de API canónica
          if (!apiMapping) {
            const tableMatch = sqlStatement.match(/FROM\s+(\w+)/i);
            const tableName = tableMatch ? tableMatch[1] : 'unknown';
            
            issues.push({
              type: 'direct_db_access',
              line: lineNumber,
              content: line.trim(),
              sqlPattern: sqlStatement,
              suggestion: {
                message: `Direct SQL access to table '${tableName}'. Consider creating or using a canonical API.`,
                api: 'TBD - Create canonical API',
                from: '#layer-c/query/apis/',
                usage: `// Create API in query/apis/ for table: ${tableName}`,
                description: `Table '${tableName}' should have a dedicated canonical API`,
                recommendation: {
                  action: 'create_canonical_api',
                  table: tableName,
                  suggestedLocation: `src/layer-c-memory/query/apis/${tableName.replace(/_/g, '-')}-api.js`,
                  example: `
export async function get${capitalize(tableName)}(projectPath, filters = {}) {
  const repo = getRepository(projectPath);
  // Implement query logic here
}`
                }
              }
            });
          } else {
            // Mapeo encontrado (específico o genérico)
            issues.push({
              type: 'direct_db_access',
              line: lineNumber,
              content: line.trim(),
              sqlPattern: sqlStatement,
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
 * Encuentra API canónica basada en el nombre de la tabla
 * @param {string} sqlStatement - Statement SQL completo
 * @returns {Object|null} Mapeo de API o null
 */
function findAPIByTableName(sqlStatement) {
  // Extraer nombre de tabla del SQL
  const tableMatch = sqlStatement.match(/FROM\s+(\w+)/i);
  if (!tableMatch) return null;
  
  const tableName = tableMatch[1].toLowerCase();
  
  // Buscar en tablas conocidas
  const knownTable = KNOWN_TABLES.find(t => t.toLowerCase() === tableName);
  if (!knownTable) return null;
  
  // Sugerencias basadas en tabla conocida
  const tableToAPI = {
    'atoms': {
      api: 'findAtomByLine',
      from: '#layer-c/query/apis/file-api.js',
      description: `Query atoms table - use file-api.js functions`,
      usage: 'await findAtomByLine(projectPath, filePath, lineNumber)'
    },
    'files': {
      api: 'getFileAnalysis',
      from: '#layer-c/query/apis/file-api.js',
      description: `Query files table - use file-api.js functions`,
      usage: 'await getFileAnalysis(projectPath, filePath)'
    },
    'atom_relations': {
      api: 'getFileDependencies',
      from: '#layer-c/query/apis/file-api.js',
      description: `Query relations - use dependency APIs`,
      usage: 'await getFileDependencies(projectPath, filePath)'
    },
    'societies': {
      api: 'getFileAnalysis',
      from: '#layer-c/query/apis/file-api.js',
      description: `Societies count available via file analysis metadata`,
      usage: 'const meta = await getFileAnalysis(projectPath, filePath); meta.societiesCount'
    },
    'risk_assessments': {
      api: 'getFileAnalysis',
      from: '#layer-c/query/apis/file-api.js',
      description: `Risk data available via file analysis metadata`,
      usage: 'const meta = await getFileAnalysis(projectPath, filePath); meta.risk'
    },
    'semantic_connections': {
      api: 'getFileDependencies',
      from: '#layer-c/query/apis/file-api.js',
      description: `Semantic data via dependency APIs`,
      usage: 'await getFileDependencies(projectPath, filePath)'
    },
    'file_dependencies': {
      api: 'getFileDependencies',
      from: '#layer-c/query/apis/file-api.js',
      description: `Use canonical dependency API`,
      usage: 'await getFileDependencies(projectPath, filePath)'
    },
    'system_files': {
      api: 'getMetadataSurfaceParity',
      from: '#layer-c/query/apis/file-api.js',
      description: `System file metadata via parity API`,
      usage: 'await getMetadataSurfaceParity(projectPath)'
    },
    'compiler_scanned_files': {
      api: 'getPersistedScannedFileManifest',
      from: '#layer-c/query/apis/file-api.js',
      description: `Scanner manifest via canonical API`,
      usage: 'await getPersistedScannedFileManifest(projectPath)'
    }
  };
  
  return tableToAPI[knownTable] || null;
}

/**
 * Capitaliza primera letra de un string
 * @param {string} str - String a capitalizar
 * @returns {string} String capitalizado
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
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
