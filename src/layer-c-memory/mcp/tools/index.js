/**
 * @fileoverview MCP Tools Registry
 *
 * Tools invocables por Claude via protocolo MCP.
 *
 * TOOLS ACTIVAS (FASE 17 UNIFICATION):
 *   Lectura y Consulta (Súper-Herramientas):
 *     mcp_omnysystem_query_graph       (Point Queries: instances, details, history, value_flow, search, removed)
 *     mcp_omnysystem_traverse_graph    (Recorridos: impact, call_graph, analyze_change, simulate_data_journey, trace, explain_connection)
 *     mcp_omnysystem_aggregate_metrics (Agrupaciones: health, modules, molecule, patterns, concurrency, risk, society)
 *
 *   Escritura y Refactoring (Action Tools):
 *     atomic_edit, atomic_write
 *     move_file, fix_imports, execute_solid_split
 *     suggest_refactoring, validate_imports
 *     generate_tests, generate_batch_tests
 *
 *   Administración y Debug:
 *     get_atom_schema
 *     get_server_status, get_recent_errors, restart_server
 *
 * @module mcp/tools
 */

import { PAGINATION_SCHEMA } from '../core/pagination.js';

// Super-Tools (Fase 17)
import { query_graph } from './query-graph.js';
import { traverse_graph } from './traverse-graph.js';
import { aggregate_metrics } from './aggregate-metrics.js';

// Action Tools (Mutation & Refactoring)
import { atomic_edit, atomic_write } from './atomic-edit.js';
import { move_file } from './move-file.js';
import { fix_imports } from './fix-imports.js';
import { execute_solid_split } from './execute-solid-split.js';
import { suggest_refactoring } from './suggest-refactoring.js';
import { validate_imports } from './validate-imports.js';
import { generate_tests, generate_batch_tests } from './generate-tests/index.js';

// Admin & Debug Tools
import { get_atom_schema } from './get-atom-schema.js';
import { get_server_status, get_recent_errors } from './status.js';
import { restart_server } from './restart-server.js';

