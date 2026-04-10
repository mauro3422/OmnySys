import { describe, expect, it } from 'vitest';

import {
  buildInitializationPendingToolResult,
  buildInitializationProgress
} from '../../../../src/layer-c-memory/mcp/core/initialization/progress-state.js';

describe('initialization progress state', () => {
  it('builds startup progress with retry guidance while initialization is in flight', () => {
    const server = {
      initialized: false,
      currentInitializationStep: 'layer-a-analysis',
      currentInitializationDetail: 'load-metadata',
      initializationTimings: [{ name: 'instance-detection' }],
      pipeline: {
        steps: [
          { name: 'instance-detection', canExecute: () => true },
          { name: 'layer-a-analysis', canExecute: () => true },
          { name: 'cache-init', canExecute: () => true },
          { name: 'orchestrator-init', canExecute: () => true }
        ]
      }
    };

    const progress = buildInitializationProgress(server);

    expect(progress).toEqual(expect.objectContaining({
      status: 'starting',
      currentStep: 'layer-a-analysis',
      currentDetail: 'load-metadata',
      stepIndex: 2,
      totalSteps: 4,
      completedSteps: 1,
      retryAfterMs: 2000,
      acceptingMcpSessions: true
    }));
    expect(progress.progressPercent).toBeGreaterThan(0);
    expect(typeof progress.estimatedReadyAt).toBe('string');
  });

  it('returns a structured loading result for tool calls during startup', () => {
    const server = {
      initialized: false,
      projectPath: '/tmp/omnysys',
      currentInitializationStep: 'orchestrator-init',
      initializationTimings: [
        { name: 'instance-detection' },
        { name: 'layer-a-analysis' },
        { name: 'cache-init' }
      ],
      pipeline: {
        steps: [
          { name: 'instance-detection', canExecute: () => true },
          { name: 'layer-a-analysis', canExecute: () => true },
          { name: 'cache-init', canExecute: () => true },
          { name: 'orchestrator-init', canExecute: () => true },
          { name: 'mcp-setup', canExecute: () => true },
          { name: 'ready', canExecute: () => true }
        ]
      }
    };

    const result = buildInitializationPendingToolResult({ server });

    expect(result).toEqual(expect.objectContaining({
      structuredContent: expect.objectContaining({
        success: false,
        ready: false,
        loading: true,
        retryable: true,
        projectPath: '/tmp/omnysys',
        initialization: expect.objectContaining({
          currentStep: 'orchestrator-init'
        }),
        suggestedPollingTools: ['get_server_status', 'get_health_panel']
      }),
      content: [
        expect.objectContaining({
          type: 'text'
        })
      ]
    }));
  });
});
