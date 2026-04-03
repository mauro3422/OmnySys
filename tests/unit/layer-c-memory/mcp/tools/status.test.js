import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPhase2Status: vi.fn(),
  getCachedMetadata: vi.fn(),
  getCachedCounts: vi.fn(),
  buildCompilerStatusSummaryEnvelope: vi.fn(),
  buildServerStatusEnvelope: vi.fn(),
  enrichServerStatus: vi.fn(),
  buildRecentErrorsResponse: vi.fn(),
  loadNotifications: vi.fn(),
  buildGovernanceAlerts: vi.fn(),
  mergeRecentNotificationsWithGovernanceAlerts: vi.fn(),
  loadCompilerExplainability: vi.fn(),
  statusResponseCache: new Map()
}));

vi.mock('../../../../../src/shared/compiler/index.js', () => ({
  getPhase2Status: mocks.getPhase2Status,
  getCachedMetadata: mocks.getCachedMetadata,
  getCachedCounts: mocks.getCachedCounts,
  buildCompilerStatusSummaryEnvelope: mocks.buildCompilerStatusSummaryEnvelope,
  loadCompilerExplainability: mocks.loadCompilerExplainability,
  clearStatusResponseCache: () => mocks.statusResponseCache.clear(),
  getStatusResponseCacheEntry: (cacheKey) => mocks.statusResponseCache.get(cacheKey) || null,
  setStatusResponseCacheEntry: (cacheKey, response) => {
    mocks.statusResponseCache.set(cacheKey, {
      capturedAt: Date.now(),
      response
    });
  }
}));

vi.mock('../../../../../src/layer-c-memory/mcp/tools/status-runtime.js', () => ({
  buildServerStatusEnvelope: mocks.buildServerStatusEnvelope
}));

vi.mock('../../../../../src/layer-c-memory/mcp/tools/status-server-details.js', () => ({
  enrichServerStatus: mocks.enrichServerStatus
}));

vi.mock('../../../../../src/layer-c-memory/mcp/tools/status-notifications.js', () => ({
  buildRecentErrorsResponse: mocks.buildRecentErrorsResponse,
  loadNotifications: mocks.loadNotifications
}));

vi.mock('../../../../../src/layer-c-memory/mcp/core/governance-alerts.js', () => ({
  buildGovernanceAlerts: mocks.buildGovernanceAlerts,
  mergeRecentNotificationsWithGovernanceAlerts: mocks.mergeRecentNotificationsWithGovernanceAlerts
}));

import { clearServerStatusCache, get_server_status } from '../../../../../src/layer-c-memory/mcp/tools/status.js';

describe('status tool cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearServerStatusCache();
    mocks.statusResponseCache.clear();

    mocks.getPhase2Status.mockReturnValue({ inProgress: false });
    mocks.getCachedMetadata.mockReturnValue(null);
    mocks.getCachedCounts.mockReturnValue({ totalFiles: 0, totalAtoms: 0 });
    mocks.buildServerStatusEnvelope.mockReturnValue({ initialized: true, projectPath: 'C:/Dev/OmnySystem' });
    mocks.enrichServerStatus.mockResolvedValue({
      recentErrors: { summary: { total: 0, warnings: 0, errors: 0 } }
    });
    mocks.buildCompilerStatusSummaryEnvelope.mockImplementation((status, recentErrors) => ({
      ...status,
      recentErrors,
      summaryText: 'cached'
    }));
  });

  it('reuses the status envelope within the TTL window', async () => {
    const context = {
      projectPath: 'C:/Dev/OmnySystem',
      orchestrator: {},
      cache: {},
      server: {}
    };

    const first = await get_server_status({}, context);
    const second = await get_server_status({}, context);

    expect(first).toStrictEqual(second);
    expect(mocks.enrichServerStatus).toHaveBeenCalledTimes(1);
    expect(mocks.buildCompilerStatusSummaryEnvelope).toHaveBeenCalledTimes(1);
  });
});
