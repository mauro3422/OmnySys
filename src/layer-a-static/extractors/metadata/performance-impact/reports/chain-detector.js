/**
 * @fileoverview Critical Chain Detector
 * 
 * Detects critical performance chains (A→B→C) where
 * all functions in the chain have high performance impact.
 * 
 * @module performance-impact/reports/chain-detector
 */

/**
 * Detects critical performance chains
 * 
 * @class ChainDetector
 */
export class ChainDetector {
  /**
   * Detects critical chains from performance connections
   * 
   * @param {Array} connections - Performance impact connections
   * @returns {Array} Detected critical chains
   */
  detect(connections) {
    const graph = this._buildGraph(connections);
    const chains = [];

    // Find chains (A→B→C)
    for (const [node, sources] of graph) {
      for (const source of sources) {
        if (graph.has(source)) {
          const grandSources = graph.get(source);

          for (const grandSource of grandSources) {
            chains.push(this._createChain(grandSource, source, node));
          }
        }
      }
    }

    return chains;
  }

  /**
   * Builds impact graph from connections
   * @private
   * @param {Array} connections - Performance connections
   * @returns {Map} Graph mapping nodes to their sources
   */
  _buildGraph(connections) {
    const graph = new Map();

    for (const conn of connections) {
      if (conn.impact.severity === 'high' || conn.impact.severity === 'critical') {
        if (!graph.has(conn.to)) {
          graph.set(conn.to, []);
        }
        graph.get(conn.to).push(conn.from);
      }
    }

    return graph;
  }

  /**
   * Creates a chain report object
   * @private
   * @param {string} grandSource - Grandparent node
   * @param {string} source - Parent node
   * @param {string} node - Child node
   * @returns {Object} Chain report
   */
  _createChain(grandSource, source, node) {
    return {
      type: 'performance-chain',
      chain: [grandSource, source, node],
      severity: 'critical',
      message: `Critical performance chain: ${grandSource} → ${source} → ${node}`,
      recommendation: 'Consider parallel execution or caching'
    };
  }

  /**
   * Gets the severity of a chain
   * 
   * @param {Array} chain - Chain of node IDs
   * @param {Map} performanceMap - Map of node IDs to performance data
   * @returns {string} Chain severity
   */
  getChainSeverity(chain, performanceMap) {
    const scores = chain.map(node => 
      performanceMap.get(node)?.impactScore || 0
    );
    
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    if (avgScore > 0.7) return 'critical';
    if (avgScore > 0.5) return 'high';
    if (avgScore > 0.3) return 'medium';
    return 'low';
  }
}

export default ChainDetector;
