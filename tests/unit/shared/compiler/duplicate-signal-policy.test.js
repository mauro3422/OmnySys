import { describe, it, expect } from 'vitest';
import {
  isFrameworkCoordinatorActionHook,
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
});
