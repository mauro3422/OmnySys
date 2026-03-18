import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:DetectDBAccess');

/**
 * Mapeo de patrones de DB a APIs canónicas
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
    let issues = [];

    for (let i = 0; i < lines.length; i++) {
      issues = issues.concat(analyzeLineForDBAccess(lines[i], i + 1));
    }

    return issues;
  } catch (error) {
    logger.error(`Failed to analyze ${filePath}: ${error.message}`);
    return [];
  }
}

/**
 * Extraido para reducir complejidad: analiza una sola linea
 */
function analyzeLineForDBAccess(line, lineNumber) {
  const issues = [];
  
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
    const sqlMatch = line.match(/prepare\(\s*['"`]([^'"`]+)['"`]/i);
    if (sqlMatch) {
      const sqlStatement = sqlMatch[1];
      if (sqlStatement.trim().toUpperCase().startsWith('SELECT')) {
        const generatedIssue = generateSQLSuggestion(sqlStatement, lineNumber, line);
        if (generatedIssue) issues.push(generatedIssue);
      }
    }
  }
  
  return issues;
}

/**
 * Genera la sugerencia para el statement SQL
 */
function generateSQLSuggestion(sqlStatement, lineNumber, line) {
  let apiMapping = findAPIMapping(sqlStatement) || findAPIByTableName(sqlStatement);
  
  if (!apiMapping) {
    const tableMatch = sqlStatement.match(/FROM\s+(\w+)/i);
    const tableName = tableMatch ? tableMatch[1] : 'unknown';
    
    return {
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
          example: `\nexport async function get${capitalize(tableName)}(projectPath, filters = {}) {\n  const repo = getRepository(projectPath);\n  // Implement query logic here\n}`
        }
      }
    };
  } else {
    return {
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
    };
  }
}

function findAPIMapping(sqlPattern) {
  for (const [pattern, mapping] of Object.entries(DB_TO_API_MAPPING)) {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(sqlPattern)) {
      return mapping;
    }
  }
  return null;
}

function findAPIByTableName(sqlStatement) {
  const tableMatch = sqlStatement.match(/FROM\s+(\w+)/i);
  if (!tableMatch) return null;
  
  const tableName = tableMatch[1].toLowerCase();
  const knownTable = KNOWN_TABLES.find(t => t.toLowerCase() === tableName);
  if (!knownTable) return null;
  
  const tableToAPI = {
    'atoms': { api: 'findAtomByLine', from: '#layer-c/query/apis/file-api.js', description: `Query atoms table - use file-api.js functions`, usage: 'await findAtomByLine(projectPath, filePath, lineNumber)' },
    'files': { api: 'getFileAnalysis', from: '#layer-c/query/apis/file-api.js', description: `Query files table - use file-api.js functions`, usage: 'await getFileAnalysis(projectPath, filePath)' },
    'atom_relations': { api: 'getFileDependencies', from: '#layer-c/query/apis/file-api.js', description: `Query relations - use dependency APIs`, usage: 'await getFileDependencies(projectPath, filePath)' },
    'societies': { api: 'getFileAnalysis', from: '#layer-c/query/apis/file-api.js', description: `Societies count available via file analysis metadata`, usage: 'const meta = await getFileAnalysis(projectPath, filePath); meta.societiesCount' },
    'risk_assessments': { api: 'getFileAnalysis', from: '#layer-c/query/apis/file-api.js', description: `Risk data available via file analysis metadata`, usage: 'const meta = await getFileAnalysis(projectPath, filePath); meta.risk' },
    'semantic_connections': { api: 'getFileDependencies', from: '#layer-c/query/apis/file-api.js', description: `Semantic data via dependency APIs`, usage: 'await getFileDependencies(projectPath, filePath)' },
    'file_dependencies': { api: 'getFileDependencies', from: '#layer-c/query/apis/file-api.js', description: `Use canonical dependency API`, usage: 'await getFileDependencies(projectPath, filePath)' },
    'system_files': { api: 'getMetadataSurfaceParity', from: '#layer-c/query/apis/file-api.js', description: `System file metadata via parity API`, usage: 'await getMetadataSurfaceParity(projectPath)' },
    'compiler_scanned_files': { api: 'getPersistedScannedFileManifest', from: '#layer-c/query/apis/file-api.js', description: `Scanner manifest via canonical API`, usage: 'await getPersistedScannedFileManifest(projectPath)' }
  };
  
  return tableToAPI[knownTable] || null;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
