/**
 * @fileoverview Graph Test Factory - Main Factory
 */

import { createFileNode, createImpactInfo } from '../../../src/layer-graph/core/types.js';
import { SystemMapBuilder } from './builders.js';
import { GraphScenarios } from './scenarios.js';

export class GraphTestFactory {
  /**
   * Create a graph scenario
   * @param {string} name - Scenario name
   * @returns {Object} Graph structure
   */
  static createScenario(name) {
    return GraphScenarios[name] ? GraphScenarios[name]() : GraphScenarios.empty();
  }

  /**
   * Create a SystemMap with specific file count
   * @param {number} fileCount - Number of files
   * @returns {SystemMap}
   */
  static createSystemMapWithFiles(fileCount) {
    const builder = SystemMapBuilder.create();
    for (let i = 0; i < fileCount; i++) {
      builder.withFile(`src/file${i}.js`);
    }
    return builder.build();
  }

  /**
   * Create a SystemMap with a dependency chain
   * @param {number} length - Length of the chain
   * @returns {SystemMap}
   */
  static createChain(length) {
    const paths = Array.from({ length }, (_, i) => `src/file${i}.js`);
    return SystemMapBuilder.create()
      .withDependencyChain(paths)
      .build();
  }

  /**
   * Create a SystemMap with cycles
   * @param {number} cycleCount - Number of cycles
   * @param {number} cycleSize - Size of each cycle
   * @returns {SystemMap}
   */
  static createWithCycles(cycleCount, cycleSize = 3) {
    const builder = SystemMapBuilder.create();
    for (let i = 0; i < cycleCount; i++) {
      const paths = Array.from({ length: cycleSize }, (_, j) => `src/cycle${i}/file${j}.js`);
      builder.withCycle(paths);
    }
    return builder.build();
  }

  /**
   * Create a SystemMap with functions
   * @param {Object} config - { filePath: functionCount }
   * @returns {SystemMap}
   */
  static createWithFunctions(config) {
    const builder = SystemMapBuilder.create();
    for (const [filePath, count] of Object.entries(config)) {
      builder.withFile(filePath);
      for (let i = 0; i < count; i++) {
        builder.withFunction(filePath, `func${i}`, { line: i * 10 + 1 });
      }
    }
    return builder.build();
  }

  /**
   * Create impact info for testing
   * @param {string} filePath - File path
   * @param {Object} options - Impact options
   * @returns {ImpactInfo}
   */
  static createImpactInfo(filePath, options = {}) {
    const fileNode = createFileNode(filePath, filePath, {});
    fileNode.usedBy = options.directDependents || [];
    fileNode.transitiveDependents = options.indirectDependents || [];
    return createImpactInfo(filePath, fileNode);
  }
}