export const toolDefinitions = [
  // ── SUPER TOOLS (LECTURA) ────────────────────────────────────────────────
  {
    name: 'mcp_omnysystem_query_graph',
    description: 'Enrutador unificado para Point Queries. Usa esto para buscar o inspeccionar un símbolo específico. Reemplaza herramientas antiguas (find_symbol_instances, explain_value_flow, get_function_details, get_atom_history, etc). queryType options: [instances, details, history, value_flow, search, removed].',
    inputSchema: {
      type: 'object',
      properties: {
        queryType: { type: 'string', description: 'Tipo de búsqueda: instances, details, history, value_flow, search, removed' },
        symbolName: { type: 'string', description: 'Nombre del símbolo/función a buscar (o patrón regex para search)' },
        filePath: { type: 'string', description: 'Ruta del archivo (obligatoria para details, history, value_flow)' },
        autoDetect: { type: 'boolean', description: 'Para instances: detecta todos los duplicados del proyecto automáticamente' },
        options: { type: 'object', description: 'Opciones extra como maxDepth, includeSimilar, includeCode, etc.' }
      },
      required: ['queryType']
    }
  },
  {
    name: 'mcp_omnysystem_traverse_graph',
    description: 'Enrutador unificado para navegar el grafo de dependencias (BFS/DFS). Reemplaza herramientas antiguas (get_impact_map, get_call_graph, analyze_change, simulate_data_journey, trace_variable, explain_connection). traverseType options: [impact_map, call_graph, analyze_change, simulate_data_journey, trace_variable, trace_data_flow, explain_connection, signature_change].',
    inputSchema: {
      type: 'object',
      properties: {
        traverseType: { type: 'string', description: 'Tipo de recorrido a realizar por el grafo' },
        filePath: { type: 'string', description: 'Punto de origen: Ruta del archivo' },
        symbolName: { type: 'string', description: 'Punto de origen: Nombre del símbolo/función/variable' },
        variableName: { type: 'string', description: 'Variable para trace, o fileB para explain_connection' },
        options: { type: 'object', description: 'Opciones extra como maxDepth, newSignature, etc.' }
      },
      required: ['traverseType', 'filePath']
    }
  },
  {
    name: 'mcp_omnysystem_aggregate_metrics',
    description: 'Enrutador unificado para extraer métricas agrupadas y detectar patrones en lote. Reemplaza herramientas (get_health_metrics, get_module_overview, get_molecule_summary, detect_patterns, detect_race_conditions, risk). aggregationType options: [health, modules, molecule, patterns, race_conditions, async_analysis, risk, society].',
    inputSchema: {
      type: 'object',
      properties: {
        aggregationType: { type: 'string', description: 'Tipo de métrica a agregar' },
        filePath: { type: 'string', description: 'Ruta opcional para filtrar métricas en un solo archivo/módulo' },
        options: { type: 'object', description: 'Opciones extra como patternType, minSeverity, etc.' }
      },
      required: ['aggregationType']
    }
  },

  // ── ACTION TOOLS (ESCRITURA / EDICIÓN) ───────────────────────────────────
  {
    name: 'mcp_omnysystem_atomic_edit',
    description: 'Edits a file with atomic validation - validates syntax, propagates vibration to dependents, and prevents breaking changes. Use this instead of normal edit for safer code changes.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the file to edit' },
        oldString: { type: 'string', description: 'Text to be replaced' },
        newString: { type: 'string', description: 'New text to insert' },
        autoFix: { type: 'boolean', description: 'Si es true, intenta arreglar automáticamente las firmas de las funciones que dependen de este átomo tras la edición.', default: false }
      },
      required: ['filePath', 'oldString', 'newString']
    }
  },
  {
    name: 'mcp_omnysystem_atomic_write',
    description: 'Writes a new file with atomic validation - validates syntax before writing and immediately indexes the atom.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the new file' },
        content: { type: 'string', description: 'Full content of the file' },
        autoFix: { type: 'boolean', description: 'Si es true, intenta resolver conflictos de exportación automáticamente si el archivo tiene duplicados.', default: false }
      },
      required: ['filePath', 'content']
    }
  },
  {
    name: 'mcp_omnysystem_move_file',
    description: 'Mueve un archivo físicamente y actualiza todas sus referencias (imports) en el resto del proyecto de forma atómica y segura.',
    inputSchema: {
      type: 'object',
      properties: {
        oldPath: { type: 'string', description: 'Ruta actual del archivo (relativa al proyecto)' },
        newPath: { type: 'string', description: 'Nueva ruta del archivo (relativa al proyecto)' }
      },
      required: ['oldPath', 'newPath']
    }
  },
  {
    name: 'mcp_omnysystem_fix_imports',
    description: 'Resuelve automáticamente los imports rotos en un archivo buscando los símbolos en el grafo global del proyecto.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path del archivo a reparar' },
        execute: { type: 'boolean', description: 'Si es true, aplica los cambios atómicamente. Si es false (default), solo devuelve las sugerencias de reparación.', default: false }
      },
      required: ['filePath']
    }
  },
  {
    name: 'mcp_omnysystem_execute_solid_split',
    description: 'Analiza una función compleja y genera una propuesta de división SOLID. Permite previsualizar los cambios antes de aplicarlos.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path del archivo contenedor' },
        symbolName: { type: 'string', description: 'Nombre de la función a dividir' },
        execute: { type: 'boolean', description: 'Si es true, aplica los cambios atómicamente. Si es false (default), solo devuelve la propuesta.', default: false }
      },
      required: ['filePath', 'symbolName']
    }
  },
  {
    name: 'mcp_omnysystem_suggest_refactoring',
    description: 'Analyzes code and suggests specific refactoring improvements: extract functions, rename variables, add error handling, optimize performance, split large files, and improve cohesion',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Optional: filter by specific file path' },
        severity: { type: 'string', enum: ['all', 'high', 'medium', 'low'], default: 'all', description: 'Filter suggestions by severity' },
        limit: { type: 'number', description: 'Maximum suggestions to return', default: 20 },
        ...PAGINATION_SCHEMA
      }
    }
  },
  {
    name: 'mcp_omnysystem_validate_imports',
    description: 'Validates imports in files: detects broken imports, unused imports, circular dependencies, and non-existent modules.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Optional: validate specific file only' },
        checkUnused: { type: 'boolean', default: true },
        checkBroken: { type: 'boolean', default: true },
        checkCircular: { type: 'boolean', default: false },
        checkFileExistence: { type: 'boolean', default: false },
        excludePaths: { type: 'array', items: { type: 'string' } },
        ...PAGINATION_SCHEMA
      }
    }
  },
  {
    name: 'mcp_omnysystem_generate_tests',
    description: 'Analyzes functions/classes and suggests tests. Action "analyze" or "generate".',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        functionName: { type: 'string' },
        action: { type: 'string', enum: ['analyze', 'generate'], default: 'analyze' },
        options: { type: 'object' }
      },
      required: ['filePath']
    }
  },
  {
    name: 'mcp_omnysystem_generate_batch_tests',
    description: 'Generates tests for multiple functions without test coverage in batch.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', default: 10 },
        minComplexity: { type: 'number', default: 5 },
        sortBy: { type: 'string', enum: ['risk', 'complexity', 'fragility', 'name'], default: 'risk' },
        dryRun: { type: 'boolean', default: true }
      }
    }
  },

  // ── ADMIN & DEBUG ────────────────────────────────────────────────────────
  {
    name: 'mcp_omnysystem_get_atom_schema',
    description: 'Inspects the live atom index and returns a dynamic schema of available metadata fields for a given atom type.',
    inputSchema: {
      type: 'object',
      properties: {
        atomType: { type: 'string' },
        sampleSize: { type: 'number', default: 3 }
      }
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
    description: 'Restarts the OmnySys server to load updated code.',
    inputSchema: {
      type: 'object',
      properties: {
        clearCache: { type: 'boolean', default: false },
        reanalyze: { type: 'boolean', default: false }
      }
    }
  }
];

export const toolHandlers = {
  // Super Tools (Lectura)
  mcp_omnysystem_query_graph: query_graph,
  mcp_omnysystem_traverse_graph: traverse_graph,
  mcp_omnysystem_aggregate_metrics: aggregate_metrics,

  // Action Tools (Escritura)
  mcp_omnysystem_atomic_edit: atomic_edit,
  mcp_omnysystem_atomic_write: atomic_write,
  mcp_omnysystem_move_file: move_file,
  mcp_omnysystem_fix_imports: fix_imports,
  mcp_omnysystem_execute_solid_split: execute_solid_split,
  mcp_omnysystem_suggest_refactoring: suggest_refactoring,
  mcp_omnysystem_validate_imports: validate_imports,
  mcp_omnysystem_generate_tests: generate_tests,
  mcp_omnysystem_generate_batch_tests: generate_batch_tests,

  // Admin & Debug
  mcp_omnysystem_get_atom_schema: get_atom_schema,
  mcp_omnysystem_get_server_status: get_server_status,
  mcp_omnysystem_get_recent_errors: get_recent_errors,
  mcp_omnysystem_restart_server: restart_server
};
