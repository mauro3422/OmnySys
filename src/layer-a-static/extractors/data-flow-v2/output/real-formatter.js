/**
 * @fileoverview Real Formatter - Formatea dataFlow para humanos
 * 
 * Output legible y detallado para debugging y análisis manual.
 * 
 * @module data-flow-v2/output/real-formatter
 */

export class RealFormatter {
  constructor(graph, invariants, typeFlow) {
    this.graph = graph;
    this.invariants = invariants;
    this.typeFlow = typeFlow;
  }

  format() {
    return {
      summary: this.formatSummary(),
      inputs: this.formatInputs(),
      transformations: this.formatTransformations(),
      outputs: this.formatOutputs(),
      dataFlow: this.formatDataFlow(),
      invariants: this.formatInvariants(),
      typeFlow: this.formatTypeFlow(),
      
      // Texto plano para logs
      text: this.toText()
    };
  }

  formatSummary() {
    return {
      totalNodes: this.graph.meta.totalNodes,
      totalEdges: this.graph.meta.totalEdges,
      complexity: this.graph.meta.complexity,
      hasSideEffects: this.graph.meta.hasSideEffects,
      hasAsync: this.graph.meta.hasAsync,
      entryPoints: this.graph.meta.entryPoints.length,
      exitPoints: this.graph.meta.exitPoints.length
    };
  }

  formatInputs() {
    const entryNodes = this.graph.nodes.filter(n => 
      n.category === 'input' || 
      (n.inputs?.length === 0 && n.type !== 'constant')
    );

    return entryNodes.map(node => ({
      name: node.output?.name || 'unknown',
      type: this.getNodeType(node),
      position: node.properties?.position,
      usages: this.countUsages(node.id)
    }));
  }

  formatTransformations() {
    return this.graph.nodes
      .filter(n => 
        n.category !== 'input' && 
        n.category !== 'side_effect' &&
        n.type !== 'RETURN'
      )
      .map(node => ({
        step: node.id,
        operation: node.type,
        category: node.category,
        inputs: (node.inputs || []).map(i => this.simplifyInput(i)),
        output: {
          name: node.output?.name,
          type: this.getNodeType(node)
        },
        properties: {
          isPure: node.properties?.isPure,
          isAsync: node.properties?.isAsync,
          ...node.properties
        },
        location: node.location
      }));
  }

  formatOutputs() {
    return this.graph.nodes
      .filter(n => 
        n.category === 'side_effect' ||
        n.type === 'RETURN' ||
        !this.hasOutgoingEdges(n.id)
      )
      .map(node => {
        if (node.category === 'side_effect') {
          return {
            type: 'side_effect',
            category: node.type,
            target: node.properties?.functionName || 'unknown',
            isAsync: node.properties?.isAsync,
            location: node.location
          };
        }

        return {
          type: 'return',
          data: node.output?.name,
          dataType: this.getNodeType(node),
          location: node.location
        };
      });
  }

  formatDataFlow() {
    // Cadena completa de transformaciones
    const chains = [];
    
    for (const entryId of this.graph.meta.entryPoints) {
      const chain = this.traceChain(entryId);
      if (chain.length > 0) {
        chains.push({
          from: entryId,
          path: chain
        });
      }
    }

    return chains;
  }

  formatInvariants() {
    return this.invariants.map(inv => ({
      type: inv.type,
      variable: inv.variable,
      invariant: inv.invariant || inv.inferredType || inv.purity,
      confidence: inv.confidence,
      evidence: inv.evidence?.length,
      location: inv.location
    }));
  }

  formatTypeFlow() {
    if (!this.typeFlow) return null;

    return {
      variables: this.typeFlow.variables,
      coverage: {
        typed: this.typeFlow.summary.typedNodes,
        unknown: this.typeFlow.summary.unknownNodes,
        total: this.typeFlow.summary.totalNodes,
        percentage: Math.round(
          (this.typeFlow.summary.typedNodes / this.typeFlow.summary.totalNodes) * 100
        )
      },
      mismatches: this.typeFlow.summary.typeMismatches.length
    };
  }

