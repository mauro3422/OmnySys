/**
 * @fileoverview Detector Test Factory - Main Factory
 */

import { AdvancedAnalysisBuilder, SystemMapBuilder } from './builders.js';
import { DetectorScenarios } from './scenarios.js';

export class DetectorTestFactory {
  /**
   * Create a complete test scenario
   */
  static createScenario(name) {
    return DetectorScenarios[name] ? DetectorScenarios[name]() : DetectorScenarios.empty();
  }

  /**
   * Create multiple dead functions
   */
  static createDeadFunctions(count) {
    const builder = SystemMapBuilder.create().withFile('src/utils.js');
    for (let i = 0; i < count; i++) {
      builder.withFunction('src/utils.js', `deadFunc${i}`, { line: i * 10 + 1 });
    }
    return builder.build();
  }

  /**
   * Create multiple duplicate functions
   */
  static createDuplicateFunctions(name, fileCount) {
    const builder = SystemMapBuilder.create();
    for (let i = 0; i < fileCount; i++) {
      builder.withFile(`src/file${i}.js`)
             .withFunction(`src/file${i}.js`, name, { line: 1 });
    }
    return builder.build();
  }

  /**
   * Create system map with various function types
   */
  static createMixedFunctionTypes() {
    return SystemMapBuilder.create()
      .withFile('src/app.js')
      // Dead functions
      .withFunction('src/app.js', 'unused1', { line: 1 })
      .withFunction('src/app.js', 'unused2', { line: 10 })
      // Event handlers (should not be flagged as dead)
      .withFunction('src/app.js', 'onButtonClick', { line: 20 })
      .withFunction('src/app.js', 'handleInputChange', { line: 30 })
      // Init functions (should not be flagged as dead)
      .withFunction('src/app.js', 'initializeApp', { line: 40 })
      .withFunction('src/app.js', 'setupEventListeners', { line: 50 })
      // Used functions
      .withFunction('src/app.js', 'helper', { 
        line: 60, 
        usedBy: ['src/other.js'],
        isExported: true 
      })
      .build();
  }
}

export default DetectorTestFactory;

