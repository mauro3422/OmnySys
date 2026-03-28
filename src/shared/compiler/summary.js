import { COMPILER_POLICY_SEVERITY } from './policy-conformance-constants.js';

export function summarizeCompilerPolicyDrift(findings = []) {
  const normalizedFindings = findings.filter(Boolean);
  const summary = {
    total: normalizedFindings.length,
    high: 0,
    medium: 0,
    byPolicyArea: {},
    byRule: {}
  };

  for (const finding of normalizedFindings) {
    if (finding?.severity === COMPILER_POLICY_SEVERITY.HIGH) summary.high += 1;
    if (finding?.severity === COMPILER_POLICY_SEVERITY.MEDIUM) summary.medium += 1;
    const policyArea = finding?.policyArea || 'unknown';
    const rule = finding?.rule || 'unknown';
    summary.byPolicyArea[policyArea] = (summary.byPolicyArea[policyArea] || 0) + 1;
    summary.byRule[rule] = (summary.byRule[rule] || 0) + 1;
  }

  return summary;
}

export function buildCompilerPolicyIssueSummary(findings = []) {
  const normalizedFindings = findings.filter(Boolean);
  const summary = summarizeCompilerPolicyDrift(normalizedFindings);
  const severity = summary.high > 0 ? COMPILER_POLICY_SEVERITY.HIGH : COMPILER_POLICY_SEVERITY.MEDIUM;
  const sampleRules = normalizedFindings.map((finding) => finding?.rule || 'unknown').slice(0, 3).join(', ');
  const reuseGuidance = normalizedFindings
    .map((finding) => finding.reuseGuidance)
    .filter(Boolean);

  return {
    severity,
    summary,
    sampleRules,
    reuseGuidance,
    message: `${summary.total} compiler policy drift finding(s): ${sampleRules || 'unspecified'}`.trim()
  };
}
