/**
 * @fileoverview Molecular Chains - Entry Point Fase 2
 * 
 * Orquesta la construcción de chains cross-function:
 * 1. Recibe lista de átomos (de Fase 1)
 * 2. Indexa átomos
 * 3. Mapea argumentos a parámetros
 * 4. Construye chains
 * 5. Genera grafo cross-function
 * 
 * @module molecular-chains/index
 * @version 2.0.0
 * @phase 2
 */

import { ChainBuilder } from './chain-builder.js';
import { ArgumentMapper } from './argument-mapper.js';
import { CrossFunctionGraphBuilder } from './cross-function-graph-builder.js';

/**
 * Construye chains moleculares desde átomos
 * 
 * @param {Array} atoms - Lista de átomos (de Fase 1)
 * @returns {Object} - { chains, graph, mappings, summary }
 */
export function buildMolecularChains(atoms) {
  if (!atoms || atoms.length === 0) {
    return {
      chains: [],
      graph: { nodes: [], edges: [] },
      mappings: [],
      summary: { totalChains: 0, totalFunctions: 0 }
    };
  }

  console.log(`[MolecularChains] Building chains for ${atoms.length} atoms...`);

  // PASO 1: Construir chains
  const builder = new ChainBuilder(atoms);
  const { chains, summary: chainSummary } = builder.build();

  // PASO 2: Mapear argumentos
  const mappings = buildArgumentMappings(atoms);

  // PASO 3: Construir grafo cross-function
  const graphBuilder = new CrossFunctionGraphBuilder(atoms, chains, mappings);
  const graph = graphBuilder.build();

  // PASO 4: Generar resumen
  const summary = generateSummary(atoms, chains, mappings, graph);

  console.log(`[MolecularChains] Built ${chains.length} chains across ${summary.totalFunctions} functions`);

  return {
    chains,
    graph,
    mappings,
    summary
  };
}

/**
 * Construye mapeos de argumentos para todas las llamadas internas
 */
function buildArgumentMappings(atoms) {
  const mappings = [];
  const atomByName = new Map(atoms.map(a => [a.name, a]));

  for (const caller of atoms) {
    for (const call of caller.calls || []) {
      if (call.type === 'internal') {
        const callee = atomByName.get(call.name);
        
        if (callee) {
          const mapper = new ArgumentMapper(caller, callee, call);
          const mapping = mapper.analyzeDataFlow();
          mappings.push(mapping);
        }
      }
    }
  }

  return mappings;
}

/**
 * Genera resumen de chains
 */
function generateSummary(atoms, chains, mappings, graph) {
  const uniqueFunctions = new Set([
    ...atoms.map(a => a.name),
    ...chains.flatMap(c => c.steps.map(s => s.function))
  ]);

  return {
    totalAtoms: atoms.length,
    totalChains: chains.length,
    totalFunctions: uniqueFunctions.size,
    totalMappings: mappings.length,
    graphNodes: graph.nodes.length,
    graphEdges: graph.edges.length,
    
    // Métricas
    avgChainLength: chains.length > 0 
      ? chains.reduce((sum, c) => sum + c.steps.length, 0) / chains.length 
      : 0,
    
    maxComplexity: Math.max(...chains.map(c => c.complexity), 0),
    
    chainsWithSideEffects: chains.filter(c => c.hasSideEffects).length,
    
    entryFunctions: chains
      .filter(c => c.steps.length > 0)
      .map(c => c.entryFunction)
      .filter((v, i, a) => a.indexOf(v) === i),
    
    // Estadísticas de mapeo
    mappingsWithTransform: mappings.filter(m => 
      m.mappings.some(map => map.transform.type !== 'DIRECT_PASS')
    ).length
  };
}

/**
 * Enriquece átomos con información de chains
 * 
 * @param {Array} atoms - Átomos originales
 * @param {Object} chainData - Output de buildMolecularChains
 * @returns {Array} - Átomos enriquecidos
 */
