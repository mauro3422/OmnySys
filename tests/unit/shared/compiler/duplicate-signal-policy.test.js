import { describe, it, expect } from 'vitest';
import {
  isFrameworkCoordinatorActionHook,
  isFrameworkTrackerHook,
  shouldIgnoreConceptualDuplicateFinding
} from '../../../../src/shared/compiler/duplicate-signal-policy/detectors/core-policy.js';

describe('duplicate-signal policy - framework coordinator hooks', () => {
  it('treats MCP tool performAction hooks as intentional framework contracts', () => {
    expect(isFrameworkCoordinatorActionHook(
      'src/layer-c-memory/mcp/tools/validate-imports.js',
      'performAction',
      'process:logic:core:perform_action'
    )).toBe(true);

    expect(shouldIgnoreConceptualDuplicateFinding(
      'src/layer-c-memory/mcp/tools/validate-imports.js',
      'performAction',
      'process:logic:core:perform_action'
    )).toBe(true);
  });

  it('keeps non-framework performAction surfaces actionable', () => {
    expect(isFrameworkCoordinatorActionHook(
      'src/shared/compiler/actions/ActionEngine.js',
      'performAction',
      'process:logic:core:perform_action'
    )).toBe(false);

    expect(shouldIgnoreConceptualDuplicateFinding(
      'src/shared/compiler/actions/ActionEngine.js',
      'performAction',
      'process:logic:core:perform_action'
    )).toBe(false);
  });

  it('treats initialization rollback hooks as intentional framework contracts', () => {
    expect(shouldIgnoreConceptualDuplicateFinding(
      'src/layer-c-memory/mcp/core/initialization/steps/base-step.js',
      'rollback',
      'process:core:rollback'
    )).toBe(true);

    expect(shouldIgnoreConceptualDuplicateFinding(
      'src/layer-c-memory/mcp/core/initialization/steps/cache-init-step.js',
      'rollback',
      'process:core:rollback'
    )).toBe(true);
  });

  it('treats type-contract confidence hooks as intentional framework contracts', () => {
    expect(shouldIgnoreConceptualDuplicateFinding(
      'src/layer-a-static/extractors/metadata/type-contracts/strategies/base-strategy.js',
      'calculateConfidence',
      'calculate:logic:core:confidence'
    )).toBe(true);

    expect(shouldIgnoreConceptualDuplicateFinding(
      'src/layer-a-static/extractors/metadata/type-contracts/strategies/jsdoc-strategy.js',
      'calculateConfidence',
      'calculate:logic:core:confidence'
    )).toBe(true);
  });

  it('treats race-detector trackMolecule hooks as intentional framework contracts', () => {
    expect(isFrameworkTrackerHook(
      'src/layer-a-static/race-detector/trackers/base-tracker.js',
      'trackMolecule',
      'process:logic:core:track_molecule'
    )).toBe(true);

    expect(shouldIgnoreConceptualDuplicateFinding(
      'src/layer-a-static/race-detector/trackers/singleton-tracker.js',
      'trackMolecule',
      'process:logic:core:track_molecule'
    )).toBe(true);
  });

  it('keeps non-framework rollback and confidence surfaces actionable', () => {
    expect(shouldIgnoreConceptualDuplicateFinding(
      'src/shared/compiler/actions/ActionEngine.js',
      'rollback',
      'process:core:rollback'
    )).toBe(false);

    expect(shouldIgnoreConceptualDuplicateFinding(
      'src/shared/compiler/metrics/confidence-helper.js',
      'calculateConfidence',
      'calculate:logic:core:confidence'
    )).toBe(false);
  });

  it('keeps non-framework trackMolecule surfaces actionable', () => {
    expect(isFrameworkTrackerHook(
      'src/shared/compiler/custom-tracker.js',
      'trackMolecule',
      'process:logic:core:track_molecule'
    )).toBe(false);

    expect(shouldIgnoreConceptualDuplicateFinding(
      'src/shared/compiler/custom-tracker.js',
      'trackMolecule',
      'process:logic:core:track_molecule'
    )).toBe(false);
  });
});
