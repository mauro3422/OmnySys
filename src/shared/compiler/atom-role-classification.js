/**
 * @fileoverview Canonical role classification for atoms and runtime files.
 *
 * Helps the compiler explain whether a symbol behaves like an orchestrator,
 * adapter, bridge, policy or transformer so downstream diagnostics can lower
 * confidence for coordinator-heavy classes and distinguish business logic from
 * plumbing.
 *
 * @module shared/compiler/atom-role-classification
 */

function clampConfidence(value) {
  return Math.max(0, Math.min(1, Number(value || 0)));
}

function getCalls(atom = {}) {
  return Array.isArray(atom.calls)
    ? atom.calls
    : [];
}

function getArchetype(atom = {}) {
  return String(atom.archetype || atom.archetype_type || '').toLowerCase();
}

function getPurpose(atom = {}) {
  return String(atom.purpose || atom.purpose_type || '').toLowerCase();
}

function collectRoleSignals(atom = {}, filePath = '') {
  const normalizedPath = String(filePath || atom.filePath || atom.file_path || '').replace(/\\/g, '/').toLowerCase();
  const normalizedName = String(atom.name || '').toLowerCase();
  const calls = getCalls(atom);
  const archetype = getArchetype(atom);
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

function classifyRoleFromSignals(signals) {
  const reasons = [];
  let role = 'standard';
  let confidence = 0.45;

  if (
    /mcp-stdio-bridge|mcp-http-proxy|mcp-http-server|bridge/.test(signals.normalizedPath) ||
    signals.normalizedName.includes('bridge')
  ) {
    role = 'bridge';
    confidence = 0.95;
    reasons.push('runtime_bridge_path');
  } else if (
    /watcher|orchestrator|manager|session-manager|phase2-indexer/.test(signals.normalizedPath) ||
    /orchestrator|manager|registry/.test(signals.archetype) ||
    /orchestrator|manager|registry/.test(signals.normalizedName)
  ) {
    role = 'orchestrator';
    confidence = 0.9;
    reasons.push('coordination_runtime_path');
  } else if (
    /policy|conformance|diagnostics|compiler/.test(signals.normalizedPath) ||
    /policy|conformance/.test(signals.normalizedName)
  ) {
    role = 'policy';
    confidence = 0.88;
    reasons.push('compiler_policy_path');
  } else if (
    /storage|repository|sqlite|cache/.test(signals.normalizedPath) ||
    /storage|repository|cache/.test(signals.purpose)
  ) {
    role = 'storage';
    confidence = 0.9;
    reasons.push('storage_boundary_path');
  } else if (
    signals.hasNetworkCalls ||
    /adapter|proxy|handler/.test(signals.archetype) ||
    signals.callNames.some((name) => /fetch|axios|request|send|listen/.test(name))
  ) {
    role = 'adapter';
    confidence = 0.8;
    reasons.push('io_boundary_detected');
  } else if (
    /transformer|mapper|converter/.test(signals.archetype) ||
    /transform|normalize|convert|map/.test(signals.normalizedName)
  ) {
    role = 'transformer';
    confidence = 0.82;
    reasons.push('transformation_naming');
  }

  if (signals.sharedStateAccessCount > 0) {
    reasons.push('shared_state_access');
    confidence = Math.max(confidence, 0.78);
  }

  return {
    role,
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

