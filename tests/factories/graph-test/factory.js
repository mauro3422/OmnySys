/**
 * @fileoverview Graph Test Factory - Main Factory
 */

import { createFileNode, createImpactInfo } from '../../../src/layer-graph/core/types.js';
import { SystemMapBuilder } from './builders/index.js';
import { GraphScenarios } from './scenarios.js';

export function createScenario(name) {
  return GraphScenarios[name] ? GraphScenarios[name]() : GraphScenarios.empty();
}

export function createSystemMapWithFiles(fileCount) {
  const builder = SystemMapBuilder.create();
  for (let i = 0; i < fileCount; i++) {
    builder.withFile(`src/file${i}.js`);
  }
  return builder.build();
}

export function createChain(length) {
  const paths = Array.from({ length }, (_, i) => `src/file${i}.js`);
  return SystemMapBuilder.create()
    .withDependencyChain(paths)
    .build();
}

export function createWithCycles(cycleCount, cycleSize = 3) {
  const builder = SystemMapBuilder.create();
  for (let i = 0; i < cycleCount; i++) {
    const paths = Array.from({ length: cycleSize }, (_, j) => `src/cycle${i}/file${j}.js`);
    builder.withCycle(paths);
  }
  return builder.build();
}

export function createWithFunctions(config) {
  const builder = SystemMapBuilder.create();
  for (const [filePath, count] of Object.entries(config)) {
    builder.withFile(filePath);
    for (let i = 0; i < count; i++) {
      builder.withFunction(filePath, `func${i}`, { line: i * 10 + 1 });
    }
  }
  return builder.build();
}

export function createImpactInfoForTest(filePath, options = {}) {
  const fileNode = createFileNode(filePath, filePath, {});
  fileNode.usedBy = options.directDependents || [];
  fileNode.transitiveDependents = options.indirectDependents || [];
  return createImpactInfo(filePath, fileNode);
}

export const GraphTestFactory = {
  createScenario,
  createSystemMapWithFiles,
  createChain,
  createWithCycles,
  createWithFunctions,
  createImpactInfo: createImpactInfoForTest
};

export default GraphTestFactory;
