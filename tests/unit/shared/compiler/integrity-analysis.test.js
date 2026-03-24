import { describe, expect, it } from 'vitest';
import {
  isLikelyBoundaryContainerAtom,
  isLikelyToolWrapperAtom
} from '../../../../src/shared/compiler/integrity-analysis.js';

function buildClassAtom(overrides = {}) {
  return {
    type: 'class',
    name: 'PlainAtom',
    filePath: 'src/plain/plain-atom.js',
    ...overrides
  };
}

describe('integrity-analysis boundary heuristics', () => {
  it('treats runtime server shells as boundary containers', () => {
    expect(isLikelyBoundaryContainerAtom(buildClassAtom({
      name: 'OmnySysMCPServer',
      filePath: 'src/layer-c-memory/mcp/core/server-class.js'
    }))).toBe(true);
  });

  it('treats cache shells as boundary containers', () => {
    expect(isLikelyBoundaryContainerAtom(buildClassAtom({
      name: 'DerivationCache',
      filePath: 'src/shared/derivation-engine/cache.js'
    }))).toBe(true);
  });

  it('treats client shells as boundary containers', () => {
    expect(isLikelyBoundaryContainerAtom(buildClassAtom({
      name: 'WSClient',
      filePath: 'src/core/websocket/client/ws-client.js'
    }))).toBe(true);
  });

  it('treats processor shells as boundary containers', () => {
    expect(isLikelyBoundaryContainerAtom(buildClassAtom({
      name: 'BatchProcessor',
      filePath: 'src/core/batch-processor/index.js'
    }))).toBe(true);
  });

  it('treats detector shells as boundary containers', () => {
    expect(isLikelyBoundaryContainerAtom(buildClassAtom({
      name: 'TunnelVisionDetector',
      filePath: 'src/core/tunnel-vision-detector/index.js'
    }))).toBe(true);
  });

  it('treats classifier shells as boundary containers', () => {
    expect(isLikelyBoundaryContainerAtom(buildClassAtom({
      name: 'ErrorClassifier',
      filePath: 'src/core/error-guardian/handlers/error-classifier/classifiers/base-classifier.js'
    }))).toBe(true);
  });

  it('treats parser shells as boundary containers', () => {
    expect(isLikelyBoundaryContainerAtom(buildClassAtom({
      name: 'FileParser',
      filePath: 'src/layer-a-static/parser/index.js'
    }))).toBe(true);
  });

  it('treats scheduler shells as boundary containers', () => {
    expect(isLikelyBoundaryContainerAtom(buildClassAtom({
      name: 'BatchScheduler',
      filePath: 'src/core/batch-processor/batch-scheduler.js'
    }))).toBe(true);
  });

  it('treats initialization step shells as boundary containers', () => {
    expect(isLikelyBoundaryContainerAtom(buildClassAtom({
      name: 'LLMSetupStep',
      filePath: 'src/layer-c-memory/mcp/core/initialization/steps/llm-setup-step.js'
    }))).toBe(true);
  });

  it('treats worker state shells as boundary containers', () => {
    expect(isLikelyBoundaryContainerAtom(buildClassAtom({
      name: 'WorkerState',
      filePath: 'src/core/worker/WorkerState.js'
    }))).toBe(true);
  });

  it('does not classify ordinary classes as boundary containers', () => {
    expect(isLikelyBoundaryContainerAtom(buildClassAtom({
      name: 'PlainUtility',
      filePath: 'src/shared/plain-utility.js'
    }))).toBe(false);
  });

  it('still recognizes tool wrappers by suffix', () => {
    expect(isLikelyToolWrapperAtom(buildClassAtom({
      name: 'TelemetryTool',
      filePath: 'src/tools/telemetry-tool.js'
    }))).toBe(true);
  });
});
