import { describe, expect, it } from 'vitest';

import { buildStatusSummaryPayload } from '../../../../../src/shared/compiler/status-summary-payload.js';
import { buildStatusSummaryPayloadFixture } from './status-summary-payload.fixture.js';

describe('status summary payload', () => {
  it('exposes the update surface alongside the system table', () => {
    const { status, recentErrors } = buildStatusSummaryPayloadFixture();
    const payload = buildStatusSummaryPayload(status, recentErrors);

    expect(payload).toHaveProperty('updateSurface');
    expect(payload).toHaveProperty('systemInventory');
    expect(payload).toHaveProperty('canonicalPromotion');
    expect(payload.updateSurface).toMatchObject({
      state: 'synced',
      source: 'atom/function update pipeline'
    });
    expect(payload.systemInventory).toMatchObject({
      inventoryState: 'watching',
      canonicalSurfaceCount: 12,
      canonicalEntrypointCount: 4
    });
    expect(payload.canonicalPromotion).toMatchObject({
      promotionState: 'ready',
      candidateCount: 3,
      folderizedFamilyCount: 1
    });
    expect(payload.folderizationAutomation).toMatchObject({
      automationState: 'ready',
      executionMode: 'execute',
      executionTarget: 'folderize_family'
    });
    expect(payload.folderizationAdoption).toMatchObject({
      adoptionState: 'ready',
      requiredSystemCount: 3,
      surfacedSystemCount: 3
    });
    expect(payload.proxyRuntimeTelemetry).toMatchObject({
      state: 'stable',
      restartCount: 0,
      cleanExitCount: 1
    });
    expect(payload.bridgeRuntimeTelemetry).toMatchObject({
      state: 'watchful',
      connectCount: 2,
      reconnectCount: 1
    });
    expect(payload.propagation).toMatchObject({
      cacheKey: 'folderization:abc123',
      decision: 'approve',
      mode: 'family'
    });

    const updateRow = payload.systemTable.rows.find((row) => row.area === 'Update');
    expect(updateRow).toMatchObject({
      area: 'Update',
      state: 'synced',
      source: 'atom/function update pipeline'
    });
    expect(updateRow.detail).toContain('mirror=2456');
    expect(updateRow.detail).toContain('deps=3');
    expect(updateRow.detail).toContain('integrity=ok');

    const systemsRow = payload.systemTable.rows.find((row) => row.area === 'Systems');
    expect(systemsRow).toMatchObject({
      area: 'Systems',
      state: 'watching',
      source: 'system inventory'
    });
    expect(systemsRow.detail).toContain('canonical=16');
    expect(systemsRow.detail).toContain('emergent=2');
    expect(systemsRow.detail).toContain('bridge=1');
    expect(systemsRow.detail).toContain('meta=79%');
    expect(systemsRow.detail).toContain('integration=68%');

    const aduanaRow = payload.systemTable.rows.find((row) => row.area === 'Aduana');
    expect(aduanaRow).toMatchObject({
      area: 'Aduana',
      state: 'watching',
      source: 'system inventory policy coverage'
    });
    expect(aduanaRow.detail).toContain('score=77');
    expect(aduanaRow.detail).toContain('drift=3');
    expect(aduanaRow.detail).toContain('expansion=stale');
    expect(aduanaRow.detail).toContain('coverage=50');

    const promotionRow = payload.systemTable.rows.find((row) => row.area === 'Promotion');
    expect(promotionRow).toMatchObject({
      area: 'Promotion',
      state: 'ready',
      source: 'canonical promotion'
    });
    expect(promotionRow.detail).toContain('candidates=3');
    expect(promotionRow.detail).toContain('folder=1');
    expect(promotionRow.detail).toContain('emergent=2');

    const automationRow = payload.systemTable.rows.find((row) => row.area === 'Automation');
    expect(automationRow).toMatchObject({
      area: 'Automation',
      state: 'ready',
      source: 'folderization automation plan'
    });
    expect(automationRow.detail).toContain('mode=execute');
    expect(automationRow.detail).toContain('exec=yes');
    expect(automationRow.detail).toContain('target=folderize_family');
    expect(automationRow.detail).toContain('systems=3');

    const adoptionRow = payload.systemTable.rows.find((row) => row.area === 'Adoption');
    expect(adoptionRow).toMatchObject({
      area: 'Adoption',
      state: 'ready',
      source: 'folderization propagation adoption'
    });
    expect(adoptionRow.detail).toContain('required=3');
    expect(adoptionRow.detail).toContain('surfaced=3');
    expect(adoptionRow.detail).toContain('missing=0');
    expect(adoptionRow.detail).toContain('coverage=100');
    expect(adoptionRow.detail).toContain('missingNames=none');

    expect(payload.systemTable.rows.map((row) => row.area)).toEqual([
      'Daemon',
      'Database',
      'Snapshots',
      'Update',
      'Startup',
      'Proxy',
      'Bridge',
      'Behavior',
      'Drift',
      'Propagation',
      'Debt',
      'Sessions',
      'Tools',
      'Systems',
      'Aduana',
      'Promotion',
      'Automation',
      'Adoption',
      'Cache',
      'Watcher',
      'Errors'
    ]);
  });
});
