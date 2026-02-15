/**
 * @fileoverview Root Infrastructure Test Factory - Helpers
 */

export function createMockScannerOutput(filePaths = []) {
  return filePaths.map(p => p.replace(/\\/g, '/'));
}

export function createMockResolverResult(resolved, type = 'local', reason = '') {
  return {
    resolved: resolved ? resolved.replace(/\\/g, '/') : null,
    type,
    reason
  };
}

export function createMockPipelineContext(overrides = {}) {
  return {
    projectRoot: '/test-project',
    files: [],
    parsedFiles: {},
    resolvedImports: {},
    systemMap: null,
    options: {
      verbose: false,
      skipLLM: true,
      ...overrides.options
    },
    ...overrides
  };
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================


