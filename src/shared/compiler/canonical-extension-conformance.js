/**
 * @fileoverview Canonical extension conformance heuristics.
 *
 * Detects when runtime modules bypass the shared compiler barrel or create
 * private helper access patterns that should extend the canonical API surface.
 *
 * @module shared/compiler/canonical-extension-conformance
 */

import {
  COMPILER_TARGET_DIRS,
  isCompilerRuntimeFile
} from './file-discovery.js';

import {
  normalizePath,
  shouldScanCompilerFile,
  createPositionalFinding as createFinding
} from './conformance-utils.js';

function usesPrivateCompilerHelperImport(source = '') {
  return /from\s+['"][^'"]*shared\/compiler\/(?!index\.js)[^'"]+['"]/.test(source);
}

function definesCanonicalStyleHelper(source = '') {
  return /\b(?:export\s+)?(?:async\s+)?function\s+(build[A-Z]\w+(Plan|Report|Summary|Remediation)|summarize[A-Z]\w+|detect[A-Z]\w+Conformance)\b|\b(?:const|let|var)\s+(build[A-Z]\w+(Plan|Report|Summary|Remediation)|summarize[A-Z]\w+|detect[A-Z]\w+Conformance)\s*=\s*(?:async\s*)?(?:\(|[A-Za-z_$])/.test(source);
}

function importsSharedCompilerBarrel(source = '') {
  return /from\s+['"][^'"]*shared\/compiler\/index\.js['"]/.test(source);
}

export function detectCanonicalExtensionConformanceFromSource(filePath, source = '', options = {}) {
  const {
    severity = 'medium',
    policyArea = 'canonical_extension'
  } = options;

  const normalizedPath = normalizePath(filePath);
  if (!shouldScanCompilerFile(normalizedPath) || !source) {
    return [];
  }

  const findings = [];

  if (usesPrivateCompilerHelperImport(source)) {
    findings.push(createFinding(
      'private_compiler_helper_import',
      severity,
      policyArea,
      'Module imports shared/compiler private helpers directly',
      'Import compiler policies through shared/compiler/index.js so future APIs extend one canonical surface.'
    ));
  }

  if (
    !normalizedPath.startsWith('src/shared/compiler/') &&
    definesCanonicalStyleHelper(source) &&
    !importsSharedCompilerBarrel(source)
  ) {
    findings.push(createFinding(
      'local_canonical_helper_without_barrel',
      severity,
      policyArea,
      'Module defines canonical-style helper logic without consuming the shared compiler barrel',
      'Promote the helper into shared/compiler or consume the existing barrel before growing another parallel canonical surface.'
    ));
  }

  return findings;
}
