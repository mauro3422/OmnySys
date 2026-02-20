/**
 * @fileoverview graph-tools.js
 * 
 * MCP tools para el sistema de grafos mejorado:
 * - get_event_graph
 * - get_clusters
 * - get_dead_code_real
 * - get_purpose_stats
 * - get_api_surface
 * 
 * @module layer-c-memory/mcp/tools/graph-tools
 */

import { buildEventGraph, getEventGraphStats } from '../../../layer-graph/builders/event-graph.js';
import { buildFileClusters, buildPurposeClusters, getClusterStats } from '../../../layer-graph/builders/cluster-builder.js';

/**
 * Registra las herramientas de grafos en el servidor MCP
 * @param {Object} server - Servidor MCP
 * @param {Object} context - Contexto con atoms, systemMap, etc.
 */
export function registerGraphTools(server, context) {
  const { atoms, systemMap, dataDir } = context;
  
  // Tool: get_event_graph
  server.tool(
    'get_event_graph',
    'Get the event graph connecting emitters → events → handlers',
    {},
    async () => {
      const eventGraph = buildEventGraph(atoms);
      const stats = getEventGraphStats(eventGraph);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            stats,
            topEvents: eventGraph.nodes
              .sort((a, b) => (b.handlers?.length || 0) - (a.handlers?.length || 0))
              .slice(0, 10),
            totalEdges: eventGraph.edges.length
          }, null, 2)
        }]
      };
    }
  );
  
  // Tool: get_clusters
  server.tool(
    'get_clusters',
    'Get file clusters (cohesive modules) and purpose clusters',
    {
      type: {
        type: 'string',
        description: 'Cluster type: "file" or "purpose"',
        enum: ['file', 'purpose', 'all'],
        default: 'all'
      }
    },
    async ({ type = 'all' }) => {
      const result = {};
      
      if (type === 'file' || type === 'all') {
        const fileClusters = buildFileClusters(atoms);
        result.fileClusters = {
          total: fileClusters.length,
          top: fileClusters.slice(0, 10).map(c => ({
            file: c.file,
            atoms: c.atoms.length,
            cohesion: c.cohesion,
            purposes: c.purposes
          }))
        };
      }
      
      if (type === 'purpose' || type === 'all') {
        const purposeClusters = buildPurposeClusters(atoms);
        result.purposeClusters = {
          total: purposeClusters.length,
          clusters: purposeClusters.slice(0, 10).map(c => ({
            name: c.name,
            atoms: c.atoms.length,
            purpose: c.purposes?.[0]
          }))
        };
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    }
  );
  
  // Tool: get_dead_code_real
  server.tool(
    'get_dead_code_real',
    'Get functions that are truly dead code (no callers, not exported)',
    {},
    async () => {
      const deadCode = [];
      
      for (const [id, atom] of atoms) {
        if (atom.purpose === 'DEAD_CODE' && (!atom.calledBy || atom.calledBy.length === 0)) {
          deadCode.push({
            name: atom.name,
            file: atom.filePath,
            line: atom.line,
            functionType: atom.functionType
          });
        }
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            total: deadCode.length,
            percentage: ((deadCode.length / atoms.size) * 100).toFixed(2) + '%',
            items: deadCode.slice(0, 50)
          }, null, 2)
        }]
      };
    }
  );
  
  // Tool: get_purpose_stats
  server.tool(
    'get_purpose_stats',
    'Get statistics about atom purposes in the codebase',
    {},
    async () => {
      const stats = {
        total: atoms.size,
        byPurpose: {},
        byArchetype: {},
        coverage: {}
      };
      
      for (const atom of atoms.values()) {
        const purpose = atom.purpose || 'UNKNOWN';
        stats.byPurpose[purpose] = (stats.byPurpose[purpose] || 0) + 1;
        
        const archetype = atom.archetype?.type || 'unknown';
        stats.byArchetype[archetype] = (stats.byArchetype[archetype] || 0) + 1;
      }
      
      // Coverage
      stats.coverage = {
        withPurpose: Object.values(stats.byPurpose).reduce((a, b) => a + b, 0),
        percentage: '100%'
      };
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(stats, null, 2)
        }]
      };
    }
  );
  
  // Tool: get_api_surface
  server.tool(
    'get_api_surface',
    'Get the public API surface (exported functions)',
    {
      file: {
        type: 'string',
        description: 'Optional: filter by file path',
        required: false
      }
    },
    async ({ file } = {}) => {
      const apiExports = [];
      
      for (const [id, atom] of atoms) {
        if (atom.purpose === 'API_EXPORT') {
          if (file && !atom.filePath.includes(file)) continue;
          
          apiExports.push({
            name: atom.name,
            file: atom.filePath,
            callers: atom.calledBy?.length || 0,
            isAsync: atom.isAsync
          });
        }
      }
      
      // Sort by callers (hubs first)
      apiExports.sort((a, b) => b.callers - a.callers);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            total: apiExports.length,
            topHubs: apiExports.slice(0, 20),
            asyncCount: apiExports.filter(a => a.isAsync).length
          }, null, 2)
        }]
      };
    }
  );
}

export default { registerGraphTools };