export const queryToolDefinitions = [
  {
    name: 'mcp_omnysystem_query_graph',
    description: 'Inspect a specific atom/symbol. queryType: "instances" (find all occurrences), "details" (full metadata + DNA + dataFlow), "history" (Git commit history). Set includeSemantic=true in options for sharedState/events.',
    inputSchema: {
      type: 'object',
      properties: {
        queryType: { type: 'string', description: 'Query type: instances, details, history' },
        symbolName: { type: 'string', description: 'Symbol/function name to search (or regex pattern for search)' },
        filePath: { type: 'string', description: 'File path (required for details, history)' },
        autoDetect: { type: 'boolean', description: 'For instances: detect all project duplicates automatically' },
        options: { type: 'object', description: 'Extra options like maxDepth, includeSimilar, includeCode, includeSemantic' }
      },
      required: ['queryType']
    }
  },
  {
    name: 'mcp_omnysystem_get_atom_history',
    description: 'Returns version history for a specific atom (function/class) by consulting Git logs. Shows who changed what and when.',
    inputSchema: {
      type: 'object',
      properties: {
        symbolName: { type: 'string', description: 'Symbol name (function/class)' },
        filePath: { type: 'string', description: 'Project-relative file path' },
        limit: { type: 'number', default: 10, description: 'Maximum number of versions to return' }
      },
      required: ['symbolName', 'filePath']
    }
  },
  {
    name: 'mcp_omnysystem_get_atom_evolution_report',
    description: 'Canonical evolution report for an atom/file. Combines details, DNA, data flow, impact, Git history + persisted archive history, and schema context to reveal changes, ramifications, and drift.',
    inputSchema: {
      type: 'object',
      properties: {
        symbolName: { type: 'string', description: 'Atom/symbol name to inspect' },
        filePath: { type: 'string', description: 'Atom file path' },
        limit: { type: 'number', default: 10, description: 'Maximum historical versions to fetch' },
        includeImpact: { type: 'boolean', default: true, description: 'Include direct/transitive impact for the file' },
        includeHistory: { type: 'boolean', default: true, description: 'Include Git + archive history for the atom' },
        includeSystemContext: { type: 'boolean', default: true, description: 'Include schema and system health context' }
      },
      required: ['symbolName', 'filePath']
    }
  },
  {
    name: 'mcp_omnysystem_traverse_graph',
    description: 'Navigate the dependency graph. traverseType: "impact_map" (what breaks if I change this?), "call_graph" (who calls whom?). Set includeSemantic=true in options for sharedState/events.',
    inputSchema: {
      type: 'object',
      properties: {
        traverseType: { type: 'string', description: 'Traversal type: impact_map, call_graph' },
        filePath: { type: 'string', description: 'Origin file path' },
        symbolName: { type: 'string', description: 'Origin symbol/function/variable name' },
        variableName: { type: 'string', description: 'Variable to trace' },
        options: { type: 'object', description: 'Extra options like maxDepth, includeSemantic' }
      },
      required: ['traverseType', 'filePath']
    }
  },
  {
    name: 'mcp_omnysystem_impact_atomic',
    description: 'Atomic impact simulator. Traces upstream dependencies to predict what will break before complex mutations.',
    inputSchema: {
      type: 'object',
      properties: {
        symbolName: { type: 'string', description: 'Atom/function to modify' },
        filePath: { type: 'string', description: 'Optional file path for better precision when duplicates exist' },
        intent: { type: 'string', enum: ['usage', 'signature_change', 'deletion', 'semantic_state_change'], default: 'usage', description: 'Change intent for the impact report' }
      },
      required: ['symbolName']
    }
  },
  {
    name: 'mcp_omnysystem_aggregate_metrics',
    description: 'Unified router for grouped metrics and batch pattern detection. Replaces older metrics and risk tools.',
    inputSchema: {
      type: 'object',
      properties: {
        aggregationType: { type: 'string', description: 'Metric aggregation type' },
        filePath: { type: 'string', description: 'Optional file/module filter' },
        options: { type: 'object', description: 'Extra options like patternType, minSeverity, scopeType, offset, limit, etc.' }
      },
      required: ['aggregationType']
    }
  }
];
