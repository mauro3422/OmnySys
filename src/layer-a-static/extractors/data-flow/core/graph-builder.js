/**
 * @fileoverview Graph Builder - Construye el grafo de transformaciones
 *
 * Conecta nodos (transformaciones) en un grafo dirigido que representa
 * el flujo completo de datos dentro de una funcion.
 *
 * @module data-flow-v2/core/graph-builder
 */

import {
  buildGraphMetadata,
  calculateComplexity,
  findDependentTransforms,
  findEntryPoints,
  findExitPoints,
  hasAsync,
  hasSideEffects,
  tracePath
} from './graph-builder-analysis.js';
import { toVisualFormat as formatGraphVisual } from './graph-builder-visualization.js';

export class GraphBuilder {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
    this.incomingEdges = new Map();
    this.outgoingEdges = new Map();
    this.nodeCounter = 0;
    this.scope = new Map();
  }

  addNode(nodeData) {
    const id = nodeData.id || this.generateNodeId(nodeData.type);
    const node = {
      id,
      type: nodeData.type,
      category: nodeData.category,
      inputs: nodeData.inputs || [],
      output: nodeData.output || null,
      properties: nodeData.properties || {},
      location: nodeData.location || null,
      standardToken: nodeData.standardToken,
      ...nodeData.metadata
    };

    this.nodes.set(id, node);

    if (nodeData.output?.name) {
      this.scope.set(nodeData.output.name, id);
    }

    return id;
  }

  addEdge(fromId, toId, metadata = {}) {
    const edge = {
      from: fromId,
      to: toId,
      ...metadata
    };

    this.edges.push(edge);
    this.registerEdgeReference(this.outgoingEdges, fromId, edge);
    this.registerEdgeReference(this.incomingEdges, toId, edge);
  }

  connectNodes() {
    for (const [nodeId, node] of this.nodes) {
      for (const input of node.inputs || []) {
        if (input.sourceType !== 'variable' || !input.name) {
          continue;
        }

        const producerId = this.scope.get(input.name);
        if (!producerId || producerId === nodeId) {
          continue;
        }

        this.addEdge(producerId, nodeId, {
          dataFlow: input.name,
          type: 'dependency'
        });
      }
    }
  }

  generateNodeId(type) {
    this.nodeCounter++;
    return `${type.toLowerCase()}_${String(this.nodeCounter).padStart(3, '0')}`;
  }

  build() {
    this.connectNodes();

    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
      meta: buildGraphMetadata(
        this.nodes,
        this.edges,
        this.getIncomingEdges.bind(this),
        this.getOutgoingEdges.bind(this)
      )
    };
  }

  findEntryPoints() {
    return findEntryPoints(this.nodes, this.getIncomingEdges.bind(this));
  }

  findExitPoints() {
    return findExitPoints(this.nodes, this.getOutgoingEdges.bind(this));
  }

  hasSideEffects() {
    return hasSideEffects(this.nodes);
  }

  hasAsync() {
    return hasAsync(this.nodes);
  }

  calculateComplexity() {
    return calculateComplexity(this.nodes);
  }

  tracePath(nodeId, visited = new Set()) {
    return tracePath(this.nodes, this.getOutgoingEdges.bind(this), nodeId, visited);
  }

  findDependentTransforms(variableName) {
    return findDependentTransforms(
      this.scope,
      this.getOutgoingEdges.bind(this),
      this.nodes,
      variableName
    );
  }

  toVisualFormat() {
    return formatGraphVisual(
      this.nodes,
      this.edges,
      this.findEntryPoints(),
      this.findExitPoints()
    );
  }

  registerEdgeReference(index, nodeId, edge) {
    if (!index.has(nodeId)) {
      index.set(nodeId, []);
    }

    index.get(nodeId).push(edge);
  }

  getIncomingEdges(nodeId) {
    return this.incomingEdges.get(nodeId) || [];
  }

  getOutgoingEdges(nodeId) {
    return this.outgoingEdges.get(nodeId) || [];
  }
}

export default GraphBuilder;
