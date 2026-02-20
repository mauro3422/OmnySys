/**
 * @fileoverview MCP Tools Registry
 *
 * Tools invocables por Claude via protocolo MCP.
 *
 * TOOLS ACTIVAS (14):
 *   Análisis de impacto:  get_impact_map, analyze_change, explain_connection
 *   Riesgo:               get_risk_assessment
 *   Código:               get_call_graph, analyze_signature_change, explain_value_flow
 *   Funciones:            get_function_details, get_molecule_summary
 *   Utilidades:           search_files, get_server_status, restart_server
 *   Editor atómico:       atomic_edit, atomic_write
 *
 * ELIMINADAS:
 *   get_atomic_functions  → fusionada en get_molecule_summary (duplicado)
 *   get_tunnel_vision_stats → dead code (no linkada en el sistema)
 *
 * @module mcp/tools
 */

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

export const toolDefinitions = [
  // ── IMPACTO ──────────────────────────────────────────────────────────────
  {
    name: 'get_impact_map',
    description: 'Returns a complete impact map for a file',
    inputSchema: {
      type: 'object',
      properties: { filePath: { type: 'string' } },
      required: ['filePath']
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
        minSeverity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], default: 'medium' }
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
        includeContext: { type: 'boolean', description: 'Include code context for each call site', default: true }
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
    description: 'Gets detailed atomic information about a specific function including archetype, complexity, and call graph',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the file containing the function' },
        functionName: { type: 'string', description: 'Name of the function' }
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
  // ── UTILIDADES ───────────────────────────────────────────────────────────
  {
    name: 'search_files',
    description: 'Search for files in the project by pattern',
    inputSchema: {
      type: 'object',
      properties: { pattern: { type: 'string' } },
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
    description: 'Restarts the OmnySys server to load updated code. Use this after making changes to the codebase.',
    inputSchema: {
      type: 'object',
      properties: {
        clearCache: { type: 'boolean', description: 'Clear analysis cache before restart', default: false }
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
  }
];

export const toolHandlers = {
  // Impacto
  get_impact_map,
  analyze_change,
  explain_connection,
  // Riesgo
  get_risk_assessment,
  // Análisis de código
  get_call_graph,
  analyze_signature_change,
  explain_value_flow,
  // Funciones / átomos
  get_function_details,
  get_molecule_summary,
  // Utilidades
  search_files,
  get_server_status,
  restart_server,
  // Editor atómico
  atomic_edit,
  atomic_write
};
