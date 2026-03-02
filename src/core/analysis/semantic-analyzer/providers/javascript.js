/**
 * @fileoverview JavaScript/TypeScript semantic provider.
 */

import { BaseSemanticProvider } from './base.js';
import { JsAnalyzer } from '../../../../layer-c-memory/mcp/tools/generate-tests/atom-semantic-analyzer/js-analyzer.js';

export class JSSemanticProvider extends BaseSemanticProvider {
  constructor() {
    super();
    // JsAnalyzer is a singleton object, no need for 'new'
  }

  analyze(atom, code, options) {
    // Map individual detectors from the legacy JS analyzer
    const mutatedParams = JsAnalyzer.detectMutatedParams(atom); // cache to avoid double-call
    const results = {
      hasReturnValue: !JsAnalyzer.detectVoidReturn(atom),
      returnLiterals: JsAnalyzer.extractReturnLiterals(atom),
      mutatesParams: mutatedParams,
      usesThisContext: JsAnalyzer.detectThisContext(atom),
      paramHints: JsAnalyzer.inferParamHints(atom),
      // Heuristic for purity: no side effects, no mutations, has return
      isPure: !atom.hasSideEffects && !mutatedParams.length && !JsAnalyzer.detectThisContext(atom)
    };

    return this.standardize(results);
  }
}
