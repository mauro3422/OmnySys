import {
  collectManualPolicyFindingsForCompiler,
  collectConformanceFindingsForCompiler,
  buildCompilerPolicyImportMap
} from './helpers.js';
import { isCompilerRuntimeFile } from './file-discovery.js';

function normalizePathLocal(p) {
  return p ? p.replace(/\\/g, '/') : p;
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

  const policyImports = buildCompilerPolicyImportMap(source);
  return [
    ...collectManualPolicyFindingsForCompiler(normalizedPath, source, policyImports),
    ...collectConformanceFindingsForCompiler(normalizedPath, source)
  ];
}
