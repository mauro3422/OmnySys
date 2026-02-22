/**
 * @fileoverview GraphMetricsBuilder - Builder for graph metrics
 */

export class GraphMetricsBuilder {
  constructor() {
    this.metrics = {
      centrality: 0,
      fanIn: 0,
      fanOut: 0,
      pageRank: 0,
      betweenness: 0
    };
  }

  asHotspot(level = 'medium') {
    const levels = {
      low: { centrality: 0.3, fanIn: 5, fanOut: 3, pageRank: 0.02 },
      medium: { centrality: 0.6, fanIn: 15, fanOut: 8, pageRank: 0.05 },
      high: { centrality: 0.9, fanIn: 30, fanOut: 20, pageRank: 0.15 }
    };
    this.metrics = { ...this.metrics, ...levels[level] };
    return this;
  }

  withCoupling(afferent = 0, efferent = 0) {
    this.metrics.fanIn = afferent;
    this.metrics.fanOut = efferent;
    this.metrics.instability = efferent / (afferent + efferent || 1);
    return this;
  }

  withCentrality(score) {
    this.metrics.centrality = score;
    return this;
  }

  build() {
    return this.metrics;
  }

  static create() {
    return new GraphMetricsBuilder();
  }
}
