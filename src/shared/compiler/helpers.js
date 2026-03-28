import { buildPolicyImportMap, collectManualReuseFindings } from './reuse.js';
import { collectManualDriftFindings } from './policy-conformance-drift.js';
import { collectConformanceFindings } from './policy-conformance-rules.js';

export function collectManualPolicyFindingsForCompiler(normalizedPath, source, imports) {
  return [
    ...collectManualReuseFindings(normalizedPath, source, imports),
    ...collectManualDriftFindings(normalizedPath, source)
  ];
}

export function collectConformanceFindingsForCompiler(normalizedPath, source) {
  return collectConformanceFindings(normalizedPath, source);
}

export function buildCompilerPolicyImportMap(source = '') {
  return buildPolicyImportMap(source);
}
