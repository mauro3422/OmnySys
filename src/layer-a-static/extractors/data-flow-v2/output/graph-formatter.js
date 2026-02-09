/**
 * @fileoverview Graph Formatter - Exporta el grafo en múltiples formatos
 * 
 * Formatos soportados:
 * - json: Grafo completo serializable
 * - dot: Para Graphviz/vis.js
 * - mermaid: Para markdown
 * - cytoscape: Para visualización web
 * 
 * @module data-flow-v2/output/graph-formatter
 */

export class GraphFormatter {
  constructor(graph) {
    this.graph = graph;
  }

  format(format = 'json') {
    switch (format) {
      case 'json':
        return this.toJSON();
      case 'dot':
        return this.toDOT();
      case 'mermaid':
        return this.toMermaid();
      case 'cytoscape':
        return this.toCytoscape();
      default:
        return this.toJSON();
    }
  }

  /**
   * Formato JSON completo
   */
  toJSON() {
    return {
      nodes: this.graph.nodes,
      edges: this.graph.edges,
      meta: this.graph.meta,
      exportInfo: {
        version: '2.0.0',
        exportedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Formato DOT para Graphviz
   */
  toDOT() {
    const lines = [];
    lines.push('digraph DataFlow {');
    lines.push('  rankdir=TB;');
    lines.push('  node [shape=box, style=rounded];');
    lines.push('');

    // Nodos
    for (const node of this.graph.nodes) {
      const label = this.getDOTLabel(node);
      const color = this.getDOTColor(node);
      lines.push(`  "${node.id}" [label="${label}", fillcolor="${color}", style="filled,rounded"];`);
    }

    lines.push('');

    // Aristas
    for (const edge of this.graph.edges) {
      const label = edge.label || '';
      lines.push(`  "${edge.from}" -> "${edge.to}" [label="${label}"];`);
    }

    lines.push('}');
    return lines.join('\n');
  }

  /**
   * Formato Mermaid para Markdown
   */
  toMermaid() {
    const lines = [];
    lines.push('```mermaid');
    lines.push('flowchart TD');
    lines.push('');

    // Definir estilos
    lines.push('    classDef input fill:#e1f5fe,stroke:#01579b;');
    lines.push('    classDef transform fill:#fff3e0,stroke:#ef6c00;');
    lines.push('    classDef output fill:#e8f5e9,stroke:#2e7d32;');
    lines.push('    classDef sideEffect fill:#ffebee,stroke:#c62828;');
    lines.push('');

    // Nodos
    for (const node of this.graph.nodes) {
      const label = this.getMermaidLabel(node);
      const className = this.getMermaidClass(node);
      lines.push(`    ${node.id}[${label}]:::${className}`);
    }

    lines.push('');

    // Aristas
    for (const edge of this.graph.edges) {
      const label = edge.label ? `|${edge.label}|` : '';
      lines.push(`    ${edge.from} -->${label} ${edge.to}`);
    }

    lines.push('```');
    return lines.join('\n');
  }

  /**
   * Formato Cytoscape para visualización web
   */
  toCytoscape() {
    return {
      nodes: this.graph.nodes.map(n => ({
        data: {
          id: n.id,
          label: this.getCytoscapeLabel(n),
          type: n.type,
          category: n.category,
          ...n.properties
        }
      })),
      edges: this.graph.edges.map((e, i) => ({
        data: {
          id: `e${i}`,
          source: e.from,
          target: e.to,
          label: e.label || '',
          ...e
        }
      }))
    };
  }

  // Helper methods

  getDOTLabel(node) {
    const parts = [];
    
    if (node.output?.name) {
      parts.push(`${node.output.name} =`);
    }
    
    parts.push(node.type);
    
    if (node.properties?.functionName) {
      parts.push(`(${node.properties.functionName})`);
    }
    
    return parts.join(' ').replace(/"/g, '\\"');
  }

  getDOTColor(node) {
    switch (node.category) {
      case 'input': return '#e1f5fe';
      case 'arithmetic': return '#fff3e0';
      case 'logical': return '#f3e5f5';
      case 'side_effect': return '#ffebee';
      case 'control': return '#e8f5e9';
      case 'structural': return '#fce4ec';
      case 'functional': return '#e0f2f1';
      default: return '#fafafa';
    }
  }

  getMermaidLabel(node) {
    const parts = [];
    
    if (node.output?.name) {
      parts.push(`${node.output.name}=`);
    }
    
    parts.push(node.type);
    
    if (node.properties?.functionName) {
      parts.push(`(${node.properties.functionName})`);
    }
    
    return parts.join('');
  }

  getMermaidClass(node) {
    switch (node.category) {
      case 'input': return 'input';
      case 'side_effect': return 'sideEffect';
      default: return 'transform';
    }
  }

  getCytoscapeLabel(node) {
    if (node.output?.name) {
      return `${node.output.name}`;
    }
    return node.type;
  }
}

export default GraphFormatter;
