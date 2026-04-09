import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, expect, it, vi } from 'vitest';

import { createBridgeTelemetryController } from '../../../../src/layer-c-memory/mcp/stdio-bridge-telemetry.js';
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
});