  toText() {
    const lines = [];
    
    lines.push('═'.repeat(60));
    lines.push('DATA FLOW ANALYSIS');
    lines.push('═'.repeat(60));
    
    // Summary
    lines.push('');
    lines.push('SUMMARY:');
    lines.push(`  Nodes: ${this.graph.meta.totalNodes}`);
    lines.push(`  Edges: ${this.graph.meta.totalEdges}`);
    lines.push(`  Complexity: ${this.graph.meta.complexity}`);
    lines.push(`  Side Effects: ${this.graph.meta.hasSideEffects ? 'YES' : 'NO'}`);
    lines.push(`  Async: ${this.graph.meta.hasAsync ? 'YES' : 'NO'}`);
    
    // Inputs
    const inputs = this.formatInputs();
    if (inputs.length > 0) {
      lines.push('');
      lines.push('INPUTS:');
      inputs.forEach(i => {
        lines.push(`  → ${i.name} (${i.type})`);
      });
    }
    
    // Transformations
    const transforms = this.formatTransformations();
    if (transforms.length > 0) {
      lines.push('');
      lines.push('TRANSFORMATIONS:');
      transforms.forEach((t, i) => {
        const inputs = t.inputs.join(', ') || 'none';
        lines.push(`  [${i + 1}] ${t.operation}: ${inputs} → ${t.output.name}`);
      });
    }
    
    // Outputs
    const outputs = this.formatOutputs();
    if (outputs.length > 0) {
      lines.push('');
      lines.push('OUTPUTS:');
      outputs.forEach(o => {
        if (o.type === 'side_effect') {
          lines.push(`  ⚡ ${o.category}: ${o.target}`);
        } else {
          lines.push(`  ← return ${o.data} (${o.dataType})`);
        }
      });
    }
    
    // Invariants
    if (this.invariants.length > 0) {
      lines.push('');
      lines.push('INVARIANTS DETECTED:');
      this.invariants.forEach(inv => {
        const symbol = inv.confidence > 0.9 ? '✓' : inv.confidence > 0.7 ? '~' : '?';
        lines.push(`  ${symbol} ${inv.type}: ${inv.variable} = ${inv.invariant || inv.inferredType} (${Math.round(inv.confidence * 100)}%)`);
      });
    }
    
    lines.push('');
    lines.push('═'.repeat(60));
    
    return lines.join('\n');
  }

  // Helpers

  simplifyInput(input) {
    if (!input) return '?';
    if (input.name) return input.name;
    if (input.value !== undefined) return String(input.value);
    return input.type || '?';
  }

  getNodeType(node) {
    // Buscar en typeFlow
    if (this.typeFlow?.variables) {
      const type = this.typeFlow.variables[node.output?.name];
      if (type) return type;
    }
    
    return node.output?.type || 'unknown';
  }

  countUsages(nodeId) {
    return this.graph.edges.filter(e => e.from === nodeId).length;
  }

  hasOutgoingEdges(nodeId) {
    return this.graph.edges.some(e => e.from === nodeId);
  }

  traceChain(startId, visited = new Set()) {
    if (visited.has(startId)) return []; // Evitar ciclos
    visited.add(startId);

    const node = this.graph.nodes.find(n => n.id === startId);
    if (!node) return [];

    const outgoing = this.graph.edges.filter(e => e.from === startId);
    
    if (outgoing.length === 0) {
      return [node.type];
    }

    const paths = outgoing.map(edge => {
      const subChain = this.traceChain(edge.to, new Set(visited));
      return [node.type, ...subChain];
    });

    // Retornar el primer path (simplificación)
    return paths[0] || [node.type];
  }
}

export default RealFormatter;
