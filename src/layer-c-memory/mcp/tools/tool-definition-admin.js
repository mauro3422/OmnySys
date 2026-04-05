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
    name: 'mcp_omnysystem_get_metrics_snapshot',
    description: 'Captura y persiste una snapshot canónica de métricas del sistema con tendencia histórica, velocidad de mejora y comparación por scope/focus.',
    inputSchema: {
      type: 'object',
      properties: {
        scopePath: { type: 'string', description: 'Scope contextual para elegir la familia o dominio más cercano' },
        focusPath: { type: 'string', description: 'Focus contextual para afinar la guía y la comparación' },
        snapshotKind: { type: 'string', enum: ['manual', 'status', 'dashboard', 'debt'], default: 'manual', description: 'Tipo de snapshot a capturar' },
        compareDays: { type: 'number', default: 3, description: 'Ventana en días para comparar tendencia' },
        historyLimit: { type: 'number', default: 12, description: 'Cantidad máxima de snapshots devueltos en el history' },
        persist: { type: 'boolean', default: true, description: 'Si es true, guarda la snapshot en SQLite' }
      },
      required: []
    }
  },
  {
    name: 'mcp_omnysystem_get_health_snapshot',
    description: 'Returns a compact health dashboard with health, trend, tool success, regressions and MVP readiness from the canonical compiler metrics snapshot.',
    inputSchema: {
      type: 'object',
      properties: {
        scopePath: { type: 'string', description: 'Scope contextual para elegir la familia o dominio mÃ¡s cercano' },
        focusPath: { type: 'string', description: 'Focus contextual para afinar la guÃ­a y la comparaciÃ³n' },
        snapshotKind: { type: 'string', enum: ['manual', 'status', 'dashboard', 'debt'], default: 'dashboard', description: 'Tipo de snapshot a capturar' },
        compareDays: { type: 'number', default: 3, description: 'Ventana en dÃ­as para comparar tendencia' },
        historyLimit: { type: 'number', default: 12, description: 'Cantidad mÃ¡xima de snapshots devueltos en el history' },
        toolRunTelemetryWindowDays: { type: 'number', default: 7, description: 'Ventana para resumir la telemetrÃ­a de ejecuciÃ³n de tools' },
        persist: { type: 'boolean', default: true, description: 'Si es true, guarda la snapshot en SQLite' }
      },
      required: []
    }
  },
  {
    name: 'mcp_omnysystem_get_health_panel',
    description: 'Returns a one-screen health panel with status now, trend, top regressions, top improvements and next action.',
    inputSchema: {
      type: 'object',
      properties: {
        scopePath: { type: 'string', description: 'Scope contextual para elegir la familia o dominio mÃ¡s cercano' },
        focusPath: { type: 'string', description: 'Focus contextual para afinar la guÃ­a y la comparaciÃ³n' },
        snapshotKind: { type: 'string', enum: ['manual', 'status', 'dashboard', 'debt'], default: 'dashboard', description: 'Tipo de snapshot a capturar' },
        compareDays: { type: 'number', default: 3, description: 'Ventana en dÃ­as para comparar tendencia' },
        historyLimit: { type: 'number', default: 12, description: 'Cantidad mÃ¡xima de snapshots devueltos en el history' },
        toolRunTelemetryWindowDays: { type: 'number', default: 7, description: 'Ventana para resumir la telemetrÃ­a de ejecuciÃ³n de tools' },
        persist: { type: 'boolean', default: true, description: 'Si es true, guarda la snapshot en SQLite' }
      },
      required: []
    }
  },
  {
    name: 'mcp_omnysystem_get_folderization_snapshot',
    description: 'Returns a lightweight DB-backed snapshot for folderization guidance, naming debt and sync drift without running the full compiler health pipeline.',
    inputSchema: {
      type: 'object',
      properties: {
        scopePath: { type: 'string', description: 'Scope contextual para elegir la familia o dominio mas cercano' },
        focusPath: { type: 'string', description: 'Focus contextual para afinar la guia y la comparacion' },
        filePaths: {
          type: 'array',
          items: { type: 'string' },
          default: [],
          description: 'Opcional: paths concretos que deben influir en la guia de folderizacion'
        },
        snapshotKind: {
          type: 'string',
          enum: ['manual', 'dashboard', 'debt', 'folderization'],
          default: 'folderization',
          description: 'Tipo de snapshot a capturar'
        },
        includeDatabaseHealth: {
          type: 'boolean',
          default: true,
          description: 'Incluir la salud de DB y el estado de live-row sync'
        }
      },
      required: []
    }
  },
  {
    name: 'mcp_omnysystem_get_tool_inventory_report',
    description: 'Returns a categorized report of the MCP tool catalog with consolidation recommendations.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['all', 'query', 'action', 'admin'],
          default: 'all',
          description: 'Filter by tool category'
        },
        includeSchemas: {
          type: 'boolean',
          default: false,
          description: 'Include each tool input schema in the report'
        },
        namePattern: {
          type: 'string',
          description: 'Optional substring filter over tool names and descriptions'
        }
      },
      required: []
    }
  },
  {
    name: 'mcp_omnysystem_get_system_inventory_report',
    description: 'Returns the canonical system inventory for emergent APIs, canonical surfaces, bridges and wrappers, plus the compact report used by status/health consumers.',
    inputSchema: {
      type: 'object',
      properties: {
        scopePath: { type: 'string', description: 'Scope contextual para elegir la familia o dominio más cercano' },
        focusPath: { type: 'string', description: 'Focus contextual para afinar la guía y la comparación' },
        snapshotKind: { type: 'string', enum: ['manual', 'status', 'dashboard', 'inventory'], default: 'inventory', description: 'Tipo de snapshot a capturar' },
        compareDays: { type: 'number', default: 3, description: 'Ventana en días para comparar tendencia' },
        historyLimit: { type: 'number', default: 12, description: 'Cantidad máxima de snapshots devueltos en el history' },
        persist: { type: 'boolean', default: true, description: 'Si es true, guarda la snapshot en SQLite' }
      },
      required: []
    }
  },
  {
    name: 'mcp_omnysystem_get_canonical_promotion_report',
    description: 'Returns the canonical promotion plan for folderized families and emergent surfaces, combining system inventory and folderization evidence into a reusable contract.',
    inputSchema: {
      type: 'object',
      properties: {
        scopePath: { type: 'string', description: 'Scope contextual para elegir la familia o dominio mÃ¡s cercano' },
        focusPath: { type: 'string', description: 'Focus contextual para afinar la guÃ­a y la comparaciÃ³n' },
        snapshotKind: { type: 'string', enum: ['manual', 'status', 'dashboard', 'promotion'], default: 'promotion', description: 'Tipo de snapshot a capturar' },
        compareDays: { type: 'number', default: 3, description: 'Ventana en dÃ­as para comparar tendencia' },
        historyLimit: { type: 'number', default: 12, description: 'Cantidad mÃ¡xima de snapshots devueltos en el history' },
        persist: { type: 'boolean', default: true, description: 'Si es true, guarda la snapshot en SQLite' },
        limit: { type: 'number', default: 5, description: 'Cantidad mÃ¡xima de candidatos de promociÃ³n a incluir' }
      },
      required: []
    }
  },
  {
    name: 'mcp_omnysystem_list_tools',
    description: 'Returns the canonical MCP tool inventory grouped by query, action, and admin categories, using the registry as the source of truth.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['all', 'query', 'action', 'admin'],
          default: 'all',
          description: 'Filter by tool category'
        },
        includeSchemas: {
          type: 'boolean',
          default: true,
          description: 'Include each tool input schema in the inventory response'
        },
        namePattern: {
          type: 'string',
          description: 'Optional substring filter over tool names and descriptions'
        }
      },
      required: []
    }
  },
  {
    name: 'mcp_omnysystem_get_recent_errors',
    description: 'Returns recent warnings/errors captured by the logger and clears them.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'mcp_omnysystem_restart_server',
    description: 'Restarts the OmnySys server to load updated code. clearCacheOnly=true for fastest option (no reindex). reindexOnly=true forces Layer A without clearing DB and is the closest thing to a resume/continue path. clearCache+reanalyze=true performs a destructive full wipe + full reindex from scratch and does not resume prior progress.',
    inputSchema: {
      type: 'object',
      properties: {
        clearCache: { type: 'boolean', default: false, description: 'Clear in-memory cache before restarting' },
        reanalyze: { type: 'boolean', default: false, description: 'Delete DB + force full reindex from scratch. Does not resume prior progress. Use with clearCache:true.' },
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
  },
  {
    name: 'mcp_omnysystem_diagnose_tool_health',
    description: 'Analiza la salud de las herramientas MCP ejecutadas. Identifica herramientas con alta tasa de fallo, errores frecuentes y problemas de rendimiento. Retorna un diagnóstico priorizado con recomendaciones de mejora.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', default: 100, description: 'Número máximo de ejecuciones a analizar' },
        toolName: { type: 'string', description: 'Filtrar por nombre de herramienta específica (opcional)' },
        includeDetails: { type: 'boolean', default: true, description: 'Incluir detalles de errores individuales' }
      },
      required: []
    }
  }
];
