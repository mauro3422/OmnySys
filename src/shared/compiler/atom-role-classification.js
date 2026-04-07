/**
 * @fileoverview Canonical role classification for atoms and runtime files.
 *
 * Helps the compiler explain whether a symbol behaves like an orchestrator,
 * builder, adapter, bridge, policy or transformer so downstream diagnostics can lower
 * confidence for coordinator-heavy classes and distinguish business logic from
 * plumbing.
 *
 * @module shared/compiler/atom-role-classification
 */

function clampConfidence(value) {
  return Math.max(0, Math.min(1, Number(value || 0)));
}

function getCalls(atom = {}) {
  return Array.isArray(atom.calls) ? atom.calls : [];
}

function getAtomArchetype(atom = {}) {
  return String(atom.archetype || atom.archetype_type || '').toLowerCase();
}

function getPurpose(atom = {}) {
  return String(atom.purpose || atom.purpose_type || '').toLowerCase();
}

function collectRoleSignals(atom = {}, filePath = '') {
  const normalizedPath = String(filePath || atom.filePath || atom.file_path || '').replace(/\\/g, '/').toLowerCase();
  const normalizedName = String(atom.name || '').toLowerCase();
  const calls = getCalls(atom);
  const archetype = getAtomArchetype(atom);
  const purpose = getPurpose(atom);
  const callNames = calls.map((call) => String(call?.name || '').toLowerCase());

  return {
    normalizedPath,
    normalizedName,
    calls,
    archetype,
    purpose,
    callNames,
    hasNetworkCalls: Boolean(atom.hasNetworkCalls || atom.has_network_calls),
    sharedStateAccessCount: Array.isArray(atom.sharedStateAccess) ? atom.sharedStateAccess.length : 0
  };
}

/**
 * Role matchers — each returns { role, confidence, reason } or null.
 * Evaluated in priority order; first match wins.
 * This replaces the original 12-branch if/else chain (CC 39 → CC 1).
 */
const ROLE_MATCHERS = [
  {
    test: (s) =>
      /mcp-stdio-bridge|mcp-http-proxy|mcp-http-server|bridge/.test(s.normalizedPath) ||
      s.normalizedName.includes('bridge'),
    role: 'bridge',
    confidence: 0.95,
    reason: 'runtime_bridge_path'
  },
  {
    test: (s) =>
      /watcher|orchestrator|manager|session-manager|phase2-indexer/.test(s.normalizedPath) ||
      /orchestrator|manager|registry/.test(s.archetype) ||
      /orchestrator|manager|registry/.test(s.normalizedName),
    role: 'orchestrator',
    confidence: 0.9,
    reason: 'coordination_runtime_path'
  },
  {
    test: (s) =>
      /policy|conformance|diagnostics|compiler/.test(s.normalizedPath) ||
      /policy|conformance/.test(s.normalizedName),
    role: 'policy',
    confidence: 0.88,
    reason: 'compiler_policy_path'
  },
  {
    test: (s) =>
      /resolver/.test(s.normalizedPath) ||
      /resolver/.test(s.archetype) ||
      /resolve/.test(s.normalizedName),
    role: 'resolver',
    confidence: 0.84,
    reason: 'resolver_structure_path'
  },
  {
    test: (s) =>
      /builder/.test(s.normalizedPath) ||
      /builder/.test(s.archetype) ||
      /builder/.test(s.normalizedName),
    role: 'builder',
    confidence: 0.84,
    reason: 'builder_structure_path'
  },
  {
    test: (s) =>
      /(verification|validation)\/.*validator/.test(s.normalizedPath) ||
      /\/validators?\//.test(s.normalizedPath) ||
      /validator/.test(s.normalizedName) ||
      /validator/.test(s.archetype),
    role: 'analyzer',
    confidence: 0.86,
    reason: 'validator_analysis_path'
  },
  {
    test: (s) =>
      /(^|\/)analyses?\//.test(s.normalizedPath) ||
      /analyzer/.test(s.normalizedPath) ||
      /analyzer/.test(s.archetype) ||
      /analy(z|s)e|analysis/.test(s.normalizedName),
    role: 'analyzer',
    confidence: 0.84,
    reason: 'analysis_structure_path'
  },
  {
    test: (s) =>
      /storage|repository|sqlite|cache/.test(s.normalizedPath) ||
      /storage|repository|cache/.test(s.purpose),
    role: 'storage',
    confidence: 0.9,
    reason: 'storage_boundary_path'
  },
  {
    test: (s) =>
      s.hasNetworkCalls ||
      /adapter|proxy|handler/.test(s.archetype) ||
      s.callNames.some((name) => /fetch|axios|request|send|listen/.test(name)),
    role: 'adapter',
    confidence: 0.8,
    reason: 'io_boundary_detected'
  },
  {
    test: (s) =>
      /transformer|mapper|converter/.test(s.archetype) ||
      /transform|normalize|convert|map/.test(s.normalizedName),
    role: 'transformer',
    confidence: 0.82,
    reason: 'transformation_naming'
  },
  {
    test: (s) =>
      /logger/.test(s.normalizedPath) ||
      /Logger$/.test(s.normalizedName),
    role: 'wrapper',
    confidence: 0.88,
    reason: 'logger_delegation_wrapper'
  },
  {
    test: (s) =>
      /Operation$/.test(s.normalizedName) && s.purpose === 'api_export',
    role: 'wrapper',
    confidence: 0.85,
    reason: 'operation_delegation_wrapper'
  }
];

const DEFAULT_ROLE = { role: 'standard', confidence: 0.45, reasons: [] };

function classifyRoleFromSignals(signals) {
  const matched = ROLE_MATCHERS.find((m) => m.test(signals));
  if (!matched) {
    const reasons = [...DEFAULT_ROLE.reasons];
    let confidence = DEFAULT_ROLE.confidence;
    if (signals.sharedStateAccessCount > 0) {
      reasons.push('shared_state_access');
      confidence = Math.max(confidence, 0.78);
    }
    return { role: DEFAULT_ROLE.role, confidence: clampConfidence(confidence), reasons };
  }

  const reasons = [matched.reason];
  let confidence = matched.confidence;

  if (signals.sharedStateAccessCount > 0) {
    reasons.push('shared_state_access');
    confidence = Math.max(confidence, 0.78);
  }

  return {
    role: matched.role,
    confidence: clampConfidence(confidence),
    reasons
  };
}

export function classifyAtomOperationalRole(atom = {}, options = {}) {
  const signals = collectRoleSignals(atom, options.filePath);
  return classifyRoleFromSignals(signals);
}

export function classifyFileOperationalRole(filePath = '') {
  const signals = collectRoleSignals({}, filePath);
  return classifyRoleFromSignals(signals);
}
