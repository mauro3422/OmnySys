/**
 * @fileoverview Deep Chains Detector V2
 */

import { PatternDetector } from '../detector-base.js';
import { summarizeDeepChains } from '../../analyses/shared/deep-chains-helpers.js';

const logger = {
  debug: (msg, ...args) => process.env.DEBUG && console.log(`[DeepChains] ${msg}`, ...args)
};

export class DeepChainsDetector extends PatternDetector {
  constructor(config = {}, globalConfig = {}) {
    super({
      ...config,
      id: 'deepChains',
      name: 'Deep Dependency Chains',
      description: 'Detects dependency chains deeper than 7 levels with high coupling'
    }, globalConfig);
  }

  async detect(systemMap) {
    if (!systemMap) {
      return {
        detector: this.getId(),
        name: this._name || this.getId(),
        description: this._description,
        findings: [],
        score: 100,
        weight: this.globalConfig.weights?.deepChains || 0.2,
        recommendation: 'No deep chains detected'
      };
    }

    const config = this.config;
    const summary = summarizeDeepChains(systemMap, {
      minDepth: config.minDepth || 7,
      maxAcceptable: config.maxAcceptable || 20,
      branchLimit: config.branchLimit || 3,
      riskThreshold: 20,
      maxFanOut: config.maxFanOut || 5
    });

    logger.debug(`Analyzing ${summary.entryPoints.length} entry points for deep chains`);

    const findings = summary.chains.map((chainInfo) => ({
      id: `deep-chain-${chainInfo.entryPoint.id}`,
      type: 'deep_dependency_chain',
      severity: chainInfo.riskScore >= 50 ? 'high' : 'medium',
      file: chainInfo.entryPoint.file,
      line: chainInfo.entryPoint.line,
      message: `Deep chain: ${chainInfo.depth} levels from ${chainInfo.entryPoint.name}`,
      recommendation: `Consider breaking chain at level ${Math.floor(chainInfo.depth / 2)}`,
      metadata: {
        chainLength: chainInfo.depth,
        chain: chainInfo.chain.slice(0, 10),
        riskScore: chainInfo.riskScore,
        entryPoint: chainInfo.entryPoint.name,
        fanIn: chainInfo.entryPoint.fanIn,
        fanOut: chainInfo.entryPoint.fanOut
      }
    }));

    return {
      detector: this.getId(),
      name: this._name || this.getId(),
      description: this._description,
      findings,
      score: summary.score,
      weight: this.globalConfig.weights?.deepChains || 0.15,
      recommendation: summary.recommendation
    };
  }
}

export default DeepChainsDetector;
