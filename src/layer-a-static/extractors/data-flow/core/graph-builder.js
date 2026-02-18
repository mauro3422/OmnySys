/**
 * @fileoverview Graph Builder - Construye el grafo de transformaciones
 * 
 * Conecta nodos (transformaciones) en un grafo dirigido que representa
 * el flujo completo de datos dentro de una función.
 * 
 * @module data-flow-v2/core/graph-builder
 */

export class GraphBuilder {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
    this.nodeCounter = 0;
    this.scope = new Map(); // variable name -> node id
  }

  /**
   * Agrega un nodo al grafo
   */
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

    // Si tiene output (variable resultante), registrar en scope
    if (nodeData.output?.name) {
      this.scope.set(nodeData.output.name, id);
    }

    return id;
  }

  /**
   * Agrega una arista entre nodos
   */
  addEdge(fromId, toId, metadata = {}) {
    this.edges.push({
      from: fromId,
      to: toId,
      ...metadata
    });
  }

  /**
   * Conecta automáticamente nodos basado en dependencias de variables
   */
  connectNodes() {
    for (const [nodeId, node] of this.nodes) {
      // Para cada input del nodo, buscar qué nodo lo produce
      for (const input of (node.inputs || [])) {
        if (input.sourceType === 'variable' && input.name) {
          const producerId = this.scope.get(input.name);
          
          if (producerId && producerId !== nodeId) {
            this.addEdge(producerId, nodeId, {
              dataFlow: input.name,
              type: 'dependency'
            });
          }
        }
      }
    }
  }

  /**
   * Genera ID único para nodo
   */
  generateNodeId(type) {
    this.nodeCounter++;
    return `${type.toLowerCase()}_${String(this.nodeCounter).padStart(3, '0')}`;
  }

  /**
   * Obtiene el grafo completo
   */
  build() {
    // Asegurar que todas las conexiones estén establecidas
    this.connectNodes();

    // Calcular metadata
    const entryPoints = this.findEntryPoints();
    const exitPoints = this.findExitPoints();

    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
      meta: {
        totalNodes: this.nodes.size,
        totalEdges: this.edges.length,
        entryPoints: entryPoints.map(n => n.id),
        exitPoints: exitPoints.map(n => n.id),
        hasSideEffects: this.hasSideEffects(),
        hasAsync: this.hasAsync(),
        complexity: this.calculateComplexity()
      }
    };
  }

  /**
   * Encuentra nodos de entrada (inputs de función)
   */
  findEntryPoints() {
    return Array.from(this.nodes.values()).filter(node => 
      node.type === 'INPUT' || 
      this.edges.filter(e => e.to === node.id).length === 0
    );
  }

  /**
   * Encuentra nodos de salida (returns, side effects)
   */
  findExitPoints() {
    return Array.from(this.nodes.values()).filter(node => 
      node.type === 'RETURN' || 
      node.type === 'SIDE_EFFECT' ||
      this.edges.filter(e => e.from === node.id).length === 0
    );
  }

  /**
   * Verifica si el grafo tiene side effects
   */
  hasSideEffects() {
    return Array.from(this.nodes.values()).some(node => 
      node.category === 'side_effect' || node.properties?.hasSideEffects
    );
  }

  /**
   * Verifica si tiene operaciones async
   */
  hasAsync() {
    return Array.from(this.nodes.values()).some(node => 
      node.properties?.isAsync || node.properties?.await
    );
  }

  /**
   * Calcula complejidad del grafo
   */
  calculateComplexity() {
    let complexity = 0;

    // +1 por cada nodo de transformación
    complexity += Array.from(this.nodes.values()).filter(n => 
      n.category !== 'input' && n.category !== 'constant'
    ).length;

    // +2 por cada side effect
    complexity += this.hasSideEffects() ? 2 : 0;

    // +1 por cada condicional (if/ternary)
    complexity += Array.from(this.nodes.values()).filter(n => 
      n.type === 'CONDITIONAL'
    ).length;

    return complexity;
  }

  /**
   * Traza el camino desde un nodo hasta los outputs
   */
  tracePath(nodeId, visited = new Set()) {
    if (visited.has(nodeId)) return []; // Evitar ciclos
    visited.add(nodeId);

    const node = this.nodes.get(nodeId);
    if (!node) return [];

    // Encontrar edges salientes
    const outgoingEdges = this.edges.filter(e => e.from === nodeId);

    if (outgoingEdges.length === 0) {
      return [{ node, isExit: true }];
    }

    const paths = [];
    for (const edge of outgoingEdges) {
      const subPaths = this.tracePath(edge.to, new Set(visited));
      paths.push({
        node,
        edge,
        next: subPaths
      });
    }

    return paths;
  }

  /**
   * Encuentra todas las transformaciones que dependen de una variable
   */
  findDependentTransforms(variableName) {
    const startNodeId = this.scope.get(variableName);
    if (!startNodeId) return [];

    const dependentNodes = new Set();
    const queue = [startNodeId];
    const visited = new Set();

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      // Encontrar todos los nodos que usan este nodo
      const dependentEdges = this.edges.filter(e => e.from === currentId);
      
      for (const edge of dependentEdges) {
        dependentNodes.add(edge.to);
        queue.push(edge.to);
      }
    }

    return Array.from(dependentNodes).map(id => this.nodes.get(id));
  }

  /**
   * Genera representación visual del grafo (para debugging)
   */
  toVisualFormat() {
    const lines = [];
    lines.push('Data Flow Graph:');
    lines.push('================');

    // Entry points
    const entries = this.findEntryPoints();
    lines.push(`\nEntry Points: ${entries.map(n => n.id).join(', ')}`);

    // Nodos
    lines.push('\nNodes:');
    for (const [id, node] of this.nodes) {
      const inputs = (node.inputs || []).map(i => i.name || i.value || '?').join(', ');
      const output = node.output?.name || 'void';
      lines.push(`  ${id}: ${inputs} → [${node.type}] → ${output}`);
    }

    // Edges
    lines.push('\nEdges:');
    for (const edge of this.edges) {
      lines.push(`  ${edge.from} → ${edge.to}`);
    }

    // Exit points
    const exits = this.findExitPoints();
    lines.push(`\nExit Points: ${exits.map(n => n.id).join(', ')}`);

    return lines.join('\n');
  }
}

export default GraphBuilder;
