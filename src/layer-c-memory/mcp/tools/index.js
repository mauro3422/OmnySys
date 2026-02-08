/**
 * MCP Tools Registry
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
// Atomic/Molecular Tools (v0.6.0)
import { get_function_details } from './get-function-details.js';
import { get_molecule_summary } from './get-molecule-summary.js';
import { get_atomic_functions } from './get-atomic-functions.js';
import { restart_server } from './restart-server.js';

export const toolDefinitions = [
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
  // ========== OMNISCIENCE TOOLS ==========
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
  // ========== ATOMIC/MOLECULAR TOOLS ==========
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
    description: 'Gets molecular summary of a file - all functions with their archetypes and insights',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the file' }
      },
      required: ['filePath']
    }
  },
  {
    name: 'get_atomic_functions',
    description: 'Lists all atomic functions in a file organized by archetype and visibility',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the file' }
      },
      required: ['filePath']
    }
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
  }
];

export const toolHandlers = {
  get_impact_map,
  analyze_change,
  explain_connection,
  get_risk_assessment,
  search_files,
  get_server_status,
  // OMNISCIENCE TOOLS
  get_call_graph,
  analyze_signature_change,
  explain_value_flow,
  // ATOMIC/MOLECULAR TOOLS
  get_function_details,
  get_molecule_summary,
  get_atomic_functions,
  restart_server
};
