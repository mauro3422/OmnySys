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

  async analyze(atom, code, options) {
    // Map individual detectors from the legacy JS analyzer
    const results = {
      hasReturnValue: !JsAnalyzer.detectVoidReturn(atom),
      returnLiterals: JsAnalyzer.extractReturnLiterals(atom),
      mutatesParams: JsAnalyzer.detectMutatedParams(atom),
      usesThisContext: JsAnalyzer.detectThisContext(atom),
      paramHints: JsAnalyzer.inferParamHints(atom),
      // Heuristic for purity: no side effects, no mutations, has return
      isPure: !atom.hasSideEffects && !JsAnalyzer.detectMutatedParams(atom).length && !JsAnalyzer.detectThisContext(atom)
    };

    return this.standardize(results);
  }
}
