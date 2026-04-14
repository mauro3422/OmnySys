import { describe, it, expect } from 'vitest';
import {
  attachCompilerSnapshotContracts,
  buildCompilerSnapshotResult
} from '../../../../../src/layer-c-memory/mcp/tools/compiler-snapshot-service/helpers.js';

describe('compiler-snapshot-service helpers', () => {
  it('attaches cross-contract references without changing the object shape', () => {
    const snapshot = { current: {} };
    const compactSnapshot = {};
    const healthDashboard = {};
    const healthPanel = {};
    const observability = {};
    const observabilitySummary = { kind: 'summary' };
    const controlPlane = { kind: 'control' };
    const controlPlaneSummary = { kind: 'control-summary' };
    const systemInventory = {};
    const systemInventoryDetail = {};
    const canonicalPromotion = {};
    const canonicalPromotionDetail = {};
    const compilerExplainability = {};

    const result = attachCompilerSnapshotContracts({
      snapshot,
      compactSnapshot,
      healthDashboard,
      healthPanel,
      observability,
      observabilitySummary,
      controlPlane,
      controlPlaneSummary,
      systemInventory,
      systemInventoryDetail,
      canonicalPromotion,
      canonicalPromotionDetail,
      compilerExplainability
    });

    expect(result.snapshot.current.observability).toBe(observabilitySummary);
    expect(result.snapshot.current.controlPlane).toBe(controlPlaneSummary);
    expect(result.compactSnapshot.controlPlane).toBe(controlPlaneSummary);
    expect(result.healthPanel.observability).toBe(observabilitySummary);
    expect(result.compilerExplainability.controlPlane).toBe(controlPlane);
  });

  it('builds the final snapshot response with all fields exposed', () => {
    const result = buildCompilerSnapshotResult({
      projectPath: 'C:/Dev/OmnySystem',
      repo: { db: true },
      notifications: [],
      compactNotifications: { logs: [] },
      recentErrors: { summary: { total: 0 } },
      compilerExplainability: { ok: true },
      snapshot: { ok: true },
      compactSnapshot: { ok: true },
      systemInventory: { ok: true },
      systemInventoryDetail: { ok: true },
      canonicalPromotion: { ok: true },
      canonicalPromotionDetail: { ok: true },
      observability: { ok: true },
      observabilitySummary: { ok: true },
      controlPlane: { ok: true },
      controlPlaneSummary: { ok: true },
      healthDashboard: { ok: true },
      healthPanel: { ok: true }
    });

    expect(result.success).toBe(true);
    expect(result.projectPath).toContain('OmnySystem');
    expect(result.healthPanel).toEqual({ ok: true });
  });
});
