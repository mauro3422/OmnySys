/**
 * MCP Tools Registry
 */

import { get_impact_map } from './impact-map.js';
import { analyze_change } from './analyze-change.js';
import { explain_connection } from './connection.js';
import { get_risk_assessment } from './risk.js';
import { search_files } from './search.js';
import { get_server_status } from './status.js';

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
  }
];

export const toolHandlers = {
  get_impact_map,
  analyze_change,
  explain_connection,
  get_risk_assessment,
  search_files,
  get_server_status
};
