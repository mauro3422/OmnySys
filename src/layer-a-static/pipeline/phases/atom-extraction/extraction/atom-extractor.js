/**
 * @fileoverview atom-extractor.js
 *
 * Atom extraction logic for individual and batch atom processing
 *
 * @module pipeline/phases/atom-extraction/extraction/atom-extractor
 */

import { extractFunctionCode } from '#shared/utils/ast-utils.js';
import { calculateComplexity } from '../metadata/complexity.js';
import { detectAtomArchetype } from '../metadata/archetype.js';
import { detectAtomPurpose } from '../metadata/purpose.js';
import { buildAtomMetadata } from '../builders/metadata-builder.js';
import { enrichWithDNA } from '../builders/enrichment.js';
import { buildVariableAtom } from './atom-extractor/variable-atom-builder.js';
import { runAtomExtractors } from './atom-extractor/extractor-runner.js';
import { extractDataFlowSafe } from './atom-extractor/data-flow-helper.js';

import { semanticAnalyzer } from '#core/analysis/semantic-analyzer/index.js';

/**
 * Extract metadata for all atoms from file info
 * @param {Object} fileInfo - Parsed file info with functions
 * @param {string} code - Source code
 * @param {Object} fileMetadata - File-level metadata
 * @param {string} filePath - File path
 * @param {string} extractionDepth - Depth of extraction: 'structural' or 'deep'
 * @returns {Promise<Array>} - Array of atom metadata
 */
export async function extractAtoms(fileInfo, code, fileMetadata, filePath, extractionDepth = 'deep') {
  const atoms = [];

  const fileImports = fileInfo.imports || [];

  const functionAtoms = await Promise.all(
    (fileInfo.functions || []).map(async (functionInfo) => {
      const functionCode = extractFunctionCode(code, functionInfo);
      return extractAtomMetadata(functionInfo, functionCode, fileMetadata, filePath, fileImports, code, extractionDepth);
    })
  );
  atoms.push(...functionAtoms);


  const constantAtoms = (fileInfo.constantExports || []).map(constInfo => {
    return buildVariableAtom(constInfo, filePath, 'constant', fileImports, extractionDepth);
  });
  atoms.push(...constantAtoms);

  const objectAtoms = (fileInfo.objectExports || []).map(objInfo => {
    return buildVariableAtom(objInfo, filePath, 'config', fileImports, extractionDepth);
  });
  atoms.push(...objectAtoms);

  // Propagate SQL queries extracted by the tree-sitter-sql injection pass
  // Also resolve parent JS atom by line-range containment (in memory, no DB needed)
  const sqlAtoms = (fileInfo.definitions || []).filter(def => def.type === 'sql_query');
  for (const sqlAtom of sqlAtoms) {
    const sqlLine = sqlAtom.lineStart || (sqlAtom._meta && sqlAtom._meta.line_start) || 0;
    if (sqlLine > 0) {
      // Find the smallest enclosing function atom
      let bestParent = null;
      let bestSize = Infinity;
      for (const candidate of atoms) {
        if (candidate.type === 'sql_query') continue;
        const cStart = candidate.line || candidate.lineStart || 0;
        const cEnd = candidate.endLine || candidate.lineEnd || 0;
        if (cStart <= sqlLine && cEnd >= sqlLine) {
          const size = cEnd - cStart;
          if (size < bestSize) { bestSize = size; bestParent = candidate; }
        }
      }
      if (bestParent && sqlAtom._meta) {
        sqlAtom._meta.parent_atom_id = bestParent.id || null;
        sqlAtom._meta.parent_atom_name = bestParent.name || null;
      }
    }
  }
  atoms.push(...sqlAtoms);

  return atoms;
}

/**
 * Extract metadata for a single atom
 * @param {Object} functionInfo - Function info from parser
 * @param {string} functionCode - Extracted function source code
 * @param {Object} fileMetadata - File-level metadata
 * @param {string} filePath - File path
 * @param {string} filePath - File path
 * @param {Array} imports - File-level imports
 * @param {string} fullFileCode - Full file source code
 * @param {string} extractionDepth - 'structural' or 'deep'
 * @returns {Promise<Object>} - Atom metadata
 */
export async function extractAtomMetadata(functionInfo, functionCode, fileMetadata, filePath, imports = [], fullFileCode = null, extractionDepth = 'deep') {
  const isStructural = extractionDepth === 'structural';

  // Phase 1: Skip deep extractors if structural scan
  const extractorResults = isStructural ? {} : await runAtomExtractors({
    functionCode,
    functionInfo,
    fileMetadata,
    filePath,
    fullFileCode: fullFileCode || functionCode // Fallback to function code if full code not provided
  });

  // Phase 1: Data flow is a heavy AST walk, skip if structural
  const dataFlowV2 = isStructural ? null : extractDataFlowSafe(functionInfo, functionCode, filePath);

  const complexity = calculateComplexity(functionCode);
  const linesOfCode = functionCode.split('\n').length;

  const atomMetadata = buildAtomMetadata({
    functionInfo,
    filePath,
    linesOfCode,
    complexity,
    dataFlowV2,
    functionCode,
    imports,
    performanceHints: extractorResults.performanceHints,
    performanceMetrics: extractorResults.performanceMetrics,
    ...extractorResults
  });

  // Flag phase 2 tracking
  atomMetadata.isPhase2Complete = !isStructural;

  if (!isStructural) {
    // Phase 2: Integrated Core Semantic Analysis
    atomMetadata.semantic = semanticAnalyzer.analyzeAtom(atomMetadata, functionCode);
  } else {
    atomMetadata.semantic = {};
  }

  enrichWithDNA(atomMetadata, functionInfo.name);

  atomMetadata.archetype = detectAtomArchetype(atomMetadata);

  const purposeInfo = detectAtomPurpose(atomMetadata, filePath);
  atomMetadata.purpose = purposeInfo.purpose;
  atomMetadata.purposeReason = purposeInfo.purposeReason;
  atomMetadata.purposeConfidence = purposeInfo.purposeConfidence;
  atomMetadata.isDeadCode = purposeInfo.isDeadCode;

  return atomMetadata;
}

export default { extractAtoms, extractAtomMetadata };
