/**
 * @fileoverview Canonical extension conformance heuristics.
 *
 * Detects when runtime modules bypass the shared compiler barrel or create
 * private helper access patterns that should extend the canonical API surface.
 *
 * @module shared/compiler/canonical-extension-conformance
 */

import {
  createPositionalFinding as createFinding
} from './conformance-utils.js';
import { scanCompilerConformanceSource } from './compiler-conformance-scan.js';

function usesPrivateCompilerHelperImport(source = '') {
  return /from\s+['"][^'"]*shared\/compiler\/(?!index\.js)[^'"]+['"]/.test(source);
}

function definesCanonicalStyleHelper(source = '') {
  return /\b(?:export\s+)?(?:async\s+)?function\s+(build[A-Z]\w+(Plan|Report|Summary|Remediation)|summarize[A-Z]\w+|detect[A-Z]\w+Conformance)\b|\b(?:const|let|var)\s+(build[A-Z]\w+(Plan|Report|Summary|Remediation)|summarize[A-Z]\w+|detect[A-Z]\w+Conformance)\s*=\s*(?:async\s*)?(?:\(|[A-Za-z_$])/.test(source);
}

function importsSharedCompilerBarrel(source = '') {
  return /from\s+['"][^'"]*shared\/compiler\/index\.js['"]/.test(source);
}

function extractsCanonicalImportNames(source = '') {
  const matches = Array.from(source.matchAll(
    /(?:^|\n)\s*import\s*\{([^}]*)\}\s*from\s+['"][^'"]*shared\/compiler\/index\.js['"]/g
  ));

  if (matches.length === 0) {
    return [];
  }

  return matches.flatMap((match) => match[1]
    .split(',')
    .map((name) => name.trim().replace(/\s+as\s+\w+$/i, ''))
    .filter(Boolean)
  );
}

function definesLocalCanonicalWrapper(source = '') {
  const importedNames = extractsCanonicalImportNames(source);
  if (importedNames.length === 0) {
    return false;
  }

  return importedNames.some((importedName) => {
    const escapedName = importedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wrapperRegex = new RegExp(
      String.raw`\b(?:export\s+)?(?:async\s+)?function\s+(?!${escapedName}\b)[A-Za-z_$]\w*\s*\([^)]*\)\s*\{[\s\S]{0,240}?\breturn\s+${escapedName}\([^)]*\)\s*;?\s*\}`,
      'm'
    );
    const constWrapperRegex = new RegExp(
      String.raw`\b(?:const|let|var)\s+(?!${escapedName}\b)[A-Za-z_$]\w*\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*(?:\{\s*return\s+${escapedName}\([^)]*\)\s*;?\s*\}|${escapedName}\([^)]*\)\s*;?)`,
      'm'
    );

    return wrapperRegex.test(source) || constWrapperRegex.test(source);
  });
}

export function detectCanonicalExtensionConformanceFromSource(filePath, source = '', options = {}) {
  return scanCompilerConformanceSource(
    filePath,
    source,
    options,
    { severity: 'medium', policyArea: 'canonical_extension' },
    ({ normalizedPath, source: currentSource, severity, policyArea, findings }) => {
      if (usesPrivateCompilerHelperImport(currentSource)) {
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
        definesCanonicalStyleHelper(currentSource) &&
        !importsSharedCompilerBarrel(currentSource)
      ) {
        findings.push(createFinding(
          'local_canonical_helper_without_barrel',
          severity,
          policyArea,
          'Module defines canonical-style helper logic without consuming the shared compiler barrel',
          'Promote the helper into shared/compiler or consume the existing barrel before growing another parallel canonical surface.'
        ));
      }

      if (
        !normalizedPath.startsWith('src/shared/compiler/') &&
        importsSharedCompilerBarrel(currentSource) &&
        definesLocalCanonicalWrapper(currentSource)
      ) {
        findings.push(createFinding(
          'local_canonical_wrapper',
          severity,
          policyArea,
          'Module defines a local wrapper around a canonical shared/compiler API',
          'Call the canonical entrypoint directly, or promote the wrapper into shared/compiler only if multiple callers need a new stable contract.'
        ));
      }
    }
  );
}
