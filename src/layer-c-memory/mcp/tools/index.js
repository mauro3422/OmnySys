/**
 * @fileoverview MCP Tools Registry
 *
 * Tools invocables por Claude via protocolo MCP.
 *
 * TOOLS ACTIVAS (30):
 *   Análisis de impacto:  get_impact_map, analyze_change, explain_connection, trace_variable_impact, trace_data_journey
 *   Simulación:           simulate_data_journey
 *   Módulos:              get_module_overview
 *   Concurrencia:         detect_race_conditions
 *   Riesgo:               get_risk_assessment, get_health_metrics
 *   Código:               get_call_graph, analyze_signature_change, explain_value_flow
 *   Funciones:            get_function_details, get_molecule_summary
 *   Sociedad:             get_atom_society, detect_patterns, get_async_analysis
 *   Historia:             get_atom_history, get_removed_atoms
 *   Utilidades:           search_files, get_server_status, restart_server
 *   Editor atómico:       atomic_edit, atomic_write
 *   Refactoring:          suggest_refactoring
 *   Validación:           validate_imports
 *   Búsqueda:             find_symbol_instances
 *   Generación de Tests:  generate_tests, generate_batch_tests
 *   Schema / Debug:       get_atom_schema
 *
 * ELIMINADAS:
 *   get_atomic_functions  → fusionada en get_molecule_summary (duplicado)
 *   get_tunnel_vision_stats → dead code (no linkada en el sistema)
 *
 * @module mcp/tools
 */

import { PAGINATION_SCHEMA } from '../core/pagination.js';
import { get_impact_map } from './impact-map.js';
import { analyze_change } from './analyze-change.js';
import { explain_connection } from './connection.js';
import { get_risk_assessment } from './risk.js';
import { search_files } from './search.js';
import { get_server_status } from './status.js';
import { get_call_graph } from './get-call-graph.js';
import { analyze_signature_change } from './analyze-signature-change.js';
import { explain_value_flow } from './explain-value-flow.js';
import { get_function_details } from './get-function-details.js';
import { get_molecule_summary } from './get-molecule-summary.js';
import { restart_server } from './restart-server.js';
import { atomic_edit, atomic_write } from './atomic-edit.js';
import { get_atom_society } from './get-atom-society.js';
import { detect_patterns } from './detect-patterns.js';
import { get_health_metrics } from './get-health-metrics.js';
import { get_async_analysis } from './get-async-analysis.js';
import { get_atom_history } from './get-atom-history.js';
import { get_removed_atoms } from './get-removed-atoms.js';
import { trace_variable_impact } from './trace-variable-impact.js';
import { suggest_refactoring } from './suggest-refactoring.js';
import { validate_imports } from './validate-imports.js';
import { get_atom_schema } from './get-atom-schema.js';
import { trace_data_journey } from './trace-data-journey.js';
import { get_module_overview } from './get-module-overview.js';
import { detect_race_conditions } from './detect-race-conditions.js';
import { simulate_data_journey } from './simulate-data-journey.js';
import { find_symbol_instances } from './find-symbol-instances.js';
import { 
  generate_tests, 
  generate_batch_tests
} from './generate-tests/index.js';

