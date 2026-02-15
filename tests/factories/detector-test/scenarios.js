/**
 * @fileoverview Detector Test Factory - Scenarios
 */

import { AdvancedAnalysisBuilder, SystemMapBuilder } from './builders.js';

export const DetectorScenarios = {
  /**
   * Dead code scenario: function never called
   */
  deadCode: () => SystemMapBuilder.create()
    .withFile('src/utils.js')
    .withFunction('src/utils.js', 'unusedHelper', { line: 10 })
    .withFunction('src/utils.js', 'usedHelper', { 
      line: 20, 
      usedBy: ['src/main.js'],
      isExported: true 
    })
    .build(),

  /**
   * Dead code with event handlers (should be excluded)
   */
  deadCodeWithHandlers: () => SystemMapBuilder.create()
    .withFile('src/components.js')
    .withFunction('src/components.js', 'onClick', { line: 5 })
    .withFunction('src/components.js', 'handleSubmit', { line: 10 })
    .withFunction('src/components.js', 'initApp', { line: 15 })
    .build(),

  /**
   * Broken worker scenario
   */
  brokenWorker: () => ({
    systemMap: SystemMapBuilder.create()
      .withFile('src/main.js')
      .withFile('src/workers/valid-worker.js')
      .build(),
    advancedAnalysis: AdvancedAnalysisBuilder.create()
      .withWorker('src/main.js', './missing-worker.js', { line: 10 })
      .withWorker('src/main.js', './workers/valid-worker.js', { line: 20 })
      .build()
  }),

  /**
   * Broken dynamic import scenario
   */
  brokenDynamicImport: () => SystemMapBuilder.create()
    .withFile('src/main.js')
    .withFile('src/modules/exists.js')
    .withUnresolvedImport('src/main.js', './modules/missing.js')
    .withDynamicImport('src/main.js', './modules/exists.js')
    .withResolution('src/main.js', './modules/exists.js', 'src/modules/exists.js')
    .build(),

  /**
   * Duplicate functions scenario
   */
  duplicateFunctions: () => SystemMapBuilder.create()
    .withFile('src/a.js')
    .withFile('src/b.js')
    .withFile('src/c.js')
    .withFunction('src/a.js', 'formatDate', { line: 5 })
    .withFunction('src/b.js', 'formatDate', { line: 8 })
    .withFunction('src/c.js', 'formatDate', { line: 12 })
    .withFunction('src/a.js', 'handleClick', { line: 20 }) // common name, should be ignored
    .withFunction('src/b.js', 'handleClick', { line: 25 })
    .build(),

  /**
   * Suspicious URLs scenario
   */
  suspiciousUrls: () => AdvancedAnalysisBuilder.create()
    .withNetworkUrl('src/api.js', 'http://localhost:3000/api', { line: 10 })
    .withNetworkUrl('src/api.js', 'https://api.production.com/v1', { line: 20 })
    .withWebSocketUrl('src/realtime.js', 'ws://127.0.0.1:8080', { line: 5 })
    .withNetworkUrl('src/config.js', 'http://example.com/test', { line: 15 })
    .build(),

  /**
   * Empty system map
   */
  empty: () => SystemMapBuilder.create().build(),

  /**
   * Complex scenario with multiple issues
   */
  complex: () => ({
    systemMap: SystemMapBuilder.create()
      .withFile('src/main.js')
      .withFile('src/utils.js')
      .withFile('src/helpers.js')
      .withFunction('src/utils.js', 'formatDate', { line: 1 })
      .withFunction('src/helpers.js', 'formatDate', { line: 1 }) // duplicate
      .withFunction('src/utils.js', 'unusedFunction', { line: 10 }) // dead code
      .withUnresolvedImport('src/main.js', './missing-module.js')
      .build(),
    advancedAnalysis: AdvancedAnalysisBuilder.create()
      .withWorker('src/main.js', './non-existent-worker.js')
      .withNetworkUrl('src/main.js', 'http://localhost:8080')
      .build()
  })
};

/**
 * Factory helper for creating detector test data
 */

