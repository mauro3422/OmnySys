function hasAtomNameMatch(fileData, predicate) {
  const atoms = fileData?.atoms || [];
  return atoms.some((atom) => {
    const name = (atom.name || '').toLowerCase();
    const code = (atom.code || '').toLowerCase();
    return predicate(atom, name, code);
  });
}

export function findFilePath(files = {}, predicate) {
  return Object.keys(files).find(predicate) || null;
}

export function hasPostPhase2Hook(fileData) {
  return hasAtomNameMatch(fileData, (atom, name, code) => {
    const hasCompleteHook = name.includes('stop') && name.includes('complete');
    const hasPostCompletionTask = code.includes('post') &&
      code.includes('phase2') &&
      code.includes('completion');
    return hasCompleteHook || hasPostCompletionTask;
  });
}

export function findGuardsWithPersistence(files = {}) {
  return Object.entries(files)
    .filter(([path]) => path.includes('guard'))
    .filter(([, fileData]) => hasAtomNameMatch(fileData, (atom, name) =>
      name.includes('persist') || name.includes('watcherissue')
    ))
    .map(([path]) => path);
}

export function hasDebtReportGeneration(files = {}) {
  const debtPaths = Object.keys(files).filter((path) =>
    path.includes('debt') || path.includes('deuda')
  );

  return debtPaths.some((path) => hasAtomNameMatch(files[path], (atom, name) =>
    name.includes('report') || name.includes('consolidate')
  ));
}

export function scoreOrchestrationGapFindings(findings = []) {
  if (!findings || findings.length === 0) return 100;

  const highCount = findings.filter((finding) => finding.severity === 'high').length;
  const mediumCount = findings.filter((finding) => finding.severity === 'medium').length;
  return Math.max(0, 100 - (highCount * 20) - (mediumCount * 10));
}

export function summarizeOrchestrationGapFindings(findings = []) {
  return {
    missingPostPhase2Hook: findings.filter((finding) => finding.type === 'missing-post-phase2-consolidation').length,
    missingDebtConsolidationTool: findings.filter((finding) => finding.type === 'missing-debt-consolidation-tool').length,
    guardsNotPersisting: findings.filter((finding) => finding.type === 'guards-not-persisting-findings').length,
    missingAutomaticDebtReport: findings.filter((finding) => finding.type === 'missing-automatic-debt-report').length,
    totalFindings: findings.length
  };
}

export default {
  findFilePath,
  findGuardsWithPersistence,
  hasDebtReportGeneration,
  hasPostPhase2Hook,
  scoreOrchestrationGapFindings,
  summarizeOrchestrationGapFindings
};
