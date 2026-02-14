/**
 * @fileoverview Argument Mapper - Maps arguments to parameters
 * @module molecular-chains/argument-mapper/ArgumentMapper
 */

import { detectTransform } from './transforms/detector.js';
import { extractArgumentCode, extractRootVariable } from './extractors/argument-extractor.js';
import { analyzeDataFlow, trackReturnUsage, detectChainedTransforms, calculateChainComplexity } from './analysis/index.js';
import { calculateConfidence } from './utils/confidence.js';

export class ArgumentMapper {
  constructor(callerAtom, calleeAtom, callInfo) {
    this.caller = callerAtom;
    this.callee = calleeAtom;
    this.call = callInfo;
  }

  /**
   * Maps all arguments to parameters
   */
  map() {
    const mappings = [];
    const callerArgs = this.call.args || [];
    const calleeParams = this.callee.dataFlow?.inputs || [];
    
    for (let i = 0; i < Math.max(callerArgs.length, calleeParams.length); i++) {
      const arg = callerArgs[i];
      const param = calleeParams[i];
      
      if (arg && param) {
        mappings.push(this.mapArgumentToParam(arg, param, i));
      }
    }

    return {
      caller: this.caller.name,
      callee: this.callee.name,
      callSite: this.call.line || 0,
      mappings,
      totalArgs: callerArgs.length,
      totalParams: calleeParams.length,
      hasSpread: callerArgs.some(a => a.type === 'spread'),
      hasDestructuring: calleeParams.some(p => p.type === 'destructured')
    };
  }

  /**
   * Maps a specific argument to a parameter
   */
  mapArgumentToParam(arg, param, position) {
    return {
      position,
      argument: {
        code: extractArgumentCode(arg),
        type: arg.type || 'unknown',
        variable: extractRootVariable(arg)
      },
      parameter: {
        name: param.name,
        type: param.type || 'simple',
        position: param.position || position
      },
      transform: detectTransform(arg, param),
      confidence: calculateConfidence(arg, param)
    };
  }

  /** Performs comprehensive data flow analysis */
  analyzeDataFlow() {
    return analyzeDataFlow(this.caller, this.callee, this.call, () => this.map());
  }

  /** Tracks how the callee return value is used in the caller */
  trackReturnUsage() {
    return trackReturnUsage(this.caller, this.callee, this.call);
  }

  /** Detects chained transformations */
  detectChainedTransforms(mapping) {
    return detectChainedTransforms(mapping, this.caller, this.callee);
  }

  /** Calculates chain complexity */
  calculateChainComplexity(mapping, returnUsage) {
    return calculateChainComplexity(mapping, returnUsage);
  }
}

export default ArgumentMapper;