export const toolDefinitions = [
  // ── IMPACTO ──────────────────────────────────────────────────────────────
  {
    name: 'get_impact_map',
    description: 'Returns a complete impact map for a file',
    inputSchema: {
      type: 'object',
      properties: { filePath: { type: 'string' }, ...PAGINATION_SCHEMA },
      required: ['filePath']
    }
  },
  // ── MÓDULOS & SISTEMA ────────────────────────────────────────────────────
  {
    name: 'get_module_overview',
    description: 'Phase 3: Module & System level analysis. Groups atoms by directory/module, derives hierarchy, entrypoints, dependencies, and health metrics per module.',
    inputSchema: {
      type: 'object',
      properties: {
        modulePath: { type: 'string', description: 'Optional: filter to specific module/directory (e.g. "src/auth")' },
        topN: { type: 'number', description: 'Max modules to return, sorted by complexity (default: 10)', default: 10 }
      }
    }
  },
  // ── CONCURRENCIA ─────────────────────────────────────────────────────────
  {
    name: 'detect_race_conditions',
    description: 'Phase 4: Detects race conditions in async code. Finds WW (write-write), RW (read-write), and IE (init-error) races by analyzing shared resource access patterns across async atoms.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Optional: limit analysis to a specific file' },
        minSeverity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], default: 'low', description: 'Minimum severity to report' },
        limit: { type: 'number', description: 'Max races to return (default: 20)', default: 20 }
      }
    }
  },
  // ── SIMULACIÓN ───────────────────────────────────────────────────────────
  {
    name: 'simulate_data_journey',
    description: 'Phase 5: Full simulation engine. Walks ALL outgoing cross-file edges from an entry function, aggregating side effects, security risks (unvalidated sinks), complexity, and async waterfall detection.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the entry function file' },
        symbolName: { type: 'string', description: 'Name of the entry function to simulate from' },
        maxDepth: { type: 'number', description: 'Maximum hops to walk (default: 6)', default: 6 }
      },
      required: ['filePath', 'symbolName']
    }
  },
  {
    name: 'trace_data_journey',
    description: 'Traces the deterministic journey of a variable/parameter across cross-file call chains, following actual argument→parameter mappings. Use when you want to know exactly where a specific value (e.g. userId, filePath, config) flows across module boundaries.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the file containing the source function' },
        symbolName: { type: 'string', description: 'Name of the function where the variable originates' },
        variableName: { type: 'string', description: 'Name of the variable/parameter to trace (e.g. "filePath", "userId")' },
        maxDepth: { type: 'number', description: 'Maximum hops to trace (default: 5)', default: 5 }
      },
      required: ['filePath', 'symbolName', 'variableName']
    }
  },
  {
    name: 'trace_variable_impact',
    description: 'Traces how a variable propagates through the call graph using weighted influence propagation (like PageRank). Shows which functions are impacted if you change a variable, parameter, or data structure — with impact scores per hop.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the file containing the source function' },
        symbolName: { type: 'string', description: 'Name of the function where the variable originates' },
        variableName: { type: 'string', description: 'Name of the variable/parameter to trace (e.g. "parsedFiles", "allAtoms")' },
        maxDepth: { type: 'number', description: 'Maximum hops to trace (default: 3)', default: 3 }
      },
      required: ['filePath', 'symbolName', 'variableName']
    }
  },
  {
    name: 'analyze_change',
    description: 'Analyzes the impact of changing a specific symbol',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        symbolName: { type: 'string' }
      },
      required: ['filePath', 'symbolName']
    }
  },
  {
    name: 'explain_connection',
    description: 'Explains why two files are connected',
    inputSchema: {
      type: 'object',
      properties: {
        fileA: { type: 'string' },
        fileB: { type: 'string' }
      },
      required: ['fileA', 'fileB']
    }
  },
  // ── RIESGO ───────────────────────────────────────────────────────────────
  {
    name: 'get_risk_assessment',
    description: 'Returns a risk assessment of the entire project',
    inputSchema: {
      type: 'object',
      properties: {
        minSeverity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
        ...PAGINATION_SCHEMA
      }
    }
  },
  // ── ANÁLISIS DE CÓDIGO ───────────────────────────────────────────────────
  {
    name: 'get_call_graph',
    description: 'Shows ALL call sites of a symbol - who calls what, where, and how',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the file containing the symbol' },
        symbolName: { type: 'string', description: 'Name of the function/class/variable' },
        includeContext: { type: 'boolean', description: 'Include code context for each call site', default: true },
        ...PAGINATION_SCHEMA
      },
      required: ['filePath', 'symbolName']
    }
  },
  {
    name: 'analyze_signature_change',
    description: 'Predicts breaking changes if you modify a function signature',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the file containing the function' },
        symbolName: { type: 'string', description: 'Name of the function' },
        newSignature: { type: 'string', description: 'New signature to analyze, e.g., "funcName(param1, param2)"' }
      },
      required: ['filePath', 'symbolName']
    }
  },
  {
    name: 'explain_value_flow',
    description: 'Shows data flow: inputs → symbol → outputs → consumers',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the file' },
        symbolName: { type: 'string', description: 'Name of function/class/variable' },
        maxDepth: { type: 'number', description: 'Maximum dependency depth to trace', default: 2 }
      },
      required: ['filePath', 'symbolName']
    }
  },
  // ── FUNCIONES / ÁTOMOS ───────────────────────────────────────────────────
  {
    name: 'get_function_details',
    description: 'Gets COMPLETE atomic information about a function including performance, async analysis, error flow, data flow, DNA, and recommendations',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the file containing the function' },
        functionName: { type: 'string', description: 'Name of the function' },
        includeTransformations: { type: 'boolean', description: 'Include detailed transformations (can be large)', default: false }
      },
      required: ['filePath', 'functionName']
    }
  },
  {
    name: 'get_molecule_summary',
    description: 'Gets molecular summary of a file - all functions with their archetypes and insights, organized by archetype and visibility',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the file' }
      },
      required: ['filePath']
    }
  },
  // ── SOCIEDAD DE ÁTOMOS ───────────────────────────────────────────────────
  {
    name: 'get_atom_society',
    description: 'Detects atom societies: chains (A→B→C), clusters (mutually connected), hubs (highly connected), and orphans (unused)',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Optional: filter by file path' },
        minCallers: { type: 'number', description: 'Minimum callers to be considered a hub', default: 5 },
        maxChains: { type: 'number', description: 'Maximum chains to return', default: 10 },
        ...PAGINATION_SCHEMA
      }
    }
  },
  {
    name: 'detect_patterns',
    description: 'Detects code patterns: duplicates (via DNA hash), similar code (via pattern hash), god functions, fragile network calls, dead code, complexity hotspots, circular dependencies, test coverage gaps, and architectural debt (files >250 lines with multiple responsibilities)',
    inputSchema: {
      type: 'object',
      properties: {
        patternType: { 
          type: 'string', 
          enum: ['all', 'duplicates', 'complexity', 'archetype', 'god-functions', 'fragile-network', 'circular', 'test-coverage', 'architectural-debt'],
          description: 'Type of pattern to detect. architectural-debt: finds files >250 lines with multiple responsibilities, duplicates, or high complexity',
          default: 'all'
        },
        minOccurrences: { type: 'number', description: 'Minimum occurrences for a pattern', default: 2 },
        ...PAGINATION_SCHEMA
      }
    }
  },
  {
    name: 'get_health_metrics',
    description: 'Calculates code health metrics: entropy, cohesion, health distribution, and recommendations',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Optional: filter by file path' },
        includeDetails: { type: 'boolean', description: 'Include detailed file-level metrics', default: false },
        ...PAGINATION_SCHEMA
      }
    }
  },
  // ── ANÁLISIS ASYNC ───────────────────────────────────────────────────────
  {
    name: 'get_async_analysis',
    description: 'Deep async analysis with actionable recommendations: waterfall detection, parallelization opportunities, Promise.all suggestions',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Optional: filter by file path' },
        riskLevel: { type: 'string', enum: ['all', 'high', 'medium', 'low'], description: 'Filter by risk level', default: 'all' },
        includeRecommendations: { type: 'boolean', description: 'Include actionable recommendations', default: true },
        minSequentialAwaits: { type: 'number', description: 'Minimum sequential awaits to flag as issue', default: 3 },
        ...PAGINATION_SCHEMA
      }
    }
  },
  // ── HISTORIA ─────────────────────────────────────────────────────────────
  {
    name: 'get_atom_history',
    description: 'Gets git history for an atom/function: commits, authors, blame info, and recent changes',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the file containing the function' },
        functionName: { type: 'string', description: 'Name of the function' },
        maxCommits: { type: 'number', description: 'Maximum commits to return', default: 10 },
        includeDiff: { type: 'boolean', description: 'Include diff stats for each commit', default: false },
        ...PAGINATION_SCHEMA
      },
      required: ['filePath', 'functionName']
    }
  },
  // ── UTILIDADES ───────────────────────────────────────────────────────────
  {
    name: 'search_files',
    description: 'Search for files in the project by pattern',
    inputSchema: {
      type: 'object',
      properties: { pattern: { type: 'string' }, ...PAGINATION_SCHEMA },
      required: ['pattern']
    }
  },
  {
    name: 'get_server_status',
    description: 'Returns the complete status of the OmnySys server',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'restart_server',
    description: 'Restarts the OmnySys server to load updated code. Use clearCache+reanalyze to force a full reindex of all project atoms (needed after parser changes like new fields in calls[].args).',
    inputSchema: {
      type: 'object',
      properties: {
        clearCache: { type: 'boolean', description: 'Clear analysis cache before restart', default: false },
        reanalyze: { type: 'boolean', description: 'Force full reindex of all project files — deletes .omnysysdata atoms/molecules/files and rebuilds from scratch. Use when parser changes affect atom structure.', default: false }
      }
    }
  },
  // ── EDITOR ATÓMICO ───────────────────────────────────────────────────────
  {
    name: 'atomic_edit',
    description: 'Edits a file with atomic validation - validates syntax, propagates vibration to dependents, and prevents breaking changes. Use this instead of normal edit for safer code changes.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the file to edit' },
        oldString: { type: 'string', description: 'Text to be replaced' },
        newString: { type: 'string', description: 'New text to insert' }
      },
      required: ['filePath', 'oldString', 'newString']
    }
  },
  {
    name: 'get_removed_atoms',
    description: 'Shows history of atoms (functions) removed from source files. Use to detect code duplication before re-implementing something that already existed, track technical debt, and understand code evolution.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Filter by specific file path (optional)' },
        minComplexity: { type: 'number', description: 'Only show removed atoms with complexity >= N. Default: 0 (all)' },
        minCallers: { type: 'number', description: 'Only show atoms that had at least N callers when removed. Default: 0' },
        limit: { type: 'number', description: 'Max atoms to return. Default: 50' },
        ...PAGINATION_SCHEMA
      },
      required: []
    }
  },
  {
    name: 'atomic_write',
    description: 'Writes a new file with atomic validation - validates syntax before writing and immediately indexes the atom.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the new file' },
        content: { type: 'string', description: 'Full content of the file' }
      },
      required: ['filePath', 'content']
    }
  },
  // ── SUGERENCIAS DE REFACTORING ───────────────────────────────────────────
  {
    name: 'suggest_refactoring',
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
  // ── SCHEMA / DEBUG ───────────────────────────────────────────────────────
  {
    name: 'get_atom_schema',
    description: 'Inspects the live atom index and returns a dynamic schema of available metadata fields for a given atom type. Use this to debug extractors, understand what data exists, and check which MCP tools consume each field. Includes fieldCoverage report: shows orphaned fields (metadata extracted but consumed by 0 tools) vs covered fields. Useful in verbose mode.',
    inputSchema: {
      type: 'object',
      properties: {
        atomType: {
          type: 'string',
          description: 'Filter by atom type. Options: testCallback, function, arrow, expression, method, variable, constant, config — or any archetype/testCallbackType value (describe, it, test, etc.)'
        },
        sampleSize: {
          type: 'number',
          description: 'Number of sample atoms to return (default: 3)',
          default: 3
        },
        focusField: {
          type: 'string',
          description: 'Optional: show detailed evolution breakdown for a specific field (e.g. "complexity", "linesOfCode", "calls")'
        }
      }
    }
  },
  // ── VALIDACIÓN DE IMPORTS ────────────────────────────────────────────────
  {
    name: 'validate_imports',
    description: 'Validates imports in files: detects broken imports, unused imports, circular dependencies, and non-existent modules. Use checkFileExistence=true to verify that imported modules actually exist in the filesystem (catches errors like "#utils/file-reader.js" that don\'t exist).',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Optional: validate specific file only' },
        checkUnused: { type: 'boolean', default: true, description: 'Check for unused imports' },
        checkBroken: { type: 'boolean', default: true, description: 'Check for broken/missing imports' },
        checkCircular: { type: 'boolean', default: false, description: 'Check for circular dependencies' },
        checkFileExistence: { type: 'boolean', default: false, description: 'Verify that imported modules actually exist in the filesystem. This catches errors like importing "#utils/non-existent" which would crash at runtime.' },
        excludePaths: { type: 'array', items: { type: 'string' }, description: 'Array of path patterns to exclude from validation (e.g., ["archive/", "node_modules/"])' },
        ...PAGINATION_SCHEMA
      }
    }
  },
  // ── BÚSQUEDA DE SÍMBOLOS ─────────────────────────────────────────────────
  {
    name: 'find_symbol_instances',
    description: 'Finds all instances of a symbol (function/variable) in the project, detects duplicates, determines which one is actually used, and warns about conflicts. Prevents editing the wrong file by showing primary vs alternate implementations. Use autoDetect=true to scan all duplicates without specifying a symbol name.',
    inputSchema: {
      type: 'object',
      properties: {
        symbolName: { 
          type: 'string', 
          description: 'Name of the function or variable to find (e.g., "detectAtomPurpose"). Not required if autoDetect=true.' 
        },
        autoDetect: { 
          type: 'boolean', 
          default: false, 
          description: 'Auto-detect all duplicate functions in the project. When true, symbolName is optional and the tool scans all atoms for duplicates automatically.' 
        },
        includeSimilar: { 
          type: 'boolean', 
          default: false, 
          description: 'Also include functions with similar names' 
        }
      }
    }
  },
  // ── GENERACIÓN DE TESTS ──────────────────────────────────────────────────
  {
    name: 'generate_tests',
    description: 'Analyzes functions/classes and suggests tests. Mode analysis by default - returns metrics, detected patterns, and suggestions without generating code. Use action: "generate" to see generated test code. Supports both functions and classes (with special builder pattern detection).',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { 
          type: 'string', 
          description: 'Path to the file to analyze (e.g., "src/utils/math.js" or "tests/factories/builders.js")' 
        },
        functionName: { 
          type: 'string', 
          description: 'Name of the function to analyze (optional - if not provided, analyzes entire file)' 
        },
        className: {
          type: 'string',
          description: 'Name of the class to analyze (optional - alternative to functionName for classes)'
        },
        action: {
          type: 'string',
          enum: ['analyze', 'generate'],
          default: 'analyze',
          description: 'Mode: "analyze" returns metrics and suggestions, "generate" returns actual test code'
        },
        options: {
          type: 'object',
          properties: {
            useRealFactories: {
              type: 'boolean',
              default: true,
              description: 'Use real filesystem factories instead of mocks (for generate mode)'
            },
            includeEdgeCases: {
              type: 'boolean',
              default: true,
              description: 'Include edge case tests based on complexity analysis (for generate mode)'
            },
            includeChainingTests: {
              type: 'boolean',
              default: true,
              description: 'For classes: include tests that verify methods return this for chaining'
            },
            includeImmutabilityTests: {
              type: 'boolean',
              default: true,
              description: 'For classes: include tests that verify builder immutability'
            }
          }
        }
      },
      required: ['filePath']
    }
  },
  {
    name: 'generate_batch_tests',
    description: 'Generates tests for multiple functions without test coverage in batch. Uses detect_patterns to find coverage gaps and generates tests for the highest priority functions. Returns test code for each function.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          default: 10,
          description: 'Maximum number of functions to process (default: 10)'
        },
        minComplexity: {
          type: 'number',
          default: 5,
          description: 'Minimum complexity to include (default: 5)'
        },
        sortBy: {
          type: 'string',
          enum: ['risk', 'complexity', 'fragility', 'name'],
          default: 'risk',
          description: 'Sort order for prioritization. fragility = prioriza funciones con mayor fragilityScore (más propensas a romperse)'
        },
        dryRun: {
          type: 'boolean',
          default: true,
          description: 'If true, returns test code without writing files'
        },
        outputPath: {
          type: 'string',
          default: 'tests/generated',
          description: 'Output directory for generated tests'
        }
      }
    }
  }
];

export const toolHandlers = {
  // Impacto
  get_impact_map,
  analyze_change,
  explain_connection,
  trace_variable_impact,
  trace_data_journey,
  // Riesgo
  get_risk_assessment,
  get_health_metrics,
  // Análisis de código
  get_call_graph,
  analyze_signature_change,
  explain_value_flow,
  // Funciones / átomos
  get_function_details,
  get_molecule_summary,
  // Sociedad de átomos
  get_atom_society,
  detect_patterns,
  get_async_analysis,
  // Historia
  get_atom_history,
  get_removed_atoms,
  // Utilidades
  search_files,
  get_server_status,
  restart_server,
  // Editor atómico
  atomic_edit,
  atomic_write,
  // Refactoring
  suggest_refactoring,
  // Validación
  validate_imports,
  // Búsqueda de símbolos
  find_symbol_instances,
  // Generación de tests
  generate_tests,
  generate_batch_tests,
  // Schema / Debug
  get_atom_schema,
  // Módulos & Sistema
  get_module_overview,
  // Concurrencia
  detect_race_conditions,
  // Simulación
  simulate_data_journey
};
