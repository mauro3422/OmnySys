import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, expect, it, vi } from 'vitest';

import { createBridgeTelemetryController, parseRestartRecoveryHint } from '../../../../src/layer-c-memory/mcp/stdio-bridge-telemetry.js';
import { readBridgeRuntimeTelemetry } from '../../../../src/shared/compiler/bridge-runtime-telemetry.js';

describe('stdio-bridge-telemetry', () => {
  it('persists the derived bridge state instead of leaving the raw booting state behind', () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'omnysys-bridge-controller-'));
    const controller = createBridgeTelemetryController({
      projectPath: projectRoot,
      log: vi.fn()
    });

    controller.persistBridgeTelemetry({
      state: 'booting',
      events: []
    });

    controller.recordBridgeEvent('bridge-connect');

    const readBack = readBridgeRuntimeTelemetry(projectRoot);

    expect(readBack).toMatchObject({
      state: 'stable',
      bridgeHealthState: 'stable',
      bridgeRiskLevel: 'low',
      connectCount: 1
    });
  });

  it('parses recovery hints for proxy-managed restarts beyond processRestart', () => {
    const hint = parseRestartRecoveryHint({
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              restarting: true,
              restartType: 'proxy_reanalyze',
              bridgeRecovery: {
                state: 'recovering',
                forceFreshSession: true,
                retryAfterMs: 15000
              }
            })
          }
        ]
      }
    });

    expect(hint).toEqual(expect.objectContaining({
      restartType: 'proxy_reanalyze'
    }));
  });

  it('ignores non-recovering maintenance acknowledgements', () => {
    const hint = parseRestartRecoveryHint({
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              restarting: true,
              restartType: 'cache_only_flush',
              bridgeRecovery: {
                state: 'accepted',
                forceFreshSession: false,
                retryAfterMs: 0
              }
            })
          }
        ]
      }
    });

    expect(hint).toBeNull();
  });
});