export function enrichAtomsWithChains(atoms, chainData) {
  const { chains, graph, summary } = chainData;
  
  // Indexar chains por función
  const chainsByFunction = new Map();
  for (const chain of chains) {
    for (const step of chain.steps) {
      if (!chainsByFunction.has(step.function)) {
        chainsByFunction.set(step.function, []);
      }
      chainsByFunction.get(step.function).push(chain);
    }
  }

  // Enriquecer cada átomo
  return atoms.map(atom => {
    const atomChains = chainsByFunction.get(atom.name) || [];
    
    // Encontrar nodo en grafo
    const graphNode = graph.nodes.find(n => n.id === atom.id);
    
    // Encontrar edges
    const incomingEdges = graph.edges.filter(e => e.to === atom.id);
    const outgoingEdges = graph.edges.filter(e => e.from === atom.id);

    return {
      ...atom,
      
      // Nuevo: Chains en las que participa
      molecularChains: atomChains.map(c => c.id),
      
      // Nuevo: Grafo cross-function
      crossFunctionGraph: {
        node: graphNode,
        incoming: incomingEdges,
        outgoing: outgoingEdges
      },
      
      // Nuevo: Conectividad
      connectivity: {
        // Quiénes me llaman
        callers: incomingEdges.map(e => ({
          function: e.fromFunction,
          atomId: e.from,
          dataMapping: e.dataMapping
        })),
        
        // A quiénes llamo
        callees: outgoingEdges.map(e => ({
          function: e.toFunction,
          atomId: e.to,
          dataMapping: e.dataMapping
        })),
        
        // Datos que recibo
        upstreamData: incomingEdges.flatMap(e => 
          e.dataMapping?.map(m => m.source) || []
        ),
        
        // Datos que produzco
        downstreamData: outgoingEdges.flatMap(e => 
          e.dataMapping?.map(m => m.target) || []
        )
      },
      
      // Nuevo: Posición en chains
      chainPosition: atomChains.length > 0 
        ? determineChainPosition(atom, atomChains)
        : 'isolated',
      
      // Nuevo: Metadata
      _meta: {
        ...atom._meta,
        molecularChainsVersion: '2.0.0',
        chainCount: atomChains.length,
        connectivityScore: calculateConnectivityScore(atom, incomingEdges, outgoingEdges)
      }
    };
  });
}

/**
 * Determina la posición de un átomo en las chains
 */
function determineChainPosition(atom, chains) {
  let isEntry = false;
  let isExit = false;
  let isIntermediate = false;
  
  for (const chain of chains) {
    if (chain.entryFunction === atom.name) isEntry = true;
    if (chain.exitFunction === atom.name) isExit = true;
    
    const step = chain.steps.find(s => s.function === atom.name);
    if (step && chain.steps.indexOf(step) > 0 && 
        chain.steps.indexOf(step) < chain.steps.length - 1) {
      isIntermediate = true;
    }
  }
  
  if (isEntry && isExit) return 'entry_exit';
  if (isEntry) return 'entry';
  if (isExit) return 'exit';
  if (isIntermediate) return 'intermediate';
  
  return 'standalone';
}

/**
 * Calcula score de conectividad
 */
function calculateConnectivityScore(atom, incoming, outgoing) {
  let score = 0;
  
  // +1 por cada caller
  score += incoming.length;
  
  // +1 por cada callee
  score += outgoing.length;
  
  // +0.5 si es exportada (más conectividad potencial)
  if (atom.isExported) score += 0.5;
  
  // Normalizar a 0-10
  return Math.min(score, 10);
}

// Exportar todo
export { ChainBuilder } from './chain-builder.js';
export { ArgumentMapper } from './argument-mapper.js';
export { CrossFunctionGraphBuilder } from './cross-function-graph-builder.js';

export default {
  buildMolecularChains,
  enrichAtomsWithChains
};
