/**
 * @fileoverview Shared scaffold for compiler conformance source detectors.
 *
 * Keeps policy detectors focused on their heuristics while centralizing
 * path normalization, compiler-file filtering and default option handling.
 *
 * @module shared/compiler/compiler-conformance-scan
 */

import {
  normalizePath,
  shouldScanCompilerFile
} from './conformance-utils.js';

export function scanCompilerConformanceSource(filePath, source = '', options = {}, defaults = {}, evaluate) {
  const normalizedPath = normalizePath(filePath);
  if (!shouldScanCompilerFile(normalizedPath) || !source) {
    return [];
  }

  const context = {
    normalizedPath,
    source,
    severity: options.severity ?? defaults.severity ?? 'medium',
    policyArea: options.policyArea ?? defaults.policyArea ?? 'compiler_conformance',
    findings: []
  };

  evaluate?.(context);
  return context.findings;
}
