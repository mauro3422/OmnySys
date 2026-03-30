import { collectManualReuseFindings } from './reuse-findings.js';
import { collectConformanceFindings } from './policy-conformance-rules.js';
import { buildPolicyImportMap } from './reuse.js';
import { isCompilerRuntimeFile } from './file-discovery.js';

function normalizePathLocal(p) {
  return p ? p.replace(/\\/g, '/') : p;
}

function collectManualPolicyFindingsForCompiler(normalizedPath, source, imports) {
  return collectManualReuseFindings(normalizedPath, source, imports);
}

export function detectCompilerPolicyDriftFromSource(filePath, source = '') {
  const normalizedPath = normalizePathLocal(filePath);

  if (!isCompilerRuntimeFile(normalizedPath) || !source) {
    return [];
  }

  if (
    normalizedPath.endsWith('/guard-standards.js') ||
    normalizedPath.endsWith('/shared-state-guard.js') ||
    normalizedPath.endsWith('/shared-state/guard.js') ||
    normalizedPath.endsWith('/duplicate-conceptual-core.js')
  ) {
    return [];
  }

  const policyImports = buildPolicyImportMap(source);
  return [
    ...collectManualPolicyFindingsForCompiler(normalizedPath, source, policyImports),
    ...collectConformanceFindings(normalizedPath, source)
  ];
}
