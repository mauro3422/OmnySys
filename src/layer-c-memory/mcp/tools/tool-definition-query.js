export const queryToolDefinitions = [
  {
    name: 'mcp_omnysystem_query_graph',
    description: 'Enrutador unificado para Point Queries. Usa esto para buscar o inspeccionar un símbolo específico. Reemplaza herramientas antiguas (find_symbol_instances, get_function_details). queryType options ACTIVOS: [instances, details, history]. DEPRECATED (retornan error): [value_flow, search, removed]. OPTIONS: includeSemantic=true agrega sharedState, events, async info.',
    inputSchema: {
      type: 'object',
      properties: {
        queryType: { type: 'string', description: 'Tipo de búsqueda: instances, details, history, value_flow, search, removed' },
        symbolName: { type: 'string', description: 'Nombre del símbolo/función a buscar (o patrón regex para search)' },
        filePath: { type: 'string', description: 'Ruta del archivo (obligatoria para details, history, value_flow)' },
        autoDetect: { type: 'boolean', description: 'Para instances: detecta todos los duplicados del proyecto automáticamente' },
        options: { type: 'object', description: 'Opciones extra como maxDepth, includeSimilar, includeCode, includeSemantic, etc.' }
      },
      required: ['queryType']
    }
  },
  {
    name: 'mcp_omnysystem_get_atom_history',
    description: 'Recupera el historial de versiones de un átomo específico (función/clase) consultando los logs de Git. Permite ver quién, cuándo y por qué cambió el código.',
    inputSchema: {
      type: 'object',
      properties: {
        symbolName: { type: 'string', description: 'Nombre del símbolo (función/clase) a consultar' },
        filePath: { type: 'string', description: 'Ruta del archivo (relativa al proyecto)' },
        limit: { type: 'number', default: 10, description: 'Número máximo de versiones a recuperar' }
      },
      required: ['symbolName', 'filePath']
    }
  },
  {
    name: 'mcp_omnysystem_traverse_graph',
    description: 'Enrutador unificado para navegar el grafo de dependencias (BFS/DFS). Reemplaza herramientas antiguas (get_impact_map, get_call_graph). traverseType options ACTIVOS: [impact_map, call_graph]. DEPRECATED (retornan error): [analyze_change, simulate_data_journey, trace_variable, trace_data_flow, explain_connection, signature_change]. OPTIONS: includeSemantic=true agrega sharedState, events, async info a los nodos.',
    inputSchema: {
      type: 'object',
      properties: {
        traverseType: { type: 'string', description: 'Tipo de recorrido a realizar por el grafo' },
        filePath: { type: 'string', description: 'Punto de origen: Ruta del archivo' },
        symbolName: { type: 'string', description: 'Punto de origen: Nombre del símbolo/función/variable' },
        variableName: { type: 'string', description: 'Variable para trace, o fileB para explain_connection' },
        options: { type: 'object', description: 'Opciones extra como maxDepth, newSignature, includeSemantic, etc.' }
      },
      required: ['traverseType', 'filePath']
    }
  },
  {
    name: 'mcp_omnysystem_impact_atomic',
    description: 'Simulador de impacto a nivel atómico. Traza todas las dependencias upstream (qué funciones/clases llaman a este átomo recursivamente) para predecir qué se romperá antes de hacer mutaciones complejas.',
    inputSchema: {
      type: 'object',
      properties: {
        symbolName: { type: 'string', description: 'Nombre del átomo o función a modificar' },
        filePath: { type: 'string', description: 'Opcional: Archivo donde reside el átomo, mejora la precisión si hay duplicados' },
        intent: { type: 'string', enum: ['usage', 'signature_change', 'deletion', 'semantic_state_change'], default: 'usage', description: 'Intención del cambio para generar el reporte' }
      },
      required: ['symbolName']
    }
  },
  {
    name: 'mcp_omnysystem_aggregate_metrics',
    description: 'Enrutador unificado para extraer métricas agrupadas y detectar patrones en lote. Reemplaza herramientas (get_health_metrics, get_module_overview, get_molecule_summary, detect_patterns, detect_race_conditions, risk). aggregationType options ACTIVOS: [health, modules, molecule, patterns, race_conditions, async_analysis, risk, society, duplicates, pipeline_health, watcher_alerts]. OPTIONS: offset, limit para paginación; patternType, minSeverity, scopeType para filtrado.',
    inputSchema: {
      type: 'object',
      properties: {
        aggregationType: { type: 'string', description: 'Tipo de métrica a agregar' },
        filePath: { type: 'string', description: 'Ruta opcional para filtrar métricas en un solo archivo/módulo' },
        options: { type: 'object', description: 'Opciones extra como patternType, minSeverity, scopeType, offset, limit, etc.' }
      },
      required: ['aggregationType']
    }
  }
];
