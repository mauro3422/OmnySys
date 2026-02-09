/**
 * @fileoverview Cross Function Graph Builder - Construye grafo de flujo entre funciones
 * 
 * Crea un grafo donde:
 * - Nodos = Funciones (átomos)
 * - Aristas = Flujo de datos entre funciones
 * 
 * @module molecular-chains/cross-function-graph-builder
 */

export class CrossFunctionGraphBuilder {
  constructor(atoms, chains, mappings) {
    this.atoms = atoms;
    this.chains = chains;
    this.mappings = mappings;
    this.atomById = new Map(atoms.map(a => [a.id, a]));
    this.atomByName = new Map(atoms.map(a => [a.name, a]));
  }

  /**
   * Construye el grafo cross-function
   */
  build() {
    const nodes = this.buildNodes();
    const edges = this.buildEdges();

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
   */
  buildNodes() {
    return this.atoms.map(atom => {
      // Determinar tipo de nodo
      const type = this.determineNodeType(atom);
      
      // Encontrar chains que incluyen este átomo
      const atomChains = this.chains.filter(c => 
        c.steps.some(s => s.atomId === atom.id)
      );

      return {
        id: atom.id,
        function: atom.name,
        type,
        
        // Datos del átomo
        inputs: (atom.dataFlow?.inputs || []).map(i => ({
          name: i.name,
          type: i.type || 'any'
        })),
        
        outputs: (atom.dataFlow?.outputs || []).map(o => ({
          type: o.type,
          ...(o.type === 'return' && { data: o.shape || 'unknown' }),
          ...(o.type === 'side_effect' && { target: o.target })
        })),
        
        // Metadata
        complexity: atom.complexity || 0,
        hasSideEffects: atom.hasSideEffects || false,
        isExported: atom.isExported || false,
        
        // Chains
        chains: atomChains.map(c => c.id),
        
        // Position
        position: this.determinePositionInChains(atom, atomChains)
      };
    });
  }

  /**
   * Construye aristas del grafo
   */
  buildEdges() {
    const edges = [];

    // Para cada mapping, crear una arista
    for (const mapping of this.mappings) {
      const caller = this.atomByName.get(mapping.caller);
      const callee = this.atomByName.get(mapping.callee);

      if (!caller || !callee) continue;

      const edge = {
        id: `edge_${caller.id}_${callee.id}_${mapping.callSite}`,
        from: caller.id,
        to: callee.id,
        fromFunction: mapping.caller,
        toFunction: mapping.callee,
        
        type: this.determineEdgeType(mapping),
        
        // Mapeo de datos
        dataMapping: mapping.mappings.map(m => ({
          source: m.argument.variable || m.argument.code,
          target: m.parameter.name,
          transform: m.transform.type,
          confidence: m.confidence
        })),
        
        // Return usage
        returnFlow: mapping.returnUsage ? {
          isUsed: mapping.returnUsage.isUsed,
          assignedTo: mapping.returnUsage.assignedTo,
          usages: mapping.returnUsage.usages?.length || 0
        } : null,
        
        // Metadata
        callSite: mapping.callSite,
        totalArgs: mapping.totalArgs,
        totalParams: mapping.totalParams,
        
        // Summary
        summary: mapping.summary
      };

      edges.push(edge);
    }

    // Agregar aristas para data flow indirecto (usos de returns)
    const returnEdges = this.buildReturnEdges();
    edges.push(...returnEdges);

    return edges;
  }

  /**
   * Construye aristas para flujo de returns
   */
  buildReturnEdges() {
    const edges = [];

    for (const atom of this.atoms) {
      // Si este átomo retorna algo que se usa en callers
      const returnOutput = atom.dataFlow?.outputs?.find(o => o.type === 'return');
      
      if (!returnOutput) continue;

      // Para cada caller, ver si usa el return
      for (const callerId of atom.calledBy || []) {
        const caller = this.atomById.get(callerId);
        if (!caller) continue;

        // Buscar si el caller usa el return de este átomo
        const usage = this.findReturnUsage(caller, atom, returnOutput);
        
        if (usage) {
          edges.push({
            id: `return_${atom.id}_${caller.id}`,
            from: atom.id,
            to: caller.id,
            fromFunction: atom.name,
            toFunction: caller.name,
            type: 'return_flow',
            dataMapping: [{
              source: returnOutput.shape || 'return',
              target: usage.variable,
              transform: 'return_assignment',
              confidence: 0.9
            }],
            isReturnFlow: true,
            usageContext: usage.context
          });
        }
      }
    }

    return edges;
  }

  /**
   * Encuentra cómo un caller usa el return de un callee
   */
  findReturnUsage(caller, callee, returnOutput) {
    // Buscar en el código del caller dónde se usa esta llamada
    const callerCode = caller.code || '';
    const calleeName = callee.name;
    
    // Patrón: const x = callee(...)
    const assignmentPattern = new RegExp(
      `(const|let|var)\\s+(\\w+)\\s*=\\s*(?:await\\s+)?${calleeName}\\(`,
      'g'
    );
    
    const match = assignmentPattern.exec(callerCode);
    if (match) {
      return {
        variable: match[2],
        context: match[0],
        type: 'assignment'
      };
    }

    // Patrón: return callee(...)
    const returnPattern = new RegExp(
      `return\\s+(?:await\\s+)?${calleeName}\\(`,
      'g'
    );
    
    if (returnPattern.test(callerCode)) {
      return {
        variable: 'return',
        context: `return ${calleeName}(...)`,
        type: 'direct_return'
      };
    }

    return null;
  }

  /**
   * Determina tipo de nodo
   */
  determineNodeType(atom) {
    // Entry: exportada o tiene callers externos
    if (atom.isExported) return 'entry';
    
    const hasExternalCallers = atom.calledBy?.some(callerId => {
      const callerName = callerId.split('::').pop();
      return !this.atomByName.has(callerName);
    });
    
    if (hasExternalCallers) return 'entry';
    
    // Exit: no tiene calls internos
    const hasInternalCalls = atom.calls?.some(c => c.type === 'internal');
    if (!hasInternalCalls) return 'exit';
    
    // Intermediate: tiene callers y callees
    if ((atom.calledBy?.length > 0) && hasInternalCalls) {
      return 'intermediate';
    }
    
    // Isolated: no tiene conexiones
    return 'isolated';
  }

  /**
   * Determina tipo de arista
   */
  determineEdgeType(mapping) {
    // Si es solo paso directo
    const allDirect = mapping.mappings.every(m => m.transform.type === 'DIRECT_PASS');
    if (allDirect) return 'direct_call';
    
    // Si hay transformaciones
    const hasTransforms = mapping.mappings.some(m => 
      m.transform.type !== 'DIRECT_PASS' && 
      m.transform.type !== 'UNKNOWN'
    );
    if (hasTransforms) return 'data_transform';
    
    return 'call';
  }

  /**
   * Determina posición en chains
   */
  determinePositionInChains(atom, chains) {
    const positions = [];
    
    for (const chain of chains) {
      const stepIndex = chain.steps.findIndex(s => s.atomId === atom.id);
      if (stepIndex === -1) continue;
      
      if (stepIndex === 0) positions.push('entry');
      else if (stepIndex === chain.steps.length - 1) positions.push('exit');
      else positions.push('middle');
    }
    
    // Devolver posiciones únicas
    return [...new Set(positions)];
  }

  /**
   * Encuentra caminos entre dos funciones
   */
  findPaths(fromFunction, toFunction) {
    const fromNode = this.atomByName.get(fromFunction);
    const toNode = this.atomByName.get(toFunction);
    
    if (!fromNode || !toNode) return [];

    const paths = [];
    const visited = new Set();
    
    const dfs = (current, path) => {
      if (current === toNode.id) {
        paths.push([...path]);
        return;
      }
      
      if (visited.has(current)) return;
      visited.add(current);
      
      // Encontrar edges salientes
      const outgoing = this.buildEdges().filter(e => e.from === current);
      
      for (const edge of outgoing) {
        path.push(edge);
        dfs(edge.to, path);
        path.pop();
      }
      
      visited.delete(current);
    };
    
    dfs(fromNode.id, []);
    
    return paths;
  }

  /**
   * Calcula métricas del grafo
   */
  calculateMetrics() {
    const nodes = this.buildNodes();
    const edges = this.buildEdges();
    
    // Centralidad (qué nodos son más conectados)
    const centrality = new Map();
    for (const node of nodes) {
      const incoming = edges.filter(e => e.to === node.id).length;
      const outgoing = edges.filter(e => e.from === node.id).length;
      centrality.set(node.id, incoming + outgoing);
    }
    
    // Encontrar bottlenecks (nodos con alta centralidad)
    const sortedByCentrality = [...centrality.entries()]
      .sort((a, b) => b[1] - a[1]);
    
    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      avgConnectivity: edges.length / nodes.length,
      mostCentralNodes: sortedByCentrality.slice(0, 5).map(([id, score]) => {
        const node = nodes.find(n => n.id === id);
        return { function: node?.function, score };
      }),
      isolatedNodes: nodes.filter(n => centrality.get(n.id) === 0).length
    };
  }
}

export default CrossFunctionGraphBuilder;
