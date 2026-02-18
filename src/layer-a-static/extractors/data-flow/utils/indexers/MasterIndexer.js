/**
 * @fileoverview MasterIndexer.js
 *
 * Indexador maestro del grafo de data-flow.
 * Construye y mantiene índices para acceso eficiente a nodos y conexiones.
 * Stub funcional - implementación completa pendiente.
 *
 * @module layer-a-static/extractors/data-flow/utils/indexers/MasterIndexer
 * @phase Layer A (Static Extraction)
 * @status STUB
 */

/**
 * Indexador maestro del grafo de data-flow.
 * Agrega y unifica todos los sub-índices del análisis.
 */
export class MasterIndexer {
  constructor() {
    /** @type {Map<string, Object>} Índice por ID de nodo */
    this.nodeIndex = new Map();
    /** @type {Map<string, Set<string>>} Índice de conexiones por origen */
    this.connectionIndex = new Map();
    /** @type {Map<string, Object>} Índice por archivo fuente */
    this.fileIndex = new Map();
    /** @type {boolean} */
    this._built = false;
  }

  /**
   * Construye el índice a partir de los datos del grafo.
   * @param {Object} graphData - Datos del grafo de data-flow
   * @returns {MasterIndexer} this (chainable)
   */
  build(graphData) {
    if (!graphData) return this;

    const nodes = graphData.nodes || [];
    const connections = graphData.connections || graphData.edges || [];

    // Indexar nodos
    for (const node of nodes) {
      if (node.id) {
        this.nodeIndex.set(node.id, node);
      }
      if (node.file) {
        if (!this.fileIndex.has(node.file)) {
          this.fileIndex.set(node.file, { nodes: [], connections: [] });
        }
        this.fileIndex.get(node.file).nodes.push(node);
      }
    }

    // Indexar conexiones
    for (const conn of connections) {
      const from = conn.from || conn.source;
      const to = conn.to || conn.target;
      if (from) {
        if (!this.connectionIndex.has(from)) {
          this.connectionIndex.set(from, new Set());
        }
        this.connectionIndex.get(from).add(to);
      }
    }

    this._built = true;
    return this;
  }

  /**
   * Busca un nodo por ID.
   * @param {string} id
   * @returns {Object|null}
   */
  getNode(id) {
    return this.nodeIndex.get(id) || null;
  }

  /**
   * Obtiene todos los nodos de un archivo.
   * @param {string} filePath
   * @returns {Array}
   */
  getNodesByFile(filePath) {
    return this.fileIndex.get(filePath)?.nodes || [];
  }

  /**
   * Obtiene conexiones salientes de un nodo.
   * @param {string} nodeId
   * @returns {Set<string>}
   */
  getConnections(nodeId) {
    return this.connectionIndex.get(nodeId) || new Set();
  }

  /**
   * Retorna estadísticas del índice.
   * @returns {Object}
   */
  getStats() {
    return {
      nodes: this.nodeIndex.size,
      files: this.fileIndex.size,
      connections: [...this.connectionIndex.values()].reduce((sum, s) => sum + s.size, 0),
      built: this._built
    };
  }
}

export default MasterIndexer;
