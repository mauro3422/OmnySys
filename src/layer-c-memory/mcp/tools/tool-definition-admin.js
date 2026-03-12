export const adminToolDefinitions = [
  {
    name: 'mcp_omnysystem_get_schema',
    description: 'Herramienta unificada para consultar schemas. type: "atoms" (schema de átomos con estadísticas), "database" (estado del schema SQLite con drift detection), "registry" (definición registrada de tablas).',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['atoms', 'database', 'registry'], default: 'atoms', description: 'Tipo de schema a consultar' },
        atomType: { type: 'string', description: 'Filtrar por tipo de átomo (solo type="atoms"): function, arrow, method, variable, testCallback, etc.' },
        sampleSize: { type: 'number', default: 3, description: 'Cantidad de átomos de muestra (solo type="atoms")' },
        focusField: { type: 'string', description: 'Campo para análisis de evolución (solo type="atoms")' },
        includeSQL: { type: 'boolean', default: false, description: 'Incluir SQL exportado (solo type="database")' }
      },
      required: []
    }
  },
  {
    name: 'mcp_omnysystem_get_server_status',
    description: 'Returns the complete status of the OmnySys server',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'mcp_omnysystem_get_recent_errors',
    description: 'Returns recent warnings/errors captured by the logger and clears them.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'mcp_omnysystem_restart_server',
    description: 'Restarts the OmnySys server to load updated code. clearCacheOnly=true for fastest option (no reindex). reindexOnly=true to force Layer A without clearing DB. clearCache+reanalyze=true for full wipe+reindex.',
    inputSchema: {
      type: 'object',
      properties: {
        clearCache: { type: 'boolean', default: false, description: 'Clear in-memory cache before restarting' },
        reanalyze: { type: 'boolean', default: false, description: 'Delete DB + force full reindex (use with clearCache:true)' },
        clearCacheOnly: { type: 'boolean', default: false, description: 'FAST: Only flush in-memory cache + refresh tool registry. No reindex.' },
        reindexOnly: { type: 'boolean', default: false, description: 'Force Layer A re-analysis without clearing the DB or restarting the process.' }
      }
    }
  },
  {
    name: 'mcp_omnysystem_detect_performance_hotspots',
    description: 'Detects performance bottlenecks (O(n^2), blocking I/O, heavy iteration) based on static analysis metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', default: 20, description: 'Maximum findings to return' },
        minRisk: { type: 'number', default: 10, description: 'Minimum risk score (0-100) to report' },
        filePath: { type: 'string', description: 'Optional: Filter by specific file path' }
      }
    }
  },
  {
    name: 'mcp_omnysystem_execute_sql',
    description: 'Ejecuta consultas SQL crudas contra la base de datos de OmnySys. Ideal para debug, extracción de datos a bajo nivel o si las tools existentes no cubren una necesidad. Uso: SELECT * FROM atoms LIMIT 10.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Query SQL a ejecutar (SELECT, PRAGMA, etc)' },
        parameters: { type: 'array', items: { type: 'string' }, description: 'Parámetros opcionales para la query' }
      },
      required: ['query']
    }
  },
  {
    name: 'mcp_omnysystem_get_technical_debt_report',
    description: 'Reporte automático de deuda técnica al conectar. Ejecuta múltiples queries de duplicados (estructurales y conceptuales), pipeline orphans y dead code, y consolida en un reporte unificado con score de deuda (0-100) y acciones prioritarias.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'mcp_omnysystem_check_pipeline_integrity',
    description: 'Verifica la integridad de TODO el pipeline de OmnySys. Ejecuta 8 verificaciones críticas: cobertura de extracción, completitud de metadata, resolución de calledBy, ejecución de guards, persistencia de issues, acceso de MCP tools, datos huérfanos y consistencia de relaciones. Retorna score de salud (0-100), grade (A-F), issues críticos y recomendaciones priorizadas.',
    inputSchema: {
      type: 'object',
      properties: {
        fullCheck: { type: 'boolean', default: true, description: 'Si es false, solo ejecuta verificaciones rápidas' },
        includeSamples: { type: 'boolean', default: true, description: 'Incluir samples de datos en el reporte' },
        verbose: { type: 'boolean', default: false, description: 'Mostrar logs detallados en consola' }
      },
      required: []
    }
  }
];
