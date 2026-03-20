/**
 * @fileoverview GraphBuilder - Construye grafo de flujo entre funciones
 * 
 * Crea un grafo donde:
 * - Nodos = Funciones (átomos)
 * - Aristas = Flujo de datos entre funciones
 * 
 * @module graph-builder/GraphBuilder
 */

import { buildNodes, determineNodeType, determinePositionInChains } from './nodes/index.js';
import { buildEdges, determineEdgeType, buildReturnEdges } from './edges/index.js';
import { findPaths } from './paths/index.js';
import { calculateMetrics } from './metrics/index.js';

export class GraphBuilder {
  constructor(atoms, chains, mappings) {
    this.atoms = atoms;
    this.chains = chains;
    this.mappings = mappings;
    this.atomById = new Map(atoms.map(a => [a.id, a]));
    this.atomByName = new Map(atoms.map(a => [a.name, a]));
  }

  /**
   * Construye el grafo cross-function
   * @returns {Object} Grafo con nodes, edges y meta
   */
  build() {
    const nodes = this.assembleNodes();
    const edges = this.assembleEdges();

    return {
      nodes,
      edges,
      meta: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        entryNodes: nodes.filter(n => n.type === 'entry').length,
        exitNodes: nodes.filter(n => n.type === 'exit').length
      }
    };
  }

  /**
   * Construye nodos del grafo
   * @returns {Array} Nodos
   */
  assembleNodes() {
    return buildNodes(this.atoms, this.chains, {
      determineNodeType: (atom) => determineNodeType(atom, this.atoms),
      determinePositionInChains
    });
  }

  /**
   * Construye aristas del grafo
   * @returns {Array} Aristas
   */
  assembleEdges() {
    return buildEdges(this.mappings, this.atomByName, this.atoms, {
      determineEdgeType,
      buildReturnEdges,
      atomById: this.atomById
    });
  }

  /**
   * Encuentra caminos entre dos funciones
   * @param {string} fromFunction - Función origen
   * @param {string} toFunction - Función destino
   * @returns {Array} Caminos encontrados
   */
  findPaths(fromFunction, toFunction) {
    return findPaths(fromFunction, toFunction, this.atomByName, () => this.assembleEdges());
  }

  /**
   * Calcula métricas del grafo
   * @returns {Object} Métricas
   */
  summarizeGraphMetrics() {
    const nodes = this.assembleNodes();
    const edges = this.assembleEdges();
    return calculateMetrics(nodes, edges);
  }
}

export default GraphBuilder;
